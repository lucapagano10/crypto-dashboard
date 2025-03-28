import { supabase } from '../lib/supabase';

export const balanceHistoryService = {
  async saveBalance(totalUSD, exchanges) {
    const timestamp = new Date();

    try {
      // Find balances for each exchange
      const bybitExchange = exchanges.find(e => e.exchange === 'Bybit');
      const okx1Exchange = exchanges.find(e => e.exchange === 'OKX 1');
      const okx2Exchange = exchanges.find(e => e.exchange === 'OKX 2');

      const { data, error } = await supabase
        .from('crypto_balance_history')
        .insert([{
          timestamp,
          bybit_balance: bybitExchange?.totalUSD || 0,
          okx1_balance: okx1Exchange?.totalUSD || 0,
          okx2_balance: okx2Exchange?.totalUSD || 0,
          total_balance: totalUSD,
          spot_balance: totalUSD, // For now, treating all as spot balance
          snapshot_source: 'automatic',
          currency: 'USD'
        }]);

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Successfully saved balance to Supabase:', data);

      // Get updated history after insert
      return this.getHistory();
    } catch (error) {
      console.error('Error saving balance:', error);
      throw error;
    }
  },

  async getHistory() {
    console.log('Fetching balance history from Supabase...');
    try {
      const { data, error } = await supabase
        .from('crypto_balance_history')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(30);

      if (error) {
        console.error('Supabase select error:', error);
        throw error;
      }

      console.log('Retrieved history from Supabase:', data);

      // Transform the data to match the expected format for the chart
      const transformedData = data.map(record => ({
        timestamp: new Date(record.timestamp).getTime(),
        total_balance: Number(record.total_balance),
        exchanges: [
          { exchange: 'Bybit', balance: Number(record.bybit_balance) },
          { exchange: 'OKX 1', balance: Number(record.okx1_balance) },
          { exchange: 'OKX 2', balance: Number(record.okx2_balance) }
        ]
      }));

      return transformedData;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  async getMetrics() {
    try {
      const history = await this.getHistory();
      if (history.length === 0) return null;

      const current = history[history.length - 1].total_balance;
      const oneDayAgo = this.findClosestValue(history, 24);
      const sevenDaysAgo = this.findClosestValue(history, 24 * 7);
      const thirtyDaysAgo = this.findClosestValue(history, 24 * 30);

      console.log('Calculating metrics:', {
        current,
        oneDayAgo,
        sevenDaysAgo,
        thirtyDaysAgo
      });

      const metrics = {
        daily: this.calculateChange(current, oneDayAgo),
        weekly: this.calculateChange(current, sevenDaysAgo),
        monthly: this.calculateChange(current, thirtyDaysAgo)
      };

      console.log('Calculated metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      return null;
    }
  },

  findClosestValue(history, hoursAgo) {
    const targetTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    console.log(`Finding value closest to ${new Date(targetTime).toLocaleString()}`);

    const closest = history.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev;
    });

    console.log(`Found closest value:`, {
      timestamp: new Date(closest.timestamp).toLocaleString(),
      value: closest.total_balance
    });

    return closest.total_balance;
  },

  calculateChange(current, previous) {
    if (!previous) return { change: 0, percentage: 0 };
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return { change, percentage };
  }
};
