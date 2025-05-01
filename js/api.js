// ===== API FUNCTIONS =====

/**
 * Fetch a user's profile information
 */
async function fetchUserProfile() {
  try {
    const response = await fetch(`/api/v1/users/${username}`);
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
    const response = await fetch(`/api/v1/users/${username}/following?count=true`);
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
    const response = await fetch(`/api/v1/users/${username}/followers?count=true`);
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
 * Fetch a user's projects with pagination
 */
async function fetchProjects(afterCursor = null) {
  try {
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    params.append('first', projectBatchSize.toString());

    // Determine if we should filter out private projects.
    // Filtering is needed if:
    // 1. The user explicitly wants to see only public/posted projects (!isShowingPrivate).
    // 2. OR The user is viewing someone else's profile AND we're configured not to show other users' private projects.
    const viewingOwn = isViewingOwnProfile();
    const shouldFilter = !isShowingPrivate || (!viewingOwn && !showOtherUsersPrivateProjects);

    if (shouldFilter) {
      params.append(privateFilterParam, 'true'); // API filters FOR posted=true
      if (debugMode) console.log("Filtering API request to show only posted projects (posted=true)");
    } else {
      // Don't add the 'posted' param, so the API returns all projects (including private)
      if (debugMode) console.log("Fetching all projects (including private, no 'posted' param)");
    }

    params.append('sort_by', 'updated_at'); // Adjust sort order if needed based on 'currentSort'

    const requestUrl = `/api/v1/users/${username}/projects?${params}`;
    if (debugMode) console.log("Fetching projects:", requestUrl);

    const response = await fetch(requestUrl);
    if (!response.ok) {
      // Handle 403 Forbidden - might indicate user cannot view private projects even if requested
      if (response.status === 403 && !shouldFilter) {
         console.warn("Received 403 Forbidden when trying to fetch all projects. User might lack permission for private projects.");
         // Optionally retry with filtering enabled, or show an error message.
         // For now, just return empty to avoid breaking.
         return { data: [], meta: { has_next_page: false } };
      }
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const data = await response.json();

    if (debugMode) {
      console.log(`Fetched ${data.projects.data.length} projects, has_next_page: ${data.projects.meta.has_next_page}`);
      data.projects.data.slice(0, 5).forEach((p, i) => console.log(`Sample project ${i} visibility: ${p?.project?.visibility}`));
    }

    // Filter client-side ONLY if necessary (e.g., API doesn't support perfect filtering, though 'posted' should work)
    // Let's rely on the API filter for now.

    return {
      data: data.projects.data.map(item => ({
        project: item.project,
        project_revision: item.project_revision,
        site: item.site,
        cursor: item.cursor
      })),
      meta: data.projects.meta
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    // Consider showing an error in the UI
    document.getElementById('projects-loading').style.display = 'none';
    document.getElementById('projects-grid').innerHTML = '<div style="color: var(--neon-primary); padding: 2rem; text-align: center;">Error loading projects.</div>';
    return { data: [], meta: { has_next_page: false } };
  }
}

/**
 * Fetch a user's stats 
 */
async function fetchUserStats() {
  try {
    const response = await fetch(`/api/v1/users/${username}/stats`);
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
 * Fetch count of unposted projects
 */
async function fetchUnpostedProjects() {
  try {
    const params = new URLSearchParams();
    params.append('first', '100');
    params.append('posted', 'false');
    
    const response = await fetch(`/api/v1/users/${username}/projects?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch unposted projects: ${response.status}`);
    }
    
    const data = await response.json();
    let totalCount = data.projects.data.length;
    let hasNextPage = data.projects.meta.has_next_page;
    let nextCursor = data.projects.meta.end_cursor;
    
    // Continue fetching if there are more pages
    while (hasNextPage) {
      params.set('after', nextCursor);
      const nextResponse = await fetch(`/api/v1/users/${username}/projects?${params}`);
      
      if (!nextResponse.ok) {
        console.error('Error fetching more unposted projects');
        break;
      }
      
      const nextData = await nextResponse.json();
      totalCount += nextData.projects.data.length;
      hasNextPage = nextData.projects.meta.has_next_page;
      nextCursor = nextData.projects.meta.end_cursor;
    }
    
    return totalCount;
  } catch (error) {
    console.error('Error fetching unposted projects:', error);
    return 0;
  }
}