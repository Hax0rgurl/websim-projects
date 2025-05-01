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
    const minViewsForVPLRating = 1; // Require at least 1 view to calculate VPL meaningfully
    const defaultRatingWithLikesOnly = 5; // Max score if likes exist but views are 0

    if (totalLikes >= minLikesForRating) {
      if (totalViews >= minViewsForVPLRating) {
        const viewsPerLike = totalViews / totalLikes;
        // Find the best matching rating (lowest VPL gets higher score)
        // Thresholds are defined in config.js, assuming lower vpl means higher score
        // Iterate thresholds from lowest score (highest VPL) to highest score (lowest VPL)
        rating = 1; // Start with lowest score
        for (const threshold of ratingThresholds.sort((a,b) => a.viewsPerLike - b.viewsPerLike)) { // Sort by VPL ascending
             if (viewsPerLike <= threshold.viewsPerLike) {
                 rating = threshold.score;
                 break; // Found the appropriate tier
             }
         }
         if (debugMode) console.log(`Calculated Quality: ${rating}/5 based on VPL: ${viewsPerLike.toFixed(2)} (${totalViews} views / ${totalLikes} likes)`);
      } else {
        // Has likes but effectively zero views, give default high rating
        rating = defaultRatingWithLikesOnly;
         if (debugMode) console.log(`Calculated Quality: ${rating}/5 (default for likes >= ${minLikesForRating} with < ${minViewsForVPLRating} views)`);
      }
    } else {
       if (debugMode) console.log(`Calculated Quality: ${rating}/5 (not enough likes: ${totalLikes} < ${minLikesForRating})`);
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

  // Use the description from the profile if available and auto-bio is off
  if (!enableAutoBio && user.description) {
    return user.description;
  }
  if (!enableAutoBio && !user.description) {
      return ''; // Return empty if disabled and no description exists
  }

  // --- Proceed with auto-generation ---
  try {
    const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    }) : 'a while ago';
    
    let bioText = `Hello! My name is ${user.username} and I joined websim on ${joinDate}. `;

    const projectsCount = userStats.projects || 0; 
    const totalViews = userStats.views || 0;
    const totalLikes = userStats.likes || 0;

    if (projectsCount > 0) {
      bioText += `Since then, I've made ${projectsCount} project${projectsCount > 1 ? 's' : ''}`;
      if (totalViews > 0) {
        bioText += ` with a total of ${formatNumber(totalViews)} views`;
      }
       if (totalLikes > 0) {
         bioText += ` and ${formatNumber(totalLikes)} likes`;
       }
      bioText += '. ';
    } else {
        bioText += "I'm just getting started here! ";
    }

    if (bioIncludeProjectDetails && projectsData && projectsData.length > 0) {
      // Filter out any null or undefined projects first
      const validProjectsForSort = projectsData.filter(p => p && p.project && p.project.stats);

      if (validProjectsForSort.length > 0) {
          // Safely sort by date with null/undefined checking
          const sortedByDate = [...validProjectsForSort].sort((a, b) => {
              const dateA = a.project.created_at ? new Date(a.project.created_at).getTime() : 0;
              const dateB = b.project.created_at ? new Date(b.project.created_at).getTime() : 0;
              return dateB - dateA; // Newest first
          });

          const sortedByViews = [...validProjectsForSort].sort((a, b) =>
              (b.project.stats.views || 0) - (a.project.stats.views || 0));

          const sortedByLikes = [...validProjectsForSort].sort((a, b) =>
              (b.project.stats.likes || 0) - (a.project.stats.likes || 0));

          // Add latest project info
          if (sortedByDate.length > 0 && sortedByDate[0].project) {
            const latestProject = sortedByDate[0].project;
            if (latestProject && latestProject.title) {
              bioText += `My latest creation is <a href="https://websim.ai/p/${latestProject.id}" style="color: var(--neon-secondary);">${latestProject.title}</a>. `;
            }
          }

          // Add most viewed project info (if significant views)
          if (sortedByViews.length > 0 && sortedByViews[0].project && 
              (sortedByViews[0].project.stats.views || 0) > 10) {
            const mostViewedProject = sortedByViews[0].project;
             if (mostViewedProject && mostViewedProject.title) {
                bioText += `Check out <a href="https://websim.ai/p/${mostViewedProject.id}" style="color: var(--neon-secondary);">${mostViewedProject.title}</a>, which has gathered ${formatNumber(mostViewedProject.stats.views)} views! `;
             }
          }

          // Add most liked project info (if significant likes)
          if (sortedByLikes.length > 0 && sortedByLikes[0].project && 
              (sortedByLikes[0].project.stats.likes || 0) > 5) {
            const mostLikedProject = sortedByLikes[0].project;
            if (mostLikedProject && mostLikedProject.title) {
               bioText += `People seem to like <a href="https://websim.ai/p/${mostLikedProject.id}" style="color: var(--neon-secondary);">${mostLikedProject.title}</a> (${formatNumber(mostLikedProject.stats.likes)} likes). `;
            }
          }
      }
    }

    // Add social info
    if (bioIncludeSocialStats) {
      let socialText = [];
      if (userStats.following > 0) {
        socialText.push(`I'm following ${formatNumber(userStats.following)} creator${userStats.following !== 1 ? 's' : ''}`);
      }

      if (userStats.followers > 0) {
        socialText.push(`${formatNumber(userStats.followers)} ${userStats.followers === 1 ? 'person follows' : 'people follow'} me`);
      }

      if (socialText.length > 0) {
         bioText += socialText.join(' and ') + '.';
      }
    }

    // Use original description if auto-bio generation resulted in something too short or generic
    const minBioLength = 100; // Arbitrary minimum length
    if (user.description && bioText.length < minBioLength) {
        if (debugMode) console.log("Auto-bio too short, falling back to user description.");
        return user.description;
    }

    return bioText.trim(); // Trim any trailing spaces
  } catch (error) {
    console.error('Error generating bio text:', error);
    // Fallback to user's original description if bio generation fails
    return user.description || 'Welcome to my profile!';
  }
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