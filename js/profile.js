// ===== Profile Initialization =====

async function initProfile() {
  try {
    // --- Reset UI State ---
    document.getElementById('username').textContent = '';
    document.getElementById('avatar').src = '';
    document.getElementById('description').innerHTML = loadingText;
    document.querySelector('.username-hint').classList.add('hidden');
    resetStatsToLoading(); // Sets loading spinners
    window.currentUserProfile = null;
    projectsData = [];
    projectsAfterCursor = null;
    followersAfterCursor = null;
    followingAfterCursor = null;
    isLoading = false;
    document.getElementById('projects-grid').innerHTML = '';
    document.getElementById('followers-grid').innerHTML = '';
    document.getElementById('following-grid').innerHTML = '';
    document.getElementById('friends-grid').innerHTML = '';
    document.querySelectorAll('.view-content').forEach(v => v.style.display = 'none');
    document.getElementById('projects-view').style.display = 'block';
    document.querySelectorAll('.view-button').forEach(b => b.classList.remove('active'));
    document.querySelector('.view-button[data-view="projects"]').classList.add('active');
    document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
    document.querySelector('.sort-button[data-sort="recent"]').classList.add('active');
    currentSort = 'recent';
    // Reset visibility filter controls (will be set correctly below)
    document.getElementById('visibility-filter-controls').style.display = 'none';
    document.querySelectorAll('.visibility-button').forEach(b => b.classList.remove('active'));

    // --- Fetch User Profile ---
    const user = await fetchUserProfile();
    if (!user) {
      document.getElementById('description').innerHTML = 'Error: User not found.';
      document.querySelectorAll('.stat-card .value').forEach(el => {
          if (el.innerHTML.includes('spinner')) el.innerHTML = 'N/A';
      });
      return;
    }
    window.currentUserProfile = user;

    // --- Determine visibility filter for this profile view ---
    if (isViewingOwnProfile()) {
      currentVisibilityFilter = initialOwnVisibilityFilter;    // usually 'all'
    } else {
      currentVisibilityFilter = initialOtherVisibilityFilter;  // usually 'public'
    }
    // Let the UI adjust controls once projects load
    // (loadMoreProjects will call updateVisibilityFilterButtons after data arrives)

    // --- Update Header ---
    document.getElementById('username').textContent = user.username;
    document.getElementById('avatar').src = user.avatar_url || '';
    document.getElementById('avatar').onerror = function() {
      this.src = 'https://images.websim.ai/avatar/anonymous';
    };
    // Restore user description if auto-bio is off or fails
    if (!enableAutoBio) {
        document.getElementById('description').innerHTML = user.description || '';
    }

    // --- Update Joined Date ---
    const joinedEl = document.getElementById('joined-count');
    // Display relative join date
    if (user.created_at) {
      joinedEl.classList.add('joined');
      joinedEl.innerHTML = `${getRelativeTimeString(user.created_at)}<div class="ago"> ago</div>`;
    } else {
      joinedEl.innerHTML = 'N/A';
    }
    
    // Fetch initial counts and stats
    const [followingCount, followersCount, statsData] = await Promise.all([
      fetchFollowingCount(),
      fetchFollowersCount(),
      fetchUserStats() // Direct views/likes
    ]);

    document.getElementById('following-count').innerHTML = formatNumber(followingCount || 0);
    document.getElementById('followers-count').innerHTML = formatNumber(followersCount || 0);
    document.getElementById('views-count').innerHTML = formatNumber(statsData.total_views || 0);
    document.getElementById('likes-count').innerHTML = formatNumber(statsData.total_likes || 0);

    // Calculate initial popularity/rating based on direct stats
    await updateWithDirectStats(); // This updates pop/rating elements

    // Kick off friends count early (fills friends-count)
    getFriends();

    // Fetch remaining data concurrently
    Promise.allSettled([
      fetchRecentFollower(),
      loadMoreProjects(), // This will now use the correct initial isShowingPrivate state
      fetchUnpostedProjects().then(unpostedCount => {
        updateStatWithPercentile('unposted-count', unpostedCount, 'unposted');
      })
    ]).then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.error('Error during initial concurrent data loading:', result.reason);
        }
      });
       if(debugMode) console.log("Initial concurrent data load finished.");
       // Potentially update bio here if it depends only on initial loads
       // generateBioText might need more data from loadMoreProjects completion
    });

    // Setup listeners (ensure they are only added once or are idempotent)
    setupActionListeners();

  } catch (error) {
    console.error('Error initializing profile:', error);
    document.getElementById('description').innerHTML = 'Error loading profile data.';
     // Clear loading spinners from stats
      document.querySelectorAll('.stat-card .value').forEach(el => {
          if (el.contains(el.querySelector('.loading-spinner'))) {
              el.innerHTML = 'Error';
          }
      });
  }
}

window.initProfile = initProfile;