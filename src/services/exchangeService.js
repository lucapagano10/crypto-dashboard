import axios from 'axios';
import CryptoJS from 'crypto-js';

class ExchangeService {
  constructor() {
    this.bybitApiKey = '';
    this.bybitApiSecret = '';
    this.binanceApiKey = '';
    this.binanceApiSecret = '';
    this.okxApiKey = '';
    this.okxApiSecret = '';
    this.okxPassphrase = '';
  }

  signBybit(timestamp, params) {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return CryptoJS.HmacSHA256(timestamp + this.bybitApiKey + queryString, this.bybitApiSecret)
      .toString(CryptoJS.enc.Hex);
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
    }
  }

  async getBybitBalance() {
    try {
      if (!this.bybitApiKey || !this.bybitApiSecret) {
        throw new Error('Bybit API credentials not set');
      }

      const timestamp = Date.now().toString();
      const params = { timestamp };
      const signature = this.signBybit(timestamp, params);

      const response = await axios.get('https://api.bybit.com/v5/account/wallet-balance', {
        headers: {
          'X-BAPI-API-KEY': this.bybitApiKey,
          'X-BAPI-SIGN': signature,
          'X-BAPI-TIMESTAMP': timestamp,
        },
        params,
      });

      const balances = [];
      let totalUSD = 0;

      if (response.data.result && response.data.result.list) {
        response.data.result.list.forEach((coin) => {
          const walletBalance = Number(coin.walletBalance) || 0;
          const availableToWithdraw = Number(coin.availableToWithdraw) || 0;
          const usdValue = Number(coin.usdValue) || 0;

          if (walletBalance > 0) {
            balances.push({
              asset: coin.coin,
              free: availableToWithdraw,
              locked: walletBalance - availableToWithdraw,
              total: walletBalance
            });
            totalUSD += usdValue;
          }
        });
      }

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
      const path = '/api/v5/account/balance';
      const signature = this.signOKX(timestamp, method, path);

      const response = await axios.get('https://www.okx.com' + path, {
        headers: {
          'OK-ACCESS-KEY': this.okxApiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.okxPassphrase,
        },
      });

      const balances = [];
      let totalUSD = 0;

      if (response.data.data && response.data.data[0]?.details) {
        response.data.data[0].details.forEach((detail) => {
          const cashBal = Number(detail.cashBal) || 0;
          const availBal = Number(detail.availBal) || 0;
          const eqUsd = Number(detail.eqUsd) || 0;

          if (cashBal > 0) {
            balances.push({
              asset: detail.ccy,
              free: availBal,
              locked: cashBal - availBal,
              total: cashBal
            });
            totalUSD += eqUsd;
          }
        });
      }

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
