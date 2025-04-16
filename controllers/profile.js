/**
 * ProfileController - Manages profile initialization and event binding
 */
const ProfileController = {
  /**
   * Set up event handlers for UI interactions
   */
  setupEventHandlers() {
    // Set up event listeners for sort buttons
    document.querySelectorAll('.sort-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        AppState.currentSort = button.dataset.sort;
        UIService.sortProjects();
      });
    });
    
    // Set up event listeners for view buttons
    document.querySelectorAll('.view-button').forEach(button => {
      button.addEventListener('click', async () => {
        document.querySelectorAll('.view-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        document.querySelectorAll('.view-content').forEach(view => {
          view.style.display = 'none';
        });
        
        const viewType = button.dataset.view;
        const viewElement = document.getElementById(`${viewType}-view`);
        viewElement.style.display = 'block';
        
        if (viewType === 'followers' && !AppState.followersAfterCursor) {
          await DataController.loadMoreFollowers();
        } else if (viewType === 'following' && !AppState.followingAfterCursor) {
          await DataController.loadMoreFollowing();
        } else if (viewType === 'friends') {
          await DataController.getFriends();
        }
      });
    });
    
    // Set up search functionality
    const searchInput = document.getElementById('user-search');
    searchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const newUsername = searchInput.value.trim();
        if (newUsername && newUsername !== AppState.username) {
          AppState.setUsername(newUsername);
          await this.initProfile();
          searchInput.value = '';
        }
      }
    });
    
    const searchToggle = document.getElementById('search-toggle');
    searchToggle.addEventListener('click', async () => {
      const searchInput = document.getElementById('user-search');
      const newUsername = searchInput.value.trim();
      if (newUsername && newUsername !== AppState.username) {
        AppState.setUsername(newUsername);
        await this.initProfile();
        searchInput.value = '';
      }
    });
    
    // Set up modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
      document.querySelector('.modal-overlay').classList.remove('active');
      document.querySelector('.modal').classList.remove('active');
      setTimeout(() => {
        document.querySelector('.modal iframe').src = '';
      }, 300);
    });
  },
  
  /**
   * Initialize the user profile page
   */
  async initProfile() {
    try {
      document.querySelector('.username-hint').classList.add('hidden');
      UIService.resetStatsToLoading();
      
      const user = await ApiService.fetchUserProfile();
      if (!user) {
        document.getElementById('description').innerHTML = 'Error: User not found.';
        return;
      }
      
      AppState.currentUserProfile = user;
      document.getElementById('username').textContent = user.username;
      document.getElementById('avatar').src = user.avatar_url || '';
      document.getElementById('avatar').onerror = function() {
        this.src = 'https://images.websim.ai/avatar/anonymous';
      };
      
      BackgroundAnimation.init();
      
      // Update joined date
      const joinedEl = document.getElementById('joined-count');
      joinedEl.className = 'value joined';
      const joinedDate = new Date(user.created_at);
      joinedEl.innerHTML = `
        <div>${Utils.getRelativeTimeString(joinedDate)}</div>
        <div class="ago">ago</div>
      `;
      
      // Get initial counts directly from API
      const [followingCount, followersCount, stats] = await Promise.all([
        ApiService.fetchFollowingCount(),
        ApiService.fetchFollowersCount(),
        ApiService.fetchUserStats()
      ]);
      
      document.getElementById('following-count').innerHTML = Utils.formatNumber(followingCount || 0);
      document.getElementById('followers-count').innerHTML = Utils.formatNumber(followersCount || 0);
      document.getElementById('views-count').innerHTML = Utils.formatNumber(stats.total_views || 0);
      document.getElementById('likes-count').innerHTML = Utils.formatNumber(stats.total_likes || 0);
      
      // Reset project data
      AppState.projectsData = [];
      AppState.projectsAfterCursor = null;
      
      // Fetch all data concurrently
      Promise.allSettled([
        ApiService.fetchRecentFollower(),
        DataController.loadMoreProjects(),
        ApiService.fetchUnpostedProjects().then(unpostedCount => {
          StatsService.updateStatWithPercentile('unposted-count', unpostedCount, 'unposted');
        })
      ]).then(results => {
        results.forEach(result => {
          if (result.status === 'rejected') {
            console.error('Error during concurrent data loading:', result.reason);
          }
        });
      });
    } catch (error) {
      console.error('Error initializing profile:', error);
      document.getElementById('description').innerHTML = 'Error loading profile data.';
    }
  },
  
  /**
   * Initialize the application
   */
  async init() {
    this.setupEventHandlers();
    document.querySelector('.username-hint').classList.remove('hidden');
    
    // Initialize the profile once WebsimSocket is ready
    await room.initialize();
    await this.initProfile();
  }
};