const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 设置数据库
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

// 定义Gas价格模型
const GasPrice = sequelize.define('GasPrice', {
    safeLow: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    standard: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    fast: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    baseFee: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    suggestBaseFee: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

// 同步数据库
sequelize.sync({ force: true })
    .then(() => console.log('Database synchronized'))
    .catch(err => console.error('Error syncing database:', err));

// Middleware
app.use(cors());
app.use(express.json());

// 获取最新gas价格并存储
async function fetchAndStoreGasPrice() {
    try {
        const response = await axios.get(
            `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
        );
        
        if (response.data.status === '1' && response.data.result) {
            const result = response.data.result;
            const suggestBaseFee = parseFloat(result.suggestBaseFee);
            
            await GasPrice.create({
                safeLow: parseFloat(result.SafeGasPrice),
                standard: parseFloat(result.ProposeGasPrice),
                fast: parseFloat(result.FastGasPrice),
                baseFee: suggestBaseFee,
                suggestBaseFee: suggestBaseFee,
                timestamp: new Date()
            });

            console.log('Gas price data stored:', {
                time: new Date().toISOString(),
                safeLow: result.SafeGasPrice,
                standard: result.ProposeGasPrice,
                fast: result.FastGasPrice,
                baseFee: suggestBaseFee
            });
        }
    } catch (error) {
        console.error('Error fetching and storing gas price:', error);
    }
}

// Routes
// 获取最新gas价格
app.get('/api/gas-price/latest', async (req, res) => {
    try {
        const latestPrice = await GasPrice.findOne({
            order: [['timestamp', 'DESC']]
        });
        
        if (latestPrice) {
            res.json({
                status: '1',
                message: 'OK',
                result: {
                    SafeGasPrice: latestPrice.safeLow.toString(),
                    ProposeGasPrice: latestPrice.standard.toString(),
                    FastGasPrice: latestPrice.fast.toString(),
                    suggestBaseFee: latestPrice.suggestBaseFee.toString(),
                    timestamp: latestPrice.timestamp
                }
            });
        } else {
            res.status(404).json({ error: 'No gas price data available' });
        }
    } catch (error) {
        console.error('Error fetching latest gas price:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 获取历史gas价格
app.get('/api/gas-price/history', async (req, res) => {
    try {
        const hours = parseFloat(req.query.hours) || 24;
        const milliseconds = hours * 60 * 60 * 1000;
        const cutoffTime = new Date(Date.now() - milliseconds);

        const historicalPrices = await GasPrice.findAll({
            where: {
                timestamp: {
                    [Sequelize.Op.gte]: cutoffTime
                }
            },
            order: [['timestamp', 'ASC']]
        });

        console.log(`Fetching data for last ${hours} hours. Found ${historicalPrices.length} records.`);

        res.json(historicalPrices.map(price => ({
            safeLow: price.safeLow,
            standard: price.standard,
            fast: price.fast,
            baseFee: price.baseFee,
            suggestBaseFee: price.suggestBaseFee,
            timestamp: price.timestamp
        })));
    } catch (error) {
        console.error('Error fetching historical gas prices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 清除所有数据的路由
app.delete('/api/gas-price/clear', async (req, res) => {
    try {
        await GasPrice.destroy({
            where: {},
            truncate: true
        });
        res.json({ message: 'All gas price data has been cleared successfully' });
    } catch (error) {
        console.error('Error clearing gas price data:', error);
        res.status(500).json({ error: 'Failed to clear gas price data' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    
    // 立即执行一次
    fetchAndStoreGasPrice();
    
    // 每15秒执行一次
    setInterval(fetchAndStoreGasPrice, 15000);
});
