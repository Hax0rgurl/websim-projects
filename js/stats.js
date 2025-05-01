// ===== DATA HANDLING FUNCTIONS =====

/**
 * Format numbers according to settings
 */
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(Number(num))) return '0';
  num = Number(num); // Ensure it's a number


  if (useCommaFormatting || num < numberFormatThreshold) {
    // Use localeString for comma formatting or for small numbers
    return num.toLocaleString();
  } else {
    // Use K/M notation for large numbers
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString(); // Should not happen if threshold > 1000, but safe fallback
    }
  }
}


/**
 * Store user statistics in WebsimSocket persistent storage
 */
async function storeUserStats(stats) {
  // Removed percentile calculation/storage logic as per instructions
  // This function can be kept for potential future use or removed if desired.
  if (debugMode) console.log("Skipping storing user stats (functionality disabled/removed).", stats);
  // Original logic (commented out):
  /*
  try {
    await room.collection('user_stats').create({
      username: stats.username,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing user stats:', error);
  }
  */
}

/**
 * Update a stat element with value
 */
async function updateStatDisplay(elementId, value, suffix = '') {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Ensure value is a number, default to 0 if not
  const numericValue = Number(value);
  const displayValue = isNaN(numericValue) ? '0' : formatNumber(numericValue);

  element.innerHTML = `${displayValue}${suffix}`;

  if (debugMode && isNaN(numericValue)) {
    console.warn(`Invalid value provided for stat ${elementId}, displaying '0':`, value);
  }
}


/**
 * Update stats with direct API data and calculate derived stats like Popularity and Quality
 */
async function updateWithDirectStats() {
  try {
    // Fetch direct stats from API
    const stats = await fetchUserStats(); // Fetches for the current 'username'
    const totalViews = stats.total_views || 0;
    const totalLikes = stats.total_likes || 0;

    if (debugMode) console.log(`Fetched direct stats for ${username}:`, stats);

    // Update views and likes directly from API
    await updateStatDisplay('views-count', totalViews);
    await updateStatDisplay('likes-count', totalLikes);

    // --- Calculate Popularity Score ---
    let popularityScore = 0;
    // Iterate thresholds (defined in config.js) from highest score to lowest
    for (const threshold of popularityThresholds) {
      if (totalViews >= threshold.views && totalLikes >= threshold.likes) {
        popularityScore = threshold.score;
        break; // Stop at the first matching threshold
      }
    }
     if (debugMode) console.log(`Calculated Popularity for ${username}: ${popularityScore}/10 based on ${totalViews} views, ${totalLikes} likes`);


    // --- Calculate Quality Rating ---
    let rating = 0; // Default to 0 if no data
    const minLikesForRating = 1; // Minimum likes required to calculate a rating > 0
    const minViewsForVPLRating = 1; // Minimum views required to calculate a rating based on VPL
    const defaultRatingWithLikesOnly = 5; // Default rating if user has likes but no views

    if (totalLikes >= minLikesForRating) {
      if (totalViews >= minViewsForVPLRating) {
        const viewsPerLike = totalViews / totalLikes;
        // Find the best matching rating (lowest VPL gets higher score)
        // Thresholds are defined in config.js, assuming lower vpl value means higher score
        // Default to max score (5) if VPL is very low (better than best threshold)
        rating = ratingThresholds.find(t => viewsPerLike >= t.viewsPerLike)?.score || defaultRatingWithLikesOnly;
         if (debugMode) console.log(`Calculated Quality for ${username}: ${rating}/5 based on VPL: ${viewsPerLike.toFixed(2)} (${totalViews} views / ${totalLikes} likes)`);
      } else {
        // Has likes but effectively zero views, give default high rating
        rating = defaultRatingWithLikesOnly;
         if (debugMode) console.log(`Calculated Quality for ${username}: ${rating}/5 (default for likes with no views)`);
      }
    } else {
       if (debugMode) console.log(`Calculated Quality for ${username}: ${rating}/5 (not enough likes: ${totalLikes})`);
    }


    // Update the stats display
    await updateStatDisplay('popularity-count', popularityScore, '/10');
    await updateStatDisplay('rating-count', rating, '/5');

    return stats; // Return the raw API stats for potential further use
  } catch (error) {
    console.error('Error updating direct stats and calculating derived ones:', error);
    // Set calculated stats to error/zero state
    document.getElementById('popularity-count').innerHTML = 'Err';
    document.getElementById('rating-count').innerHTML = 'Err';
    // Also reset views/likes if fetch failed
    document.getElementById('views-count').innerHTML = 'Err';
    document.getElementById('likes-count').innerHTML = 'Err';
    return null; // Indicate failure
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
  const diffMonths = Math.floor(diffDays / 30.44); // Average days per month
  const diffYears = Math.floor(diffDays / 365.25); // Account for leap years

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

  if (!user.created_at) return 'Bio generation failed: Missing join date.';

  // Use description from profile if available and auto-bio is off
  if (!enableAutoBio && user.description) {
      return user.description;
  }
  // If auto-bio is off and no description, return a simple default
  if (!enableAutoBio && !user.description) {
      return `User: ${user.username}. Joined: ${new Date(user.created_at).toLocaleDateString()}.`;
  }

  // --- Auto-Bio Generation ---
  let bioText = `Hello! I'm ${user.username}. `;
  bioText += `I joined websim ${getRelativeTimeString(user.created_at)} ago. `;

  // Project stats
  const totalViews = userStats.views || 0;
  const projectsCount = userStats.projects || 0;

  if (projectsCount > 0) {
    bioText += `I've made ${projectsCount} project${projectsCount !== 1 ? 's' : ''}`;
    if (totalViews > 0) {
      bioText += ` which have gathered ${formatNumber(totalViews)} views`;
    }
    bioText += '. ';
  } else {
    bioText += "I haven't posted any projects yet. ";
  }


  if (bioIncludeProjectDetails && projectsData && projectsData.length > 0) {
    // Sort projects to find latest, most viewed, most liked (ensure data is valid)
    const validProjects = projectsData.filter(p => p.project && p.project.stats);

    if (validProjects.length > 0) {
        const sortedByDate = [...validProjects].sort((a, b) =>
            new Date(b.project.created_at) - new Date(a.project.created_at));

        const sortedByViews = [...validProjects].sort((a, b) =>
            (b.project.stats.views || 0) - (a.project.stats.views || 0));

        const sortedByLikes = [...validProjects].sort((a, b) =>
            (b.project.stats.likes || 0) - (a.project.stats.likes || 0));

        // Add latest project info
        if (sortedByDate.length > 0) {
          const latestProject = sortedByDate[0].project;
           // Use relative links
          bioText += `My latest project is <a href="/p/${latestProject.id}" style="color: var(--neon-secondary);">${latestProject.title || 'Untitled'}</a>. `;
        }

        // Add most viewed project info
        const mostViewedProject = sortedByViews[0].project;
        if (mostViewedProject.stats.views > 0) {
          bioText += `My most viewed is <a href="/p/${mostViewedProject.id}" style="color: var(--neon-secondary);">${mostViewedProject.title || 'Untitled'}</a> (${formatNumber(mostViewedProject.stats.views)} views). `;
        }

        // Add most liked project info
        const mostLikedProject = sortedByLikes[0].project;
        if (mostLikedProject.stats.likes > 0) {
          bioText += `My most liked is <a href="/p/${mostLikedProject.id}" style="color: var(--neon-secondary);">${mostLikedProject.title || 'Untitled'}</a> (${formatNumber(mostLikedProject.stats.likes)} likes). `;
        }
    }
  }

  // Add social info
  if (bioIncludeSocialStats) {
    let socialParts = [];
    const followersCount = userStats.followers || 0;
    const followingCount = userStats.following || 0;
    const friendsCount = userStats.friends || 0; // Use the calculated friends count

    if (followersCount > 0) {
      socialParts.push(`${formatNumber(followersCount)} follower${followersCount !== 1 ? 's' : ''}`);
    }
    if (followingCount > 0) {
      socialParts.push(`following ${formatNumber(followingCount)}`);
    }
     if (friendsCount > 0) {
      socialParts.push(`${formatNumber(friendsCount)} friend${friendsCount !== 1 ? 's' : ''}`);
    }


    if (socialParts.length > 0) {
      bioText += `I have ${socialParts.join(', ')}. `;
    }
  }

  return bioText.trim(); // Trim trailing space
}


/**
 * Reset all stat displays to loading state
 */
function resetStatsToLoading() {
  const statIds = [
    'views-count', 'sites-count', 'likes-count',
    'followers-count', 'following-count', 'friends-count',
    'popularity-count', 'rating-count', 'unposted-count',
    'joined-count'
  ];
  statIds.forEach(id => {
    const element = document.getElementById(id);
    if (element && !element.classList.contains('joined')) { // Don't replace joined date structure
        element.innerHTML = loadingText;
    } else if (element && element.classList.contains('joined')) {
        // Reset joined date specifically
        element.innerHTML = loadingText;
        element.classList.remove('joined'); // Remove class until data is loaded
    }
  });
  // Reset bio/description
  document.getElementById('description').innerHTML = loadingText;
}
