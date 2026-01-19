// ===== API FUNCTIONS =====

/**
 * Fetch a user's profile information
 */
async function fetchUserProfile() {
  try {
    const response = await fetch(`/api/v1/users/${username}`, {
      credentials: 'include' // Important for auth context
    });
    if (!response.ok) {
      if (response.status === 404) {
          console.warn(`User not found: ${username}`);
          throw new Error(`User not found: ${username}`);
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Propagate the error or return null depending on desired handling upstream
    throw error;
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
    return 0; // Return 0 on error for stats display
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
    return 0; // Return 0 on error
  }
}

/**
 * Fetch a user's projects with pagination based on the current visibility filter.
 * Handles 'public', 'private', and 'all' filters.
 * API enforces permissions for viewing private projects.
 */
async function fetchProjects(afterCursor = null) {
  try {
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    params.append('first', projectBatchSize.toString());

    const viewingOwn = isViewingOwnProfile(); // Ensure this check uses up-to-date info

    // Determine API parameters based on filter and ownership
    // Prioritize explicit visibility parameter if known to better guide the API
    if (currentVisibilityFilter === 'public') {
        params.append('posted', 'true');
        params.append('visibility', 'public');
    } else if (viewingOwn && currentVisibilityFilter === 'private') {
        // Fetch all projects (no filter) and let client-side filtering handle it.
        // This ensures we don't miss private projects if the API ignores the visibility param.
        // We don't append 'posted=true' to ensure we get everything.
    } else if (!viewingOwn) {
        // Viewing someone else -> force public/posted
        params.append('posted', 'true');
    }
    // For 'all' on own profile, we omit specific filters to try and get everything
    
    if (debugMode) console.log(`[API] Fetching projects for '${username}' with filter '${currentVisibilityFilter}', own=${viewingOwn}. Params: ${params.toString()}`);

    const requestUrl = `/api/v1/users/${username}/projects?${params}`;
    if (debugMode) console.log("Fetching projects URL:", requestUrl);

    // ALWAYS include credentials for project fetching as permissions depend on the requester
    const response = await fetch(requestUrl, {
      credentials: 'include',
      cache: 'no-store', // Ensure we don't serve stale cached data, especially for auth-dependent content
      headers: {
        'Accept': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText} (${requestUrl})`);
    }

    const data = await response.json();

    // Log raw data for debugging private projects when viewing own profile
    if (debugMode && viewingOwn) {
      console.log(`Raw API response for projects (filter: ${currentVisibilityFilter}):`, JSON.stringify(data, null, 2));
    }

    // Filter out potential null or invalid project entries returned by the API
    const validProjectData = data.projects.data.filter(item => item && item.project && item.project.id);

    if (debugMode && viewingOwn) {
        const projectVisibilities = validProjectData.map(p => `${p.project.id}: ${p.project.visibility}`);
        console.log(`Projects received from API (${validProjectData.length}):`, projectVisibilities);
    }


    // Perform client-side filtering ONLY if needed (specifically for the 'private' filter)
    let finalData = validProjectData;
    if (currentVisibilityFilter === 'private') {
      if (viewingOwn) {
        finalData = validProjectData.filter(item =>
          item.project && item.project.visibility === 'private'
        );
        if (debugMode) {
          console.log(`Client-side filtered for PRIVATE: ${finalData.length} projects matched.`);
          if (finalData.length === 0 && validProjectData.length > 0) {
              console.log("No projects matched 'private' filter client-side. Original visibilities received:", validProjectData.map(p => p.project.visibility));
          }
        }
      } else {
        // Should not be able to select 'private' for others, but defensively clear data
        finalData = [];
        if (debugMode) console.log("Cleared project data because 'private' filter selected for non-owner.");
      }
    } else if (currentVisibilityFilter === 'public') {
        // While posted=true should handle this server-side, add a client-side check for robustness
        finalData = validProjectData.filter(item => item.project && item.project.visibility === 'public');
         if (debugMode && finalData.length !== validProjectData.length) {
             console.log(`Client-side filtered for PUBLIC: ${finalData.length} projects matched (originally ${validProjectData.length}).`);
         }
    }
    // 'all' filter uses all validProjectData returned by the API (for the owner)


    return {
      data: finalData.map(item => ({
        project: item.project,
        project_revision: item.project_revision,
        site: item.site,
        cursor: item.cursor // Ensure cursor is passed correctly
      })),
      meta: data.projects.meta // Pass metadata for pagination
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    document.getElementById('projects-loading').style.display = 'none';
    const grid = document.getElementById('projects-grid');
    if (grid) { // Check if grid exists before manipulating
        grid.innerHTML =
        '<div style="color: var(--neon-primary); padding: 2rem; text-align: center; grid-column: 1 / -1;">Error loading projects. Please try refreshing.</div>';
    }
    // Return empty state to prevent breaking downstream logic
    return { data: [], meta: { has_next_page: false } };
  }
}

/**
 * Fetch a user's stats
 */
async function fetchUserStats() {
  try {
    const response = await fetch(`/api/v1/users/${username}/stats`, {
      credentials: 'include', // Include credentials in case stats vary by viewer in future
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user stats: ${response.status}`);
    }
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return { total_views: 0, total_likes: 0 }; // Return default on error
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
       if (response.status === 404) { // Handle user not found gracefully
         console.warn("User not found while fetching recent follower.");
       } else {
           throw new Error(`Failed to fetch recent follower: ${response.status}`);
       }
       return null; // Return null if user not found or other error
    }

    const data = await response.json();
    const recentFollowerEl = document.getElementById('recent-follower');
    if (!recentFollowerEl) return null; // Element not found

    // Clear previous loading state or follower info
    recentFollowerEl.innerHTML = '';

    if (!data || !data.followers || !data.followers.data || data.followers.data.length === 0) {
       recentFollowerEl.innerHTML = `<div style="color: var(--text-secondary); text-align: center;">No followers yet!</div>`;
       recentFollowerEl.style.cursor = 'default';
       recentFollowerEl.onclick = null; // Remove previous handler
       return null;
    }

    const follower = data.followers.data[0].follow.user;
    if (!follower || !follower.username) { // Check for valid follower data
        recentFollowerEl.innerHTML = `<div style="color: var(--neon-primary); text-align: center;">Error loading follower data</div>`;
        recentFollowerEl.style.cursor = 'default';
        recentFollowerEl.onclick = null;
        return null;
    }

    recentFollowerEl.innerHTML = `
      <img class="recent-follower-avatar" src="${follower.avatar_url || `https://images.websim.ai/avatar/${follower.username}`}" alt="${follower.username}'s avatar" onerror="this.src='https://images.websim.ai/avatar/anonymous'">
      <a href="https://websim.ai/@${follower.username}" target="_blank" class="recent-follower-name" style="text-decoration: none; color: inherit;">${follower.username}</a>
    `;
    recentFollowerEl.style.cursor = 'pointer';

    // Make the whole card clickable to navigate to the user's profile in the *current* tab/app state
    recentFollowerEl.onclick = (e) => {
      e.preventDefault(); // Prevent default link behavior if clicking the name link
      // Navigate within the app
       const newUsername = follower.username;
       if (newUsername && newUsername !== username) {
           document.getElementById('user-search').value = newUsername; // Optionally populate search
           // Trigger a profile load for the new user
           username = newUsername;
           initProfile();
       }
    };

    return follower;
  } catch (error) {
    console.error('Error fetching recent follower:', error);
    const recentFollowerEl = document.getElementById('recent-follower');
    if (recentFollowerEl) {
        recentFollowerEl.innerHTML = `<div style="color: var(--neon-primary); text-align: center;">Error loading follower</div>`;
        recentFollowerEl.style.cursor = 'default';
        recentFollowerEl.onclick = null;
    }
    return null;
  }
}


/**
 * Fetch count of unposted projects. Requires authentication.
 * This is a best guess based on `posted=false`. If API changes, this needs update.
 */
async function fetchUnpostedProjects() {
  // Check if the user is viewing their own profile. Only owners can see unposted/drafts.
  if (!isViewingOwnProfile()) {
    if (debugMode) console.log("Skipping unposted count for other user's profile.");
    return 0;
  }

  if (debugMode) console.log("Fetching UNPOSTED project count (using posted=false)");

  let totalCount = 0;
  let currentCursor = null;
  let hasMore = true;
  const batchCount = 100; // Fetch large batches for counting

  while (hasMore) {
    try {
      const params = new URLSearchParams();
      params.append('first', batchCount.toString());
      params.append('posted', 'false'); // Explicitly look for unposted
      if (currentCursor) params.append('after', currentCursor);

      const response = await fetch(`/api/v1/users/${username}/projects?${params}`, {
        credentials: 'include' // Crucial: Include credentials for authorization
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`Received 403 Forbidden fetching unposted projects for ${username}. Assuming 0.`);
          return 0; // Can't view them, count is 0
        }
         // Treat 404 (user not found) similarly - count is 0
        if (response.status === 404) {
            console.warn(`Received 404 Not Found fetching unposted projects for ${username}. Assuming 0.`);
            return 0;
        }
        throw new Error(`Failed to fetch unposted projects page: ${response.status}`);
      }

      const data = await response.json();

      // Defensive check for data structure
      const projectsOnPage = data?.projects?.data?.length ?? 0;
      totalCount += projectsOnPage;
      hasMore = data?.projects?.meta?.has_next_page ?? false;
      currentCursor = data?.projects?.meta?.end_cursor;

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