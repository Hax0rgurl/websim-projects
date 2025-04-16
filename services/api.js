/**
 * ApiService - Handle all API calls
 */
const ApiService = {
  /**
   * Fetch a user's profile information
   */
  async fetchUserProfile() {
    try {
      const response = await fetch(`/api/v1/users/${AppState.username}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },
  
  /**
   * Fetch count of users the profile is following
   */
  async fetchFollowingCount() {
    try {
      const response = await fetch(`/api/v1/users/${AppState.username}/following?count=true`);
      if (!response.ok) {
        throw new Error(`Failed to fetch following count: ${response.status}`);
      }
      const data = await response.json();
      return data.following.meta.count || 0;
    } catch (error) {
      console.error('Error fetching following count:', error);
      return 0;
    }
  },
  
  /**
   * Fetch count of users following the profile
   */
  async fetchFollowersCount() {
    try {
      const response = await fetch(`/api/v1/users/${AppState.username}/followers?count=true`);
      if (!response.ok) {
        throw new Error(`Failed to fetch followers count: ${response.status}`);
      }
      const data = await response.json();
      return data.followers.meta.count || 0;
    } catch (error) {
      console.error('Error fetching followers count:', error);
      return 0;
    }
  },
  
  /**
   * Fetch a user's projects with pagination
   */
  async fetchProjects(afterCursor = null) {
    try {
      const params = new URLSearchParams();
      if (afterCursor) params.append('after', afterCursor);
      params.append('first', Config.projectBatchSize.toString());
      params.append('posted', 'true');
      params.append('sort_by', 'updated_at');
      
      const response = await fetch(`/api/v1/users/${AppState.username}/projects?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const data = await response.json();
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
      return { data: [], meta: { has_next_page: false } };
    }
  },
  
  /**
   * Fetch a user's stats 
   */
  async fetchUserStats() {
    try {
      const response = await fetch(`/api/v1/users/${AppState.username}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status}`);
      }
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { total_views: 0, total_likes: 0 };
    }
  },
  
  /**
   * Fetch a list of followers with pagination
   */
  async fetchFollowers(afterCursor = null) {
    try {
      const params = new URLSearchParams();
      if (afterCursor) params.append('after', afterCursor);
      params.append('first', Config.userBatchSize.toString());
      
      const response = await fetch(`/api/v1/users/${AppState.username}/followers?${params}`);
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
  },
  
  /**
   * Fetch a list of users the profile is following with pagination
   */
  async fetchFollowing(afterCursor = null) {
    try {
      const params = new URLSearchParams();
      if (afterCursor) params.append('after', afterCursor);
      params.append('first', Config.userBatchSize.toString());
      
      const response = await fetch(`/api/v1/users/${AppState.username}/following?${params}`);
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
  },
  
  /**
   * Fetch the most recent follower
   */
  async fetchRecentFollower() {
    try {
      const response = await fetch(`/api/v1/users/${AppState.username}/followers?first=1`);
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
  },
  
  /**
   * Fetch count of unposted projects
   */
  async fetchUnpostedProjects() {
    try {
      const params = new URLSearchParams();
      params.append('first', '100');
      params.append('posted', 'false');
      
      const response = await fetch(`/api/v1/users/${AppState.username}/projects?${params}`);
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
        const nextResponse = await fetch(`/api/v1/users/${AppState.username}/projects?${params}`);
        
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
};