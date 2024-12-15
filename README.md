# Crypto Exchange Dashboard

A real-time dashboard that aggregates cryptocurrency balances from multiple exchanges (Binance, Bybit, and OKX) into a single view.

## Features

- Real-time balance tracking across multiple exchanges
- Support for Binance, Bybit, and OKX
- Secure API key management
- Total portfolio value calculation
- Detailed balance breakdown per exchange
- Clean and modern UI using Chakra UI

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/crypto-dashboard.git
cd crypto-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Usage

1. Click "Set API Credentials" for each exchange
2. Enter your API Key and Secret (and Passphrase for OKX)
3. Click "Refresh Balances" to fetch your current balances

Note: Make sure to use read-only API keys for security purposes.

## Security

- API credentials are stored in memory only
- No data is persisted to disk or external services
- Uses secure API signing for all exchange communications

## Technologies

- React
- TypeScript
- Chakra UI
- Axios for API calls
- Crypto-js for API signing

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
