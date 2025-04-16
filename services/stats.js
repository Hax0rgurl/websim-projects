/**
 * StatsService - Manages user statistics
 */
const StatsService = {
  /**
   * Store user statistics in WebsimSocket persistent storage
   */
  async storeUserStats(stats) {
    try {
      await room.collection('user_stats').create({
        username: stats.username,
        stats: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing user stats:', error);
    }
  },
  
  /**
   * Calculate percentile of a value compared to stored stats
   */
  async calculatePercentile(value, statName) {
    if (!Config.enablePercentiles) return null;
    
    try {
      const records = room.collection('user_stats').getList();
      if (!records || records.length === 0) return null;
      
      const values = records
        .filter(r => r.stats && r.stats[statName] !== undefined && r.stats[statName] !== null)
        .map(r => r.stats[statName]);
      
      if (values.length === 0) return null;
      
      values.sort((a, b) => b - a);
      const position = values.findIndex(v => v <= value) + 1;
      return Math.round((1 - (position / values.length)) * 100);
    } catch (error) {
      console.error('Error calculating percentile:', error);
      return null;
    }
  },
  
  /**
   * Update a stat element with value and percentile information
   */
  async updateStatWithPercentile(elementId, value, statName) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isNaN(value) || value === undefined || value === null) {
      element.innerHTML = '0';
      return;
    }
    
    try {
      const percentile = await this.calculatePercentile(value, statName);
      let suffix = "";
      
      if (statName === 'popularity') {
        suffix = "/10";
      } else if (statName === 'rating') {
        suffix = "/5";
      }
      
      if (percentile === null || isNaN(percentile)) {
        element.innerHTML = `${Utils.formatNumber(value)}${suffix}`;
      } else {
        element.innerHTML = `
          ${Utils.formatNumber(value)}${suffix}
          <div style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">
            Top ${percentile}%
          </div>
        `;
      }
    } catch (error) {
      console.error(`Error updating stat ${elementId}:`, error);
      element.innerHTML = `${Utils.formatNumber(value) || '0'}`;
    }
  }
};