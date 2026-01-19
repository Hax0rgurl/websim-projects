// ===== API FUNCTIONS =====

/**
 * Fetch a user's projects with pagination based on the current visibility filter.
 * Handles 'public', 'private', and 'all' filters.
 * API enforces permissions for viewing private projects.
 */
async function fetchProjects(afterCursor = null) {
  try {
    // First, refresh auth cookies - CRITICAL for private project access
    await refreshAuthCookies();
    
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    params.append('first', projectBatchSize.toString());
    
    // Handle visibility filtering properly
    if (currentVisibilityFilter === 'private') {
      params.append('visibility', 'private');
    } else if (currentVisibilityFilter === 'all') {
      // For 'all', we want both public and private projects
      params.append('visibility', 'all');
    } else {
      // For 'public', we want only public projects
      params.append('visibility', 'public');
    }
    
    const viewingOwn = isViewingOwnProfile();
    
    if (debugMode) console.log(`Fetching projects with filter: ${currentVisibilityFilter}, own profile: ${viewingOwn}`);

    // Set up request URL
    const requestUrl = `/api/v1/users/${username}/projects?${params}`;
    if (debugMode) console.log("Fetching projects URL:", requestUrl);

    // Make the fetch request with proper credentials - critical for private content access
    const response = await fetch(requestUrl, {
      method: 'GET',
      credentials: 'include', 
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache' // Additional header to prevent caching
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText} (${requestUrl})`);
    }
    
    const data = await response.json();
    
    // Log raw data for deep debugging
    if (debugMode) {
      console.log("Raw API response:", data);
      console.log(`Project count in API response: ${data.projects.data.length}`);
      
      // Count projects by visibility 
      const visibilityCounts = data.projects.data.reduce((counts, item) => {
        if (item && item.project) {
          const visibility = item.project.visibility || 'unknown';
          counts[visibility] = (counts[visibility] || 0) + 1;
        }
        return counts;
      }, {});
      console.log("Projects by visibility:", visibilityCounts);
    }

    // Filter out null or invalid entries
    const validProjectData = data.projects.data.filter(item => item && item.project);
    
    return {
      data: validProjectData.map(item => ({
        project: item.project,
        project_revision: item.project_revision,
        site: item.site,
        cursor: item.cursor
      })),
      meta: data.projects.meta
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    document.getElementById('projects-loading').style.display = 'none';
    document.getElementById('projects-grid').innerHTML =
      '<div style="color: var(--neon-primary); padding: 2rem; text-align: center;">Error loading projects. Please try refreshing.</div>';
    return { data: [], meta: { has_next_page: false } };
  }
}

/**
 * Robust auth cookie refresh function
 */
let isRefreshingAuth = false;
async function refreshAuthCookies() {
  if (isRefreshingAuth) return;
  isRefreshingAuth = true;
  
  if (debugMode) console.log("🔑 Initializing robust auth refresh sequence...");
  
  try {
    // 1. Ping multiple endpoints to ensure various cookie partitions are updated
    const endpoints = [
      '/api/v1/users/me',
      '/api/v1/notifications',
      '/api/v1/projects?first=1'
    ];
    
    await Promise.allSettled(endpoints.map(url => 
      fetch(url, { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })
    ));

    // 2. Refresh the internal websim user object
    const currentUser = await window.websim.getUser();
    if (currentUser) {
      window.currentUserId = currentUser.id;
      window.currentUsername = currentUser.username;
      
      // Ping profile specifically
      await fetch(`/api/v1/users/${currentUser.username}`, { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (debugMode) console.log(`✅ Deep auth refresh completed for @${currentUser.username}`);
    }
  } catch (error) {
    console.error("❌ Auth refresh failed:", error);
  } finally {
    isRefreshingAuth = false;
  }
}

/**
 * Fetch a user's profile information
 */
async function fetchUserProfile() {
  try {
    const response = await fetch(`/api/v1/users/${username}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Fetch count of users the profile is following
 */
async function fetchFollowingCount() {
  try {
    const response = await fetch(`/api/v1/users/${username}/following?count=true`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch following count: ${response.status}`);
    }
    const data = await response.json();
    return data.following.meta.count || 0;
  } catch (error) {
    console.error('Error fetching following count:', error);
    return 0;
  }
}

/**
 * Fetch count of users following the profile
 */
async function fetchFollowersCount() {
  try {
    const response = await fetch(`/api/v1/users/${username}/followers?count=true`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch followers count: ${response.status}`);
    }
    const data = await response.json();
    return data.followers.meta.count || 0;
  } catch (error) {
    console.error('Error fetching followers count:', error);
    return 0;
  }
}

/**
 * Fetch a user's stats 
 */
async function fetchUserStats() {
  try {
    const response = await fetch(`/api/v1/users/${username}/stats`, {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user stats: ${response.status}`);
    }
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { total_views: 0, total_likes: 0 };
  }
}

/**
 * Fetch a list of followers with pagination
 */
async function fetchFollowers(afterCursor = null) {
  try {
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    params.append('first', userBatchSize.toString());
    
    const response = await fetch(`/api/v1/users/${username}/followers?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch followers: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      data: data.followers.data.map(item => ({
        user: item.follow.user,
        cursor: item.cursor
      })),
      meta: data.followers.meta
    };
  } catch (error) {
    console.error('Error fetching followers:', error);
    return { data: [], meta: { has_next_page: false } };
  }
}

/**
 * Fetch a list of users the profile is following with pagination
 */
async function fetchFollowing(afterCursor = null) {
  try {
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    params.append('first', userBatchSize.toString());
    
    const response = await fetch(`/api/v1/users/${username}/following?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch following: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      data: data.following.data.map(item => ({
        user: item.follow.user,
        cursor: item.cursor
      })),
      meta: data.following.meta
    };
  } catch (error) {
    console.error('Error fetching following:', error);
    return { data: [], meta: { has_next_page: false } };
  }
}

/**
 * Fetch the most recent follower
 */
async function fetchRecentFollower() {
  try {
    const response = await fetch(`/api/v1/users/${username}/followers?first=1`);
    if (!response.ok) {
      throw new Error(`Failed to fetch recent follower: ${response.status}`);
    }
    
    const data = await response.json();
    const recentFollowerEl = document.getElementById('recent-follower');
    
    // Clear previous loading state or follower info
    recentFollowerEl.innerHTML = ''; 
    
    if (!data || !data.followers || !data.followers.data || data.followers.data.length === 0) {
       recentFollowerEl.innerHTML = `<div>No followers yet!</div>`;
       recentFollowerEl.style.cursor = 'default';
       return null;
    }
    
    const follower = data.followers.data[0].follow.user;
    if (!follower) {
        recentFollowerEl.innerHTML = `<div>Error loading follower</div>`;
        recentFollowerEl.style.cursor = 'default';
        return null;
    }
    
    recentFollowerEl.innerHTML = `
      <img class="recent-follower-avatar" src="${follower.avatar_url || ''}" alt="Recent follower avatar" onerror="this.src='https://images.websim.ai/avatar/anonymous'">
      <div class="recent-follower-name">${follower.username}</div>
    `;
    recentFollowerEl.style.cursor = 'pointer';
    
    // Add click handler to visit follower's profile
    recentFollowerEl.onclick = () => {
      window.location.href = `https://websim.ai/@${follower.username}`;
    };
    
    return follower;
  } catch (error) {
    console.error('Error fetching recent follower:', error);
    const recentFollowerEl = document.getElementById('recent-follower');
    recentFollowerEl.innerHTML = `<div>Error loading follower</div>`;
    return null;
  }
}

/**
 * Fetch count of unposted projects (using the 'posted=false' parameter)
 * Note: This assumes 'posted=false' is still a valid way to find projects
 * that are neither explicitly public nor private (e.g., drafts).
 * If 'posted' is fully deprecated, this needs removal or rework.
 */
async function fetchUnpostedProjects() {
  // Check if the user is viewing their own profile. Only owners can see unposted/drafts.
  if (!isViewingOwnProfile()) {
    if (debugMode) console.log("Skipping unposted count for other user's profile.");
    return 0;
  }

  if(debugMode) console.log("Fetching UNPOSTED project count (using posted=false)");

  let totalCount = 0;
  let currentCursor = null;
  let hasMore = true;
  const batchCount = 100; // Fetch large batches for counting

  while(hasMore) {
      try {
          const params = new URLSearchParams();
          params.append('first', batchCount.toString());
          params.append('posted', 'false'); // Explicitly look for unposted
          if (currentCursor) params.append('after', currentCursor);

          const response = await fetch(`/api/v1/users/${username}/projects?${params}`, {
            credentials: 'include' // Include credentials for authorization
          });

          if (!response.ok) {
              if (response.status === 403) {
                   console.warn(`Received 403 Forbidden fetching unposted projects for ${username}. Assuming 0.`);
                   return 0; // Can't view them, count is 0
              }
              throw new Error(`Failed to fetch unposted projects page: ${response.status}`);
          }

          const data = await response.json();
          const projectsOnPage = data.projects.data.length;
          totalCount += projectsOnPage;
          hasMore = data.projects.meta.has_next_page;
          currentCursor = data.projects.meta.end_cursor;

          if (debugMode) console.log(`Unposted count: Fetched ${projectsOnPage}, total so far: ${totalCount}, hasMore: ${hasMore}`);

          if (!hasMore || projectsOnPage === 0) {
              break;
          }
           // Safety break
          if (totalCount > 5000) {
              console.warn("Unposted project count exceeded 5000, stopping loop.");
              break;
          }

      } catch (e) {
          console.error("Exception during unposted project count:", e);
          console.warn(`Unposted count stopped due to exception. Partial count: ${totalCount}`);
          return totalCount; // Return current count on exception
      }
  }
  if (debugMode) console.log("Finished unposted project count. Total:", totalCount);
  return totalCount;
}