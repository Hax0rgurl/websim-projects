// ===== DATA HANDLING FUNCTIONS =====

/**
 * Format numbers according to settings
 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  
  if (useCommaFormatting || num < numberFormatThreshold) {
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
}

/**
 * Store user statistics in WebsimSocket persistent storage
 */
async function storeUserStats(stats) {
  try {
    await room.collection('user_stats').create({
      username: stats.username,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing user stats:', error);
  }
}

/**
 * Calculate percentile of a value compared to stored stats
 */
async function calculatePercentile(value, statName) {
  if (!enablePercentiles) return null;
  
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
}

/**
 * Update a stat element with value and percentile information
 */
async function updateStatWithPercentile(elementId, value, statName) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Ensure value is a number, default to 0 if not
  const numericValue = Number(value);
  if (isNaN(numericValue)) {
    element.innerHTML = '0';
    if (debugMode) console.warn(`Invalid value provided for stat ${statName}:`, value);
    return;
  }

  try {
    // Calculate percentile only if enabled and value is valid
    const shouldCalculatePercentile = enablePercentiles && numericValue !== 0;
    const percentile = shouldCalculatePercentile ? await calculatePercentile(numericValue, statName) : null;

    let suffix = "";
    if (statName === 'popularity') {
      suffix = "/10";
    } else if (statName === 'rating') {
      suffix = "/5";
    }

    const formattedValue = formatNumber(numericValue);

    if (percentile === null || isNaN(percentile)) {
      element.innerHTML = `${formattedValue}${suffix}`;
    } else {
      element.innerHTML = `
        ${formattedValue}${suffix}
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
          Top ${percentile}%
        </div>
      `;
    }
  } catch (error) {
    console.error(`Error updating stat ${elementId}:`, error);
    // Fallback to just showing the formatted number
    element.innerHTML = `${formatNumber(numericValue) || '0'}`;
  }
}

/**
 * Update stats with direct API data and calculate derived stats like Popularity and Quality
 */
async function updateWithDirectStats() {
  try {
    // Fetch direct stats from API
    const stats = await fetchUserStats();
    const totalViews = stats.total_views || 0;
    const totalLikes = stats.total_likes || 0;

    // Update views and likes directly from API
    document.getElementById('views-count').innerHTML = formatNumber(totalViews);
    document.getElementById('likes-count').innerHTML = formatNumber(totalLikes);

    // --- Calculate Popularity Score ---
    let popularityScore = 0;
    // Iterate thresholds (defined in config.js) from highest score to lowest
    for (const threshold of popularityThresholds) {
      if (totalViews >= threshold.views && totalLikes >= threshold.likes) {
        popularityScore = threshold.score;
        break; // Stop at the first matching threshold
      }
    }
     if (debugMode) console.log(`Calculated Popularity: ${popularityScore}/10 based on ${totalViews} views, ${totalLikes} likes`);


    // --- Calculate Quality Rating ---
    let rating = 0; // Default to 0 if no data
    const minLikesForRating = 1;
    const minViewsForVPLRating = 1;
    const defaultRatingWithLikesOnly = 5;

    if (totalLikes >= minLikesForRating) {
      if (totalViews >= minViewsForVPLRating) {
        const viewsPerLike = totalViews / totalLikes;
        // Find the best matching rating (lowest VPL gets higher score)
        // Thresholds are defined in config.js, assuming lower vpl value means higher score
        rating = ratingThresholds.find(t => viewsPerLike >= t.viewsPerLike)?.score || defaultRatingWithLikesOnly; // Default to max score if VPL is very low or thresholds cover it
         if (debugMode) console.log(`Calculated Quality: ${rating}/5 based on VPL: ${viewsPerLike.toFixed(2)} (${totalViews} views / ${totalLikes} likes)`);
      } else {
        // Has likes but effectively zero views, give default high rating
        rating = defaultRatingWithLikesOnly;
         if (debugMode) console.log(`Calculated Quality: ${rating}/5 (default for likes with no views)`);
      }
    } else {
       if (debugMode) console.log(`Calculated Quality: ${rating}/5 (not enough likes: ${totalLikes})`);
    }


    // Update the stats display using the percentile function
    await updateStatWithPercentile('popularity-count', popularityScore, 'popularity');
    await updateStatWithPercentile('rating-count', rating, 'rating');

    return stats; // Return the raw API stats for potential further use
  } catch (error) {
    console.error('Error updating direct stats and calculating derived ones:', error);
    // Set calculated stats to error/zero state
    document.getElementById('popularity-count').innerHTML = 'Err';
    document.getElementById('rating-count').innerHTML = 'Err';
  }
}

/**
 * Format relative time (e.g., "2d" for 2 days ago)
 */
function getRelativeTimeString(date) {
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
}

/**
 * Generate a bio text based on user stats
 */
function generateBioText(userStats) {
  if (!userStats || !window.currentUserProfile) {
    return 'Loading bio...';
  }
  
  const user = window.currentUserProfile;
  
  if (!projectsData || projectsData.length === 0) {
    return `Hello! My name is ${user.username}. I joined websim on ${new Date(user.created_at).toLocaleDateString()}.`;
  }
  
  let bioText = `Hello! My name is ${user.username} and I joined websim on ${new Date(user.created_at).toLocaleDateString()}. `;

  // Project stats
  const totalViews = userStats.views;
  const projectsCount = userStats.projects;

  bioText += `Since then, I've made ${projectsCount} project${projectsCount > 1 ? 's' : ''}`;
  if (totalViews > 0) { 
    bioText += ` with ${formatNumber(totalViews)} total views`; 
  }
  bioText += '. ';

  if (bioIncludeProjectDetails) {
    // Sort projects to find latest, most viewed, most liked
    const sortedByDate = [...projectsData].sort((a, b) => 
      new Date(b.project.created_at) - new Date(a.project.created_at));
    
    const sortedByViews = [...projectsData].sort((a, b) => 
      b.project.stats.views - a.project.stats.views);
    
    const sortedByLikes = [...projectsData].sort((a, b) => 
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
      bioText += `My most viewed project is <a href="https://websim.ai/p/${mostViewedProject.id}" style="color: var(--neon-secondary);">${mostViewedProject.title || 'Untitled'}</a> with ${formatNumber(mostViewedProject.stats.views)} views. `;
    }
    
    // Add most liked project info
    if (sortedByLikes.length > 0 && sortedByLikes[0].project.stats.likes > 0) {
      const mostLikedProject = sortedByLikes[0].project;
      bioText += `My most liked project is <a href="https://websim.ai/p/${mostLikedProject.id}" style="color: var(--neon-secondary);">${mostLikedProject.title || 'Untitled'}</a> with ${formatNumber(mostLikedProject.stats.likes)} likes. `;
    }
  }
  
  // Add social info
  if (bioIncludeSocialStats) {
    let socialText = [];
    if (userStats.following > 0) {
      socialText.push(`I'm following ${formatNumber(userStats.following)} people`);
    }
    
    if (userStats.followers > 0) {
      socialText.push(`${formatNumber(userStats.followers)} ${userStats.followers === 1 ? 'person who follows' : 'people who follow'} me`);
    }
    
    if (socialText.length > 0) {
      bioText += socialText.join(' and ') + '.';
    }
  }
  
  return bioText;
}

/**
 * Reset all stat displays to loading state
 */
function resetStatsToLoading() {
  document.getElementById('views-count').innerHTML = loadingText;
  document.getElementById('sites-count').innerHTML = loadingText;
  document.getElementById('likes-count').innerHTML = loadingText;
  document.getElementById('followers-count').innerHTML = loadingText;
  document.getElementById('following-count').innerHTML = loadingText;
  document.getElementById('friends-count').innerHTML = loadingText;
  document.getElementById('popularity-count').innerHTML = loadingText;
  document.getElementById('rating-count').innerHTML = loadingText;
  document.getElementById('unposted-count').innerHTML = loadingText;
  document.getElementById('joined-count').innerHTML = loadingText;
  document.getElementById('description').innerHTML = loadingText;
}