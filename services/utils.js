/**
 * Utils Module - Utility functions
 */
const Utils = {
  /**
   * Format numbers according to settings
   */
  formatNumber(num) {
    if (num === undefined || num === null) return '0';
    
    if (Config.useCommaFormatting || num < Config.numberFormatThreshold) {
      return num.toLocaleString();
    } else {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      } else {
        return num.toString();
      }
    }
  },
  
  /**
   * Format relative time (e.g., "2d" for 2 days ago)
   */
  getRelativeTimeString(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffYears > 0) return `${diffYears}y`;
    if (diffMonths > 0) return `${diffMonths}mo`;
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return `${diffSecs}s`;
  },
  
  /**
   * Generate a bio text based on user stats
   */
  generateBioText(userStats) {
    if (!userStats || !AppState.currentUserProfile) {
      return 'Loading bio...';
    }
    
    const user = AppState.currentUserProfile;
    
    if (!AppState.projectsData || AppState.projectsData.length === 0) {
      return `Hello! My name is ${user.username}. I joined websim on ${new Date(user.created_at).toLocaleDateString()}.`;
    }
    
    let bioText = `Hello! My name is ${user.username} and I joined websim on ${new Date(user.created_at).toLocaleDateString()}. `;
    
    // Project stats
    const totalViews = userStats.views;
    const projectsCount = userStats.projects;
    
    bioText += `Since then, I've made ${projectsCount} project${projectsCount > 1 ? 's' : ''}`;
    if (totalViews > 0) { 
      bioText += ` with ${this.formatNumber(totalViews)} total views`; 
    }
    bioText += '. ';
    
    if (Config.bioIncludeProjectDetails) {
      // Sort projects to find latest, most viewed, most liked
      const sortedByDate = [...AppState.projectsData].sort((a, b) => 
        new Date(b.project.created_at) - new Date(a.project.created_at));
      
      const sortedByViews = [...AppState.projectsData].sort((a, b) => 
        b.project.stats.views - a.project.stats.views);
      
      const sortedByLikes = [...AppState.projectsData].sort((a, b) => 
        b.project.stats.likes - a.project.stats.likes);
      
      // Add latest project info
      if (sortedByDate.length > 0) {
        const latestProject = sortedByDate[0].project;
        bioText += `My latest project is <a href="https://websim.ai/p/${latestProject.id}" style="color: var(--neon-secondary);">${latestProject.title || 'Untitled'}</a>`;
        
        const projectDate = new Date(latestProject.created_at).toLocaleDateString();
        if (projectDate !== new Date(user.created_at).toLocaleDateString()) {
          bioText += ` which I made on ${projectDate}`;
        }
        bioText += '. ';
      }
      
      // Add most viewed project info
      if (sortedByViews.length > 0 && sortedByViews[0].project.stats.views > 0) {
        const mostViewedProject = sortedByViews[0].project;
        bioText += `My most viewed project is <a href="https://websim.ai/p/${mostViewedProject.id}" style="color: var(--neon-secondary);">${mostViewedProject.title || 'Untitled'}</a> with ${this.formatNumber(mostViewedProject.stats.views)} views. `;
      }
      
      // Add most liked project info
      if (sortedByLikes.length > 0 && sortedByLikes[0].project.stats.likes > 0) {
        const mostLikedProject = sortedByLikes[0].project;
        bioText += `My most liked project is <a href="https://websim.ai/p/${mostLikedProject.id}" style="color: var(--neon-secondary);">${mostLikedProject.title || 'Untitled'}</a> with ${this.formatNumber(mostLikedProject.stats.likes)} likes. `;
      }
    }
    
    // Add social info
    if (Config.bioIncludeSocialStats) {
      let socialText = [];
      if (userStats.following > 0) {
        socialText.push(`I'm following ${this.formatNumber(userStats.following)} people`);
      }
      
      if (userStats.followers > 0) {
        socialText.push(`${this.formatNumber(userStats.followers)} ${userStats.followers === 1 ? 'person who follows' : 'people who follow'} me`);
      }
      
      if (socialText.length > 0) {
        bioText += socialText.join(' and ') + '.';
      }
    }
    
    return bioText;
  }
};