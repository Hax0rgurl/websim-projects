/**
 * DataController - Manages data loading and processing
 */
const DataController = {
  /**
   * Update stats with direct API data
   */
  async updateWithDirectStats() {
    try {
      // Fetch direct stats from API
      const stats = await ApiService.fetchUserStats();
      
      // Update views and likes directly from API
      document.getElementById('views-count').innerHTML = Utils.formatNumber(stats.total_views || 0);
      document.getElementById('likes-count').innerHTML = Utils.formatNumber(stats.total_likes || 0);
      
      // Calculate popularity and rating based on these direct values
      let popularityScore = 0;
      for (const threshold of Config.popularityThresholds) {
        if ((stats.total_views || 0) >= threshold.views && (stats.total_likes || 0) >= threshold.likes) {
          popularityScore = threshold.score;
          break;
        }
      }
      
      // Calculate quality rating
      let rating = 0;
      if ((stats.total_likes || 0) > 0 && (stats.total_views || 0) > 0) {
        const viewsPerLike = stats.total_views / stats.total_likes;
        rating = Config.ratingThresholds.find(t => viewsPerLike >= t.viewsPerLike)?.score || 5;
      } else if ((stats.total_likes || 0) > 0) {
        rating = 5; // Max rating if likes but no views
      }
      
      // Update the stats display
      await StatsService.updateStatWithPercentile('popularity-count', popularityScore, 'popularity');
      await StatsService.updateStatWithPercentile('rating-count', rating, 'rating');
      
      return stats;
    } catch (error) {
      console.error('Error updating direct stats:', error);
    }
  },
  
  /**
   * Load and display projects
   */
  async loadMoreProjects() {
    try {
      if (AppState.isLoading) return;
      AppState.isLoading = true;
      
      const projectLoadingEl = document.getElementById('projects-loading');
      const loadMoreBtn = document.getElementById('load-more-projects');
      
      projectLoadingEl.style.display = 'block';
      loadMoreBtn.style.display = 'none';
      
      const data = await ApiService.fetchProjects(AppState.projectsAfterCursor);
      AppState.projectsData = AppState.projectsData.concat(data.data);
      
      // Update projects count immediately
      document.getElementById('sites-count').innerHTML = Utils.formatNumber(AppState.projectsData.length);
      
      // Update stats from direct API once we have some projects
      if (AppState.projectsData.length >= Config.initialStatsProjectCount && !AppState.projectsAfterCursor) {
        await this.updateWithDirectStats();
      }
      
      if (data.meta.has_next_page) {
        AppState.projectsAfterCursor = data.meta.end_cursor;
        AppState.isLoading = false;
        
        // Update the UI with what we have so far
        UIService.sortProjects();
        
        // Continue loading more projects
        setTimeout(() => this.loadMoreProjects(), 100);
        return;
      }
      
      // All projects loaded, finalize stats
      const totalProjects = AppState.projectsData.length;
      document.getElementById('sites-count').innerHTML = Utils.formatNumber(totalProjects);
      
      // Update project grid
      UIService.sortProjects();
      projectLoadingEl.style.display = 'none';
      
      // Final stats update from API
      const apiStats = await ApiService.fetchUserStats();
      
      // Combine all user stats
      const userStats = {
        username: AppState.username,
        projects: totalProjects,
        views: apiStats.total_views || 0,
        likes: apiStats.total_likes || 0,
        followers: parseInt(document.getElementById('followers-count').innerText.replace(/[^\d]/g, '')) || 0,
        following: parseInt(document.getElementById('following-count').innerText.replace(/[^\d]/g, '')) || 0,
        friends: parseInt(document.getElementById('friends-count').innerText.replace(/[^\d]/g, '')) || 0,
        popularity: parseInt(document.getElementById('popularity-count').innerText) || 0,
        rating: parseInt(document.getElementById('rating-count').innerText) || 0,
        unposted: parseInt(document.getElementById('unposted-count').innerText.replace(/[^\d]/g, '')) || 0
      };
      
      // Store stats
      await StatsService.storeUserStats(userStats);
      
      // Generate bio text if enabled
      if (Config.enableAutoBio) {
        const bioText = Utils.generateBioText(userStats);
        document.getElementById('description').innerHTML = bioText;
      }
      
      AppState.isLoading = false;
    } catch (error) {
      console.error('Error loading projects:', error);
      document.getElementById('projects-loading').style.display = 'none';
      document.getElementById('description').innerHTML = 'Error loading project data.';
      AppState.isLoading = false;
    }
  },
  
  /**
   * Load and display followers
   */
  async loadMoreFollowers() {
    try {
      const followersGrid = document.getElementById('followers-grid');
      const followersLoading = document.getElementById('followers-loading');
      
      followersLoading.style.display = 'block';
      
      const data = await ApiService.fetchFollowers(AppState.followersAfterCursor);
      
      followersLoading.style.display = 'none';
      
      if (data.data.length === 0) {
        if (followersGrid.children.length === 0) {
          followersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No followers yet!</div>`;
        }
        return;
      }
      
      data.data.forEach(item => {
        const card = UIService.createUserCard(item.user);
        followersGrid.appendChild(card);
      });
      
      if (data.meta.has_next_page) {
        AppState.followersAfterCursor = data.meta.end_cursor;
        // Load more when scrolled to bottom
        const scrollHandler = () => {
          if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            window.removeEventListener('scroll', scrollHandler);
            this.loadMoreFollowers();
          }
        };
        window.addEventListener('scroll', scrollHandler);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
      document.getElementById('followers-loading').style.display = 'none';
    }
  },
  
  /**
   * Load and display following
   */
  async loadMoreFollowing() {
    try {
      const followingGrid = document.getElementById('following-grid');
      const followingLoading = document.getElementById('following-loading');
      
      followingLoading.style.display = 'block';
      
      const data = await ApiService.fetchFollowing(AppState.followingAfterCursor);
      
      followingLoading.style.display = 'none';
      
      if (data.data.length === 0) {
        if (followingGrid.children.length === 0) {
          followingGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Not following anyone yet!</div>`;
        }
        return;
      }
      
      data.data.forEach(item => {
        const card = UIService.createUserCard(item.user);
        followingGrid.appendChild(card);
      });
      
      if (data.meta.has_next_page) {
        AppState.followingAfterCursor = data.meta.end_cursor;
        // Load more when scrolled to bottom
        const scrollHandler = () => {
          if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            window.removeEventListener('scroll', scrollHandler);
            this.loadMoreFollowing();
          }
        };
        window.addEventListener('scroll', scrollHandler);
      }
    } catch (error) {
      console.error('Error loading following:', error);
      document.getElementById('following-loading').style.display = 'none';
    }
  },
  
  /**
   * Find the intersection of followers and following (friends)
   */
  async getFriends() {
    try {
      const friendsGrid = document.getElementById('friends-grid');
      friendsGrid.innerHTML = '';
      
      const friendsLoading = document.getElementById('friends-loading');
      friendsLoading.style.display = 'block';
      
      // Initialize objects to store all followers and following
      let allFollowers = {};
      let allFollowing = {};
      
      // Fetch all followers
      let followersAfter = null;
      let hasMoreFollowers = true;
      
      while (hasMoreFollowers) {
        const followers = await ApiService.fetchFollowers(followersAfter);
        followers.data.forEach(item => {
          allFollowers[item.user.id] = item.user;
        });
        
        hasMoreFollowers = followers.meta.has_next_page;
        followersAfter = followers.meta.end_cursor;
      }
      
      // Fetch all following
      let followingAfter = null;
      let hasMoreFollowing = true;
      
      while (hasMoreFollowing) {
        const following = await ApiService.fetchFollowing(followingAfter);
        following.data.forEach(item => {
          allFollowing[item.user.id] = item.user;
        });
        
        hasMoreFollowing = following.meta.has_next_page;
        followingAfter = following.meta.end_cursor;
      }
      
      // Find intersection (friends)
      let friends = [];
      Object.keys(allFollowers).forEach(userId => {
        if (allFollowing[userId]) {
          friends.push(allFollowers[userId]);
        }
      });
      
      // Update friends count
      document.getElementById('friends-count').innerHTML = Utils.formatNumber(friends.length);
      
      // Generate UI
      friendsLoading.style.display = 'none';
      
      if (friends.length === 0) {
        friendsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No mutual connections yet!</div>`;
        return;
      }
      
      friends.forEach(user => {
        const card = UIService.createUserCard(user);
        friendsGrid.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading friends:', error);
      document.getElementById('friends-loading').style.display = 'none';
      document.getElementById('friends-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Error loading friends data</div>`;
    }
  }
};