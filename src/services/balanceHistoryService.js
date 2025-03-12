const HISTORY_KEY = 'balance_history';
const MAX_HISTORY_ITEMS = 30; // Store 30 days of history

export const balanceHistoryService = {
  saveBalance(totalUSD, exchanges) {
    const timestamp = Date.now();
    const history = this.getHistory();

    history.push({
      timestamp,
      totalUSD,
      exchanges: exchanges.map(e => ({
        exchange: e.exchange,
        balance: e.totalUSD
      }))
    });

    // Keep only last MAX_HISTORY_ITEMS entries
    if (history.length > MAX_HISTORY_ITEMS) {
      history.shift();
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  },

  getHistory() {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  },

  getMetrics() {
    const history = this.getHistory();
    if (history.length === 0) return null;

    const current = history[history.length - 1].totalUSD;
    const oneDayAgo = this.findClosestValue(history, 24);
    const sevenDaysAgo = this.findClosestValue(history, 24 * 7);
    const thirtyDaysAgo = this.findClosestValue(history, 24 * 30);

    return {
      daily: this.calculateChange(current, oneDayAgo),
      weekly: this.calculateChange(current, sevenDaysAgo),
      monthly: this.calculateChange(current, thirtyDaysAgo)
    };
  },

  findClosestValue(history, hoursAgo) {
    const targetTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    const closest = history.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev;
    });
    return closest.totalUSD;
  },

  calculateChange(current, previous) {
    if (!previous) return { change: 0, percentage: 0 };
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return { change, percentage };
  }
};
