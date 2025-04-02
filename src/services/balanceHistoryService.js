import { supabase } from '../lib/supabase';

export const TIME_RANGES = {
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  ALL: 'all'
};

export const balanceHistoryService = {
  async deleteOldRecords() {
    try {
      const cutoffDate = new Date('2025-03-28');
      const { data, error } = await supabase
        .from('crypto_balance_history')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Error deleting old records:', error);
        throw error;
      }

      console.log('Successfully deleted old records:', data);
      return data;
    } catch (error) {
      console.error('Error deleting old records:', error);
      throw error;
    }
  },

  async saveBalance(totalUSD, exchanges) {
    try {
      // Find balances for each exchange
      const bybitExchange = exchanges.find(e => e.exchange === 'Bybit');
      const okx1Exchange = exchanges.find(e => e.exchange === 'OKX 1');
      const okx2Exchange = exchanges.find(e => e.exchange === 'OKX 2');

      const { data, error } = await supabase
        .from('crypto_balance_history')
        .insert([{
          bybit_balance: bybitExchange?.totalUSD || 0,
          okx1_balance: okx1Exchange?.totalUSD || 0,
          okx2_balance: okx2Exchange?.totalUSD || 0,
          total_balance: totalUSD,
          spot_balance: totalUSD, // For now, treating all as spot balance
          snapshot_source: 'automatic',
          currency: 'USD'
          // timestamp will be automatically set by the database
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

  async getHistory(timeRange = TIME_RANGES.MONTH) {
    console.log('Fetching balance history from Supabase...', { timeRange });
    try {
      let query = supabase
        .from('crypto_balance_history')
        .select('*');

      // Apply time range filter
      if (timeRange !== TIME_RANGES.ALL) {
        const daysToSubtract = parseInt(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToSubtract);
        query = query.gte('timestamp', startDate.toISOString());
      }

      const { data, error } = await query.order('timestamp', { ascending: true });

      if (error) {
        console.error('Supabase select error:', error);
        throw error;
      }

      console.log('Retrieved raw history from Supabase:', data);

      // Group data by day and take the latest entry for each day
      const dailyData = data.reduce((acc, record) => {
        const date = new Date(record.timestamp).toISOString().split('T')[0];
        if (!acc[date] || new Date(record.timestamp) > new Date(acc[date].timestamp)) {
          acc[date] = record;
        }
        return acc;
      }, {});

      // Convert back to array and sort by date
      const consolidatedData = Object.values(dailyData).sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      console.log('Consolidated daily history:', consolidatedData);

      // Transform the data to match the expected format for the chart
      const transformedData = consolidatedData.map(record => ({
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

      // Find values closest to 24h, 7d, and 30d ago
      const now = Date.now();
      const oneDayAgo = this.findClosestValue(history, now - (24 * 60 * 60 * 1000));
      const sevenDaysAgo = this.findClosestValue(history, now - (7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = this.findClosestValue(history, now - (30 * 24 * 60 * 60 * 1000));

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

  findClosestValue(history, targetTime) {
    console.log(`Finding value closest to ${new Date(targetTime).toLocaleString()}`);

    if (history.length === 0) return 0;

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
