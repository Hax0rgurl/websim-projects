// State variables
let username = 'abandonedmuse';
let projectsAfterCursor = null;
let followersAfterCursor = null;
let followingAfterCursor = null;
let currentSort = 'recent';
let projectsData = [];
let isLoading = false;
let isShowingPrivate = false;
let currentUser = null;

/**
 * Find the intersection of followers and following (friends)
 */
async function getFriends() {
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
      const followers = await fetchFollowers(followersAfter);
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
      const following = await fetchFollowing(followingAfter);
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
    document.getElementById('friends-count').innerHTML = formatNumber(friends.length);
    
    // Generate UI
    friendsLoading.style.display = 'none';
    
    if (friends.length === 0) {
      friendsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No mutual connections yet!</div>`;
      return;
    }
    
    friends.forEach(user => {
      const card = createUserCard(user);
      friendsGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading friends:', error);
    document.getElementById('friends-loading').style.display = 'none';
    document.getElementById('friends-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Error loading friends data</div>`;
  }
}

/**
 * Load and display followers
 */
async function loadMoreFollowers() {
  try {
    const followersGrid = document.getElementById('followers-grid');
    const followersLoading = document.getElementById('followers-loading');
    
    followersLoading.style.display = 'block';
    
    const data = await fetchFollowers(followersAfterCursor);
    
    followersLoading.style.display = 'none';
    
    if (data.data.length === 0) {
      if (followersGrid.children.length === 0) {
        followersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No followers yet!</div>`;
      }
      return;
    }
    
    data.data.forEach(item => {
      const card = createUserCard(item.user);
      followersGrid.appendChild(card);
    });
    
    if (data.meta.has_next_page) {
      followersAfterCursor = data.meta.end_cursor;
      // Load more when scrolled to bottom
      const scrollHandler = () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
          window.removeEventListener('scroll', scrollHandler);
          loadMoreFollowers();
        }
      };
      window.addEventListener('scroll', scrollHandler);
    }
  } catch (error) {
    console.error('Error loading followers:', error);
    document.getElementById('followers-loading').style.display = 'none';
  }
}

/**
 * Load and display following
 */
async function loadMoreFollowing() {
  try {
    const followingGrid = document.getElementById('following-grid');
    const followingLoading = document.getElementById('following-loading');
    
    followingLoading.style.display = 'block';
    
    const data = await fetchFollowing(followingAfterCursor);
    
    followingLoading.style.display = 'none';
    
    if (data.data.length === 0) {
      if (followingGrid.children.length === 0) {
        followingGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Not following anyone yet!</div>`;
      }
      return;
    }
    
    data.data.forEach(item => {
      const card = createUserCard(item.user);
      followingGrid.appendChild(card);
    });
    
    if (data.meta.has_next_page) {
      followingAfterCursor = data.meta.end_cursor;
      // Load more when scrolled to bottom
      const scrollHandler = () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
          window.removeEventListener('scroll', scrollHandler);
          loadMoreFollowing();
        }
      };
      window.addEventListener('scroll', scrollHandler);
    }
  } catch (error) {
    console.error('Error loading following:', error);
    document.getElementById('following-loading').style.display = 'none';
  }
}

/**
 * Load and process all projects for a user
 */
