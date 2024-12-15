import axios from 'axios';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'crypto_dashboard_credentials';

class ExchangeService {
  constructor() {
    this.bybitApiKey = '';
    this.bybitApiSecret = '';
    this.binanceApiKey = '';
    this.binanceApiSecret = '';
    this.okxApiKey = '';
    this.okxApiSecret = '';
    this.okxPassphrase = '';
    this.loadCredentials();
  }

  // Load credentials from localStorage
  loadCredentials() {
    try {
      const encryptedData = localStorage.getItem(STORAGE_KEY);
      if (encryptedData) {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, window.location.hostname);
        const credentials = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

        this.bybitApiKey = credentials.bybitApiKey || '';
        this.bybitApiSecret = credentials.bybitApiSecret || '';
        this.binanceApiKey = credentials.binanceApiKey || '';
        this.binanceApiSecret = credentials.binanceApiSecret || '';
        this.okxApiKey = credentials.okxApiKey || '';
        this.okxApiSecret = credentials.okxApiSecret || '';
        this.okxPassphrase = credentials.okxPassphrase || '';
      }
    } catch (error) {
      console.warn('Failed to load credentials from localStorage:', error);
      // If there's an error loading credentials, clear them
      this.clearCredentials();
    }
  }

  // Save credentials to localStorage
  saveCredentials() {
    try {
      const credentials = {
        bybitApiKey: this.bybitApiKey,
        bybitApiSecret: this.bybitApiSecret,
        binanceApiKey: this.binanceApiKey,
        binanceApiSecret: this.binanceApiSecret,
        okxApiKey: this.okxApiKey,
        okxApiSecret: this.okxApiSecret,
        okxPassphrase: this.okxPassphrase
      };

      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(credentials),
        window.location.hostname
      ).toString();

      localStorage.setItem(STORAGE_KEY, encrypted);
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  // Clear credentials from localStorage
  clearCredentials() {
    this.bybitApiKey = '';
    this.bybitApiSecret = '';
    this.binanceApiKey = '';
    this.binanceApiSecret = '';
    this.okxApiKey = '';
    this.okxApiSecret = '';
    this.okxPassphrase = '';
    localStorage.removeItem(STORAGE_KEY);
  }

  signBybit(timestamp, params) {
    const queryString = timestamp + this.bybitApiKey + '5000' + params;
    console.log('Bybit sign string:', queryString);
    return CryptoJS.HmacSHA256(queryString, this.bybitApiSecret).toString(CryptoJS.enc.Hex);
  }

  signBinance(queryString) {
    return CryptoJS.HmacSHA256(queryString, this.binanceApiSecret)
      .toString(CryptoJS.enc.Hex);
  }

  signOKX(timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return CryptoJS.HmacSHA256(message, this.okxApiSecret)
      .toString(CryptoJS.enc.Base64);
  }

  setCredentials(exchange, apiKey, apiSecret, passphrase) {
    switch (exchange.toLowerCase()) {
      case 'bybit':
        this.bybitApiKey = apiKey;
        this.bybitApiSecret = apiSecret;
        break;
      case 'binance':
        this.binanceApiKey = apiKey;
        this.binanceApiSecret = apiSecret;
        break;
      case 'okx':
        this.okxApiKey = apiKey;
        this.okxApiSecret = apiSecret;
        if (passphrase) this.okxPassphrase = passphrase;
        break;
      default:
        console.warn('Unknown exchange:', exchange);
        return;
    }
    // Save credentials after setting them
    this.saveCredentials();
  }

  async getBybitBalance() {
    try {
      if (!this.bybitApiKey || !this.bybitApiSecret) {
        throw new Error('Bybit API credentials not set');
      }

      const timestamp = Date.now().toString();
      const path = '/asset/v3/private/transfer/account-coins/balance/query';
      const queryParams = 'accountType=FUND';
      const signature = this.signBybit(timestamp, queryParams);

      console.log('Bybit Request Details:', {
        timestamp,
        apiKey: this.bybitApiKey,
        signature,
        queryParams
      });

      const response = await axios.get(`https://api.bybit.com${path}`, {
        headers: {
          'X-BAPI-API-KEY': this.bybitApiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
          'X-BAPI-RECV-WINDOW': '5000'
        },
        params: {
          accountType: 'FUND'
        }
      });

      console.log('Bybit Response:', response.data);

      const balances = [];
      let totalUSD = 0;

      if (response.data.result && response.data.result.balance) {
        for (const coin of response.data.result.balance) {
          const walletBalance = Number(coin.walletBalance) || 0;
          const free = Number(coin.transferBalance) || walletBalance;
          const locked = walletBalance - free;

          if (walletBalance > 0) {
            balances.push({
              asset: coin.coin,
              free,
              locked,
              total: walletBalance
            });

            // For USDT and USD, use the balance as the USD value
            const usdValue = coin.coin === 'USDT' || coin.coin === 'USD'
              ? walletBalance
              : Number(coin.transferBalance) * (coin.price || 1);

            totalUSD += usdValue;
            console.log(`Adding ${coin.coin} balance: ${walletBalance}, USD value: ${usdValue}`);
          }
        }
      }

      console.log('Bybit Total USD Value:', totalUSD);

      return {
        exchange: 'Bybit',
        balances,
        totalUSD
      };
    } catch (error) {
      console.error('Error fetching Bybit balance:', error);
      return {
        exchange: 'Bybit',
        balances: [],
        totalUSD: 0,
        error: error.message
      };
    }
  }

  async getBinanceBalance() {
    try {
      if (!this.binanceApiKey || !this.binanceApiSecret) {
        throw new Error('Binance API credentials not set');
      }

      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.signBinance(queryString);

      const response = await axios.get('https://api.binance.com/api/v3/account', {
        headers: {
          'X-MBX-APIKEY': this.binanceApiKey,
        },
        params: {
          timestamp,
          signature,
        },
      });

      const balances = [];
      let totalUSD = 0;

      // Get prices for USD conversion
      const pricesResponse = await axios.get('https://api.binance.com/api/v3/ticker/price');
      const prices = new Map();
      pricesResponse.data.forEach((item) => {
        prices.set(item.symbol, Number(item.price));
      });

      if (response.data.balances) {
        for (const balance of response.data.balances) {
          const free = Number(balance.free) || 0;
          const locked = Number(balance.locked) || 0;
          const total = free + locked;

          if (total > 0) {
            let usdValue = 0;
            if (balance.asset === 'USDT' || balance.asset === 'BUSD' || balance.asset === 'USD') {
              usdValue = total;
            } else {
              const symbol = `${balance.asset}USDT`;
              const price = prices.get(symbol) || 0;
              usdValue = Number(total) * Number(price);
            }

            balances.push({
              asset: balance.asset,
              free,
              locked,
              total
            });
            totalUSD += usdValue;
          }
        }
      }

      return {
        exchange: 'Binance',
        balances,
        totalUSD
      };
    } catch (error) {
      console.error('Error fetching Binance balance:', error);
      return {
        exchange: 'Binance',
        balances: [],
        totalUSD: 0,
        error: error.message
      };
    }
  }

  async getOKXBalance() {
    try {
      if (!this.okxApiKey || !this.okxApiSecret || !this.okxPassphrase) {
        throw new Error('OKX API credentials not set');
      }

      const timestamp = new Date().toISOString();
      const method = 'GET';
      const path = '/api/v5/asset/balances';
      const signature = this.signOKX(timestamp, method, path);

      const response = await axios.get('https://www.okx.com' + path, {
        headers: {
          'OK-ACCESS-KEY': this.okxApiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.okxPassphrase,
        },
      });

      console.log('OKX Response:', response.data);

      const balances = [];
      let totalUSD = 0;

      if (response.data.data) {
        for (const balance of response.data.data) {
          const cashBal = Number(balance.bal) || 0;
          const availBal = Number(balance.availBal) || 0;

          if (cashBal > 0) {
            // For USDT and USD, use the balance as the USD value
            const usdValue = balance.ccy === 'USDT' || balance.ccy === 'USD'
              ? cashBal
              : Number(balance.usdValue) || 0;

            balances.push({
              asset: balance.ccy,
              free: availBal,
              locked: cashBal - availBal,
              total: cashBal
            });

            totalUSD += usdValue;
            console.log(`Adding ${balance.ccy} balance: ${cashBal}, USD value: ${usdValue}`);
          }
        }
      }

      console.log('Total USD Value:', totalUSD);

      return {
        exchange: 'OKX',
        balances,
        totalUSD
      };
    } catch (error) {
      console.error('Error fetching OKX balance:', error);
      return {
        exchange: 'OKX',
        balances: [],
        totalUSD: 0,
        error: error.message
      };
    }
  }

  async getAllBalances() {
    const results = await Promise.all([
      this.getBybitBalance(),
      this.getBinanceBalance(),
      this.getOKXBalance()
    ]);

    return results;
  }
}

export const exchangeService = new ExchangeService();
