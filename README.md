# Ethereum Gas Tracker

A real-time Ethereum gas price monitoring application that helps users track and visualize gas prices on the Ethereum network.

## Features

- Real-time gas price monitoring
- Historical gas price data visualization
- Interactive chart with zoom functionality
- Dark/Light mode support
- Automatic data refresh
- Multiple price categories (Safe Low, Standard, Fast, Base Fee)

## Project Structure

```text
ethereum_gas/
├── frontend/           # React TypeScript frontend
├── backend/           # Node.js backend
├── .gitignore        # Git ignore file
└── README.md         # Project documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ethereum_gas
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd frontend
npm install
```

4. Create a `.env` file in the root directory and add necessary environment variables:

```env
PORT=3000
# Add other environment variables as needed
```

## Running the Application

1. Start the backend server:

```bash
cd backend
npm start
```

2. Start the frontend development server:

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173` (or the port specified in your frontend configuration).

## Technologies Used

### Frontend

- React
- TypeScript
- Ant Design (UI Components)
- Chart.js
- Axios

### Backend

- Node.js
- Express
- SQLite
- Axios (for external API calls)

## Features in Detail

- **Real-time Gas Tracking**: Monitors current Ethereum gas prices
- **Historical Data**: Displays historical gas price trends
- **Interactive Charts**: Zoom and pan functionality for detailed analysis
- **Multiple Price Categories**:
  - Safe Low: Economical but slower transactions
  - Standard: Balanced speed and cost
  - Fast: Quick transaction processing
  - Base Fee: Network's current base fee

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Ethereum Network
- Gas Price API providers
- Open source community
