import axios from 'axios';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'crypto_dashboard_credentials';

class ExchangeService {
  constructor() {
    this.bybitApiKey = '';
    this.bybitApiSecret = '';
    this.okxAccounts = [
      { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 1' },
      { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 2' }
    ];
    this.loadCredentials();
  }

  loadCredentials() {
    try {
      const encryptedData = localStorage.getItem(STORAGE_KEY);
      if (encryptedData) {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, window.location.hostname);
        const credentials = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

        this.bybitApiKey = credentials.bybitApiKey || '';
        this.bybitApiSecret = credentials.bybitApiSecret || '';
        this.okxAccounts = credentials.okxAccounts || [
          { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 1' },
          { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 2' }
        ];
      }
    } catch (error) {
      console.warn('Failed to load credentials from localStorage:', error);
      this.clearCredentials();
    }
  }

  saveCredentials() {
    try {
      const credentials = {
        bybitApiKey: this.bybitApiKey,
        bybitApiSecret: this.bybitApiSecret,
        okxAccounts: this.okxAccounts
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

  clearCredentials() {
    this.bybitApiKey = '';
    this.bybitApiSecret = '';
    this.okxAccounts = [
      { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 1' },
      { apiKey: '', apiSecret: '', passphrase: '', name: 'OKX 2' }
    ];
    localStorage.removeItem(STORAGE_KEY);
  }

  signBybit(timestamp, params) {
    const queryString = timestamp + this.bybitApiKey + '5000' + params;
    console.log('Bybit sign string:', queryString);
    return CryptoJS.HmacSHA256(queryString, this.bybitApiSecret).toString(CryptoJS.enc.Hex);
  }

  signOKX(timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return CryptoJS.HmacSHA256(message, this.okxApiSecret)
      .toString(CryptoJS.enc.Base64);
  }

  setCredentials(exchange, apiKey, apiSecret, passphrase, accountIndex) {
    switch (exchange.toLowerCase()) {
      case 'bybit':
        this.bybitApiKey = apiKey;
        this.bybitApiSecret = apiSecret;
        break;
      case 'okx':
        if (accountIndex !== undefined && this.okxAccounts[accountIndex]) {
          this.okxAccounts[accountIndex] = {
            ...this.okxAccounts[accountIndex],
            apiKey,
            apiSecret,
            passphrase: passphrase || ''
          };
        }
        break;
      default:
        console.warn('Unknown exchange:', exchange);
        return;
    }
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

  async getOKXBalance(account) {
    try {
      if (!account.apiKey || !account.apiSecret || !account.passphrase) {
        throw new Error('OKX API credentials not set');
      }

      const timestamp = new Date().toISOString();
      const method = 'GET';
      const path = '/api/v5/asset/balances';
      const signature = CryptoJS.HmacSHA256(
        timestamp + method + path,
        account.apiSecret
      ).toString(CryptoJS.enc.Base64);

      const response = await axios.get('https://www.okx.com' + path, {
        headers: {
          'OK-ACCESS-KEY': account.apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': account.passphrase,
        },
      });

      console.log(`OKX Response (${account.name}):`, response.data);

      const balances = [];
      let totalUSD = 0;

      if (response.data.data) {
        for (const balance of response.data.data) {
          const cashBal = Number(balance.bal) || 0;
          const availBal = Number(balance.availBal) || 0;

          if (cashBal > 0) {
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

      console.log(`Total USD Value (${account.name}):`, totalUSD);

      return {
        exchange: account.name,
        balances,
        totalUSD
      };
    } catch (error) {
      console.error(`Error fetching ${account.name} balance:`, error);
      return {
        exchange: account.name,
        balances: [],
        totalUSD: 0,
        error: error.message
      };
    }
  }

  async getAllBalances() {
    const results = await Promise.all([
      this.getBybitBalance(),
      ...this.okxAccounts.map(account => this.getOKXBalance(account))
    ]);

    // Add fixed Cash balance of $50,000
    results.push({
      exchange: 'Cash',
      balances: [
        {
          asset: 'USD',
          free: 50000,
          locked: 0,
          total: 50000
        }
      ],
      totalUSD: 50000
    });

    return results;
  }
}

export const exchangeService = new ExchangeService();