async function loadMoreProjects() {
  try {
    if (isLoading) {
      console.log("Already loading projects, ignoring request");
      return;
    }
    
    isLoading = true;
    
    const projectLoadingEl = document.getElementById('projects-loading');
    const loadMoreBtn = document.getElementById('load-more-projects');
    
    projectLoadingEl.style.display = 'block';
    loadMoreBtn.style.display = 'none';
    
    const data = await fetchProjects(projectsAfterCursor);
    projectsData = projectsData.concat(data.data);
    
    // Update projects count immediately
    document.getElementById('sites-count').innerHTML = formatNumber(projectsData.length);
    
    // Update stats from direct API once we have some projects
    if (projectsData.length >= 10 && !projectsAfterCursor) {
      await updateWithDirectStats();
    }
    
    if (data.meta.has_next_page) {
      projectsAfterCursor = data.meta.end_cursor;
      isLoading = false;
      
      // Update the UI with what we have so far
      sortProjects();
      
      // Continue loading more projects
      setTimeout(() => loadMoreProjects(), 100);
      return;
    }
    
    // All projects loaded, finalize stats
    const totalProjects = projectsData.length;
    document.getElementById('sites-count').innerHTML = formatNumber(totalProjects);
    
    // Update project grid
    sortProjects();
    projectLoadingEl.style.display = 'none';
    
    // Final stats update from API
    const apiStats = await fetchUserStats();
    
    // Combine all user stats
    const userStats = {
      username: username,
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
    await storeUserStats(userStats);
    
    // Generate bio text if enabled
    if (true) {
      const bioText = generateBioText(userStats);
      document.getElementById('description').innerHTML = bioText;
    }
    
    isLoading = false;
  } catch (error) {
    console.error('Error loading projects:', error);
    document.getElementById('projects-loading').style.display = 'none';
    document.getElementById('description').innerHTML = 'Error loading project data.';
    isLoading = false;
  }
}

/**
 * Initialize the user profile page
 */
async function initProfile() {
  try {
    document.querySelector('.username-hint').classList.add('hidden');
    resetStatsToLoading();
    
    const user = await fetchUserProfile();
    if (!user) {
      document.getElementById('description').innerHTML = 'Error: User not found.';
      return;
    }
    
    window.currentUserProfile = user;
    document.getElementById('username').textContent = user.username;
    document.getElementById('avatar').src = user.avatar_url || '';
    document.getElementById('avatar').onerror = function() {
      this.src = 'https://images.websim.ai/avatar/anonymous';
    };
    
    // Update joined date
    const joinedEl = document.getElementById('joined-count');
    joinedEl.className = 'value joined';
    const joinedDate = new Date(user.created_at);
    joinedEl.innerHTML = `
      <div>${getRelativeTimeString(joinedDate)}</div>
      <div class="ago">ago</div>
    `;
    
    // Get initial counts directly from API
    const [followingCount, followersCount, stats] = await Promise.all([
      fetchFollowingCount(),
      fetchFollowersCount(),
      fetchUserStats()
    ]);
    
    document.getElementById('following-count').innerHTML = formatNumber(followingCount || 0);
    document.getElementById('followers-count').innerHTML = formatNumber(followersCount || 0);
    document.getElementById('views-count').innerHTML = formatNumber(stats.total_views || 0);
    document.getElementById('likes-count').innerHTML = formatNumber(stats.total_likes || 0);
    
    // Reset project data
    projectsData = [];
    projectsAfterCursor = null;
    
    // Update visibility toggle button state
    updatePrivateToggleState();
    
    // Fetch all data concurrently
    Promise.allSettled([
      fetchRecentFollower(),
      loadMoreProjects(),
      fetchUnpostedProjects().then(unpostedCount => {
        updateStatWithPercentile('unposted-count', unpostedCount, 'unposted');
      })
    ]).then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.error('Error during concurrent data loading:', result.reason);
        }
      });
    });
    
    // Set up event listeners for sort buttons
    document.querySelectorAll('.sort-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        currentSort = button.dataset.sort;
        sortProjects();
      });
    });
    
    // Set up event listener for visibility toggle
    setupPrivateToggle();
    
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
        
        if (viewType === 'followers' && !followersAfterCursor) {
          await loadMoreFollowers();
        } else if (viewType === 'following' && !followingAfterCursor) {
          await loadMoreFollowing();
        } else if (viewType === 'friends') {
          await getFriends();
        }
      });
    });
    
    // Set up search functionality
    const searchInput = document.getElementById('user-search');
    searchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const newUsername = searchInput.value.trim();
        if (newUsername && newUsername !== username) {
          username = newUsername;
          await initProfile();
          searchInput.value = '';
        }
      }
    });
    
    const searchToggle = document.getElementById('search-toggle');
    searchToggle.addEventListener('click', async () => {
      const newUsername = searchInput.value.trim();
      if (newUsername && newUsername !== username) {
        username = newUsername;
        await initProfile();
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
  } catch (error) {
    console.error('Error initializing profile:', error);
    document.getElementById('description').innerHTML = 'Error loading profile data.';
  }
}

// Initialize the profile page
document.querySelector('.username-hint').classList.remove('hidden');

// Wait for WebsimSocket to initialize
room.initialize().then(async () => {
  // Get current user first, before loading the profile
  try {
    currentUser = await window.websim.getUser();
    console.log("Current user:", currentUser);
    
    // If we're viewing our own profile, we can enable private projects by default
    if (currentUser && currentUser.username === username) {
      isShowingPrivate = true;
      console.log("Showing private projects by default (own profile)");
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  
  initProfile();
});

// Set up search functionality
document.getElementById('user-search').addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const newUsername = e.target.value.trim();
    if (newUsername && newUsername !== username) {
      username = newUsername;
      await initProfile();
      e.target.value = '';
    }
  }
});