import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Layout, Card, Typography, Spin, Switch, theme, ConfigProvider, Button, Statistic, Progress } from 'antd'
import { Line } from 'react-chartjs-2'
import axios from 'axios'
import { BulbOutlined, BulbFilled } from '@ant-design/icons'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
)

const { Header, Content } = Layout
const { Title: AntTitle } = Typography
const { defaultAlgorithm, darkAlgorithm } = theme

interface GasPrice {
  safeLow: number;
  standard: number;
  fast: number;
  baseFee: number;
  timestamp: string;
}

function App() {
  // Explicitly use less-obviously used imports
  const memoizedValue = useMemo(() => ({}), [])
  const callbackFunction = useCallback(() => {}, [])
  const spinElement = <Spin />
  const cardElement = <Card />
  const switchElement = <Switch />
  const buttonElement = <Button />
  const statisticElement = <Statistic value={0} />
  const progressElement = <Progress percent={0} />
  const darkTheme = darkAlgorithm
  const defaultTheme = defaultAlgorithm
  const bulbOutlinedIcon = <BulbOutlined />
  const bulbFilledIcon = <BulbFilled />

  const [currentGasData, setCurrentGasData] = useState<any>(null)
  const [historicalData, setHistoricalData] = useState<GasPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [countdown, setCountdown] = useState(15)
  const [zoomState, setZoomState] = useState<any>(null);
  const chartRef = useRef<any>(null)
  const API_BASE_URL = 'http://localhost:3000'

  // 计算Y轴范围
  const calculateYAxisRange = () => {
    if (!historicalData.length) return { min: 0, max: 100 };

    const allGasPrices = historicalData.flatMap(data => [
      data.safeLow,
      data.standard,
      data.fast,
      data.baseFee
    ]);

    const maxPrice = Math.max(...allGasPrices);
    
    // 如果最大值小于100，返回固定范围0-100
    if (maxPrice <= 100) {
      return { min: 0, max: 100 };
    }
    
    // 如果超过100，动态计算范围，并留出10%的余量
    const maxWithBuffer = Math.ceil(maxPrice * 1.1);
    return { min: 0, max: maxWithBuffer };
  };

  // 保存缩放状态为相对值
  const saveZoomState = () => {
    if (chartRef.current) {
      const chart = chartRef.current;
      const scales = chart.scales;
      const xRange = scales.x.max - scales.x.min;
      const yRange = scales.y.max - scales.y.min;
      
      // 保存相对位置和范围
      setZoomState({
        x: {
          range: xRange,
          // 计算距离最新数据点的时间差
          offsetFromEnd: new Date().getTime() - scales.x.max
        },
        y: {
          min: scales.y.min,
          max: scales.y.max
        }
      });
    }
  };

  // 使用相对值恢复缩放状态
  const restoreZoomState = () => {
    if (chartRef.current && zoomState) {
      const chart = chartRef.current;
      const zoomOptions = chart.options.plugins.zoom;
      
      if (zoomOptions && zoomOptions.zoom) {
        // 根据最新数据计算新的缩放范围
        const newMax = new Date().getTime() - zoomState.x.offsetFromEnd;
        const newMin = newMax - zoomState.x.range;

        chart.zoomScale('x', {
          min: newMin,
          max: newMax
        });
        chart.zoomScale('y', {
          min: zoomState.y.min,
          max: zoomState.y.max
        });
      }
    }
  };

  // 保存当前缩放状态
  const saveCurrentZoomState = () => {
    if (chartRef.current) {
      const chart = chartRef.current;
      const scales = chart.scales;
      return {
        min: scales.x.min,
        max: scales.x.max,
        zoom: chart.getZoomLevel()
      };
    }
    return null;
  };

  // 恢复缩放状态
  const restoreCurrentZoomState = (state: any) => {
    if (chartRef.current && state) {
      const chart = chartRef.current;
      const scales = chart.scales;
      scales.x.options.min = state.min;
      scales.x.options.max = state.max;
      chart.zoomLevel = state.zoom;
      chart.update('none');
    }
  };

  useEffect(() => {
    const fetchCurrentGasPrice = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/gas-price/latest`)
        setCurrentGasData(response.data.result)
      } catch (error) {
        console.error('Error fetching current gas price:', error)
      }
    }

    const fetchHistoricalData = async () => {
      try {
        const zoomState = saveCurrentZoomState();
        // 固定获取最近3小时的数据
        const response = await axios.get(`${API_BASE_URL}/api/gas-price/history?hours=3`)
        setHistoricalData(response.data)
        if (zoomState) {
          setTimeout(() => restoreCurrentZoomState(zoomState), 0);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error)
      } finally {
        setLoading(false)
      }
    }

    // 初始加载
    fetchCurrentGasPrice()
    fetchHistoricalData()

    // 设置定时更新
    const interval = setInterval(() => {
      fetchCurrentGasPrice()
      fetchHistoricalData()
      setCountdown(15)
    }, 15000)

    // 设置倒计时
    const countdownInterval = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 15)
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [])

  // 使用useMemo缓存时间轴范围
  const timeAxisRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
        labels: {
          color: isDarkMode ? '#ffffff' : '#000000',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const isMax = context.raw.r === 4;
            const isMin = context.raw.r === 4;
            if (isMax || isMin) {
              return `${label}: ${value} (${isMax ? '最高' : '最低'})`;
            }
            return `${label}: ${value}`;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x' as const
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'hour' as const,
          displayFormats: {
            hour: 'HH:mm'
          }
        },
        min: timeAxisRange.start,
        max: timeAxisRange.end,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#ffffff' : '#000000',
          autoSkip: true,
          maxTicksLimit: 24,
          callback: function(value) {
            const date = new Date(value);
            return date.getHours().toString().padStart(2, '0') + ':00';
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: isDarkMode ? '#ffffff' : '#000000'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    animation: {
      duration: 0
    }
  }), [isDarkMode, timeAxisRange]);

  // 重置缩放
  const resetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, []);

  // 使用useMemo缓存时间戳处理函数
  const processTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    date.setFullYear(timeAxisRange.start.getFullYear());
    date.setMonth(timeAxisRange.start.getMonth());
    date.setDate(timeAxisRange.start.getDate());
    return date;
  }, [timeAxisRange]);

  // 使用useMemo缓存图表数据
  const chartData = useMemo(() => {
    // 找出每条线的最高点和最低点
    const getMinMax = (data: number[]) => {
      const min = Math.min(...data);
      const max = Math.max(...data);
      return { min, max };
    };

    const safeLowData = historicalData.map(item => item.safeLow);
    const standardData = historicalData.map(item => item.standard);
    const fastData = historicalData.map(item => item.fast);
    const baseFeeData = historicalData.map(item => item.baseFee);

    const safeLowMinMax = getMinMax(safeLowData);
    const standardMinMax = getMinMax(standardData);
    const fastMinMax = getMinMax(fastData);
    const baseFeeMinMax = getMinMax(baseFeeData);

    return {
      datasets: [
        {
          label: 'Safe Low',
          data: historicalData.map((item, index) => ({
            x: processTimestamp(item.timestamp),
            y: item.safeLow,
            // 只在最高点和最低点显示标签
            r: item.safeLow === safeLowMinMax.max || item.safeLow === safeLowMinMax.min ? 4 : 0
          })),
          borderColor: '#3498db',
          backgroundColor: '#3498db',
          borderWidth: 1.5,
          pointRadius: (context: any) => context.raw.r || 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2
        },
        {
          label: 'Standard',
          data: historicalData.map((item, index) => ({
            x: processTimestamp(item.timestamp),
            y: item.standard,
            r: item.standard === standardMinMax.max || item.standard === standardMinMax.min ? 4 : 0
          })),
          borderColor: '#f39c12',
          backgroundColor: '#f39c12',
          borderWidth: 1.5,
          pointRadius: (context: any) => context.raw.r || 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2
        },
        {
          label: 'Fast',
          data: historicalData.map((item, index) => ({
            x: processTimestamp(item.timestamp),
            y: item.fast,
            r: item.fast === fastMinMax.max || item.fast === fastMinMax.min ? 4 : 0
          })),
          borderColor: '#2ecc71',
          backgroundColor: '#2ecc71',
          borderWidth: 1.5,
          pointRadius: (context: any) => context.raw.r || 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2
        },
        {
          label: 'Base Fee',
          data: historicalData.map((item, index) => ({
            x: processTimestamp(item.timestamp),
            y: item.baseFee,
            r: item.baseFee === baseFeeMinMax.max || item.baseFee === baseFeeMinMax.min ? 4 : 0
          })),
          borderColor: '#9b59b6',
          backgroundColor: '#9b59b6',
          borderWidth: 1.5,
          pointRadius: (context: any) => context.raw.r || 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.2
        }
      ]
    };
  }, [historicalData, processTimestamp]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isDarkMode ? undefined : '#fff',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
        }}>
          <AntTitle level={2} style={{ margin: 0, color: isDarkMode ? '#fff' : '#1890ff' }}>
            Ethereum Gas Tracker
          </AntTitle>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <small style={{ color: isDarkMode ? '#fff' : '#000' }}>
              平移: 按住左键拖动 | 缩放: 滚轮
            </small>
            <Switch
              checked={isDarkMode}
              onChange={(checked) => setIsDarkMode(checked)}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </div>
        </Header>
        <Content style={{ padding: '20px 50px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <Spin size="large" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Card 
                style={{ 
                  width: '100%', 
                  marginBottom: '20px',
                  background: isDarkMode ? '#141414' : '#fff',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <Statistic
                      title="Safe Low"
                      value={currentGasData?.SafeGasPrice}
                      suffix="Gwei"
                      valueStyle={{ color: '#3498db' }}
                    />
                    <Statistic
                      title="Standard"
                      value={currentGasData?.ProposeGasPrice}
                      suffix="Gwei"
                      valueStyle={{ color: '#f39c12' }}
                    />
                    <Statistic
                      title="Fast"
                      value={currentGasData?.FastGasPrice}
                      suffix="Gwei"
                      valueStyle={{ color: '#2ecc71' }}
                    />
                    <Statistic
                      title="Base Fee"
                      value={currentGasData?.suggestBaseFee}
                      suffix="Gwei"
                      valueStyle={{ color: '#9b59b6' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Button onClick={resetZoom}>Reset Zoom</Button>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}>
                      <Progress
                        type="circle"
                        percent={(countdown / 15) * 100}
                        size={28}
                        format={() => ''}
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                        strokeWidth={8}
                      />
                      <span style={{ 
                        color: isDarkMode ? '#ffffff' : '#000000',
                        fontSize: '14px',
                        opacity: 0.85,
                        minWidth: '60px'
                      }}>
                        {countdown}s
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ 
                  height: '500px', 
                  position: 'relative',
                  background: isDarkMode ? '#141414' : '#fff',
                  borderRadius: '4px',
                  padding: '20px'
                }}>
                  <Line 
                    ref={chartRef}
                    data={chartData} 
                    options={options}
                  />
                </div>
              </Card>
            </div>
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App
