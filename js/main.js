// State variables
let username = defaultUsername; // Use default from config
let projectsAfterCursor = null;
let followersAfterCursor = null;
let followingAfterCursor = null;
let currentSort = 'recent';
let projectsData = [];
let isLoading = false;
// Initialize isShowingPrivate based on config and whether it's own profile
let isShowingPrivate = false; // Default will be set properly in initProfile/room init
let currentUser = null;
window.currentUserProfile = null; // Store the profile being viewed

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
      if (debugMode) console.log("Already loading projects, ignoring request");
      return;
    }

    isLoading = true;

    const projectLoadingEl = document.getElementById('projects-loading');
    const loadMoreBtn = document.getElementById('load-more-projects');

    projectLoadingEl.style.display = 'block';
    // loadMoreBtn.style.display = 'none'; // Hide if using a button

    const data = await fetchProjects(projectsAfterCursor);

    if (!data || !data.data) {
        console.error("Received invalid data from fetchProjects");
        isLoading = false;
        projectLoadingEl.style.display = 'none';
        return;
    }

    // Append new projects to existing data
    projectsData = projectsData.concat(data.data);

    // Re-sort and update the grid display *before* potentially heavy stat calculations
    sortProjects();

    // --- Update related stats ---
    // Update project count based on currently *loaded* data first for responsiveness
    // The final accurate count will be set once all projects are loaded.
    let currentVisibleProjectCount = projectsData.length; // Count based on what's fetched so far (respecting filters)
    document.getElementById('sites-count').innerHTML = formatNumber(currentVisibleProjectCount);

    // Update derived stats (like popularity/rating) using direct API data.
    // This is usually done earlier in initProfile, but can be refreshed here if needed,
    // though it's primarily based on total views/likes, not project count itself.
    // await updateWithDirectStats(); // Uncomment if recalculation based on project load is desired

    projectLoadingEl.style.display = 'none'; // Hide loading indicator *after* rendering grid

    if (data.meta && data.meta.has_next_page) {
        projectsAfterCursor = data.meta.end_cursor;
        isLoading = false;

        // Setup infinite scroll
        const scrollHandler = () => {
          // Check if still on projects view before loading more
          const projectsViewActive = document.getElementById('projects-view').style.display !== 'none';
          if (projectsViewActive && !isLoading && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
              window.removeEventListener('scroll', scrollHandler);
              if(debugMode) console.log("Near bottom, loading more projects...");
              loadMoreProjects(); // Recursively load next batch
          } else if (!projectsViewActive) {
              window.removeEventListener('scroll', scrollHandler); // Stop listening if view changed
              if(debugMode) console.log("Projects view inactive, stopping scroll listener.");
          }
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });

    } else {
        // --- All projects loaded ---
        if (debugMode) console.log("All projects loaded.");
        isLoading = false;
        window.removeEventListener('scroll', loadMoreProjects); // Remove scroll listener if any

        // --- Final Stat Calculation and Update ---
        let totalProjectsForStat;
        if (includePrivateInStats && isViewingOwnProfile()) {
            // If showing private and it's own profile, try to get the absolute total count
            try {
                totalProjectsForStat = await countAllProjectsManually(); // Use the helper to count *all* projects regardless of filter
                if (debugMode) console.log("Manually counted total projects for final stat:", totalProjectsForStat);
            } catch (countError) {
                console.error("Error getting final total project count:", countError);
                totalProjectsForStat = projectsData.length; // Fallback to loaded count on error
            }
        } else {
            // Otherwise, the count is simply the number of projects loaded according to filters
            totalProjectsForStat = projectsData.length;
            if (debugMode) console.log("Using loaded project count for final stat:", totalProjectsForStat);
        }
        // Final update for the "Projects" card
        document.getElementById('sites-count').innerHTML = formatNumber(totalProjectsForStat);

        // Fetch latest direct API stats (views, likes) for final calculations
        const finalApiStats = await fetchUserStats();

        // Fetch latest counts for followers/following (might have changed)
        const [finalFollowingCount, finalFollowersCount] = await Promise.all([
            fetchFollowingCount(),
            fetchFollowersCount(),
        ]);
        document.getElementById('following-count').innerHTML = formatNumber(finalFollowingCount);
        document.getElementById('followers-count').innerHTML = formatNumber(finalFollowersCount);

        // Recalculate derived stats based on final direct numbers
        await updateWithDirectStats(); // This recalculates Pop/Quality based on finalApiStats

        // Get counts for Friends and Unposted
        // Note: getFriends recalculates and updates its own count display ('friends-count')
        await getFriends();
        const finalUnpostedCount = await fetchUnpostedProjects();
        await updateStatWithPercentile('unposted-count', finalUnpostedCount, 'unposted');

        // --- Prepare data for Bio and Storage ---
         // Get potentially updated calculated stats from the DOM after updateWithDirectStats/updateStatWithPercentile
        const finalPopularity = parseInt(document.getElementById('popularity-count').innerText.split('/')[0].replace(/[^\d]/g, '')) || 0;
        const finalRating = parseInt(document.getElementById('rating-count').innerText.split('/')[0].replace(/[^\d]/g, '')) || 0;
        const finalFriendsCount = parseInt(document.getElementById('friends-count').innerText.replace(/[^\d]/g, '')) || 0; // Friends count updated by getFriends()


        const userStats = {
            username: username,
            projects: totalProjectsForStat,
            views: finalApiStats.total_views || 0,
            likes: finalApiStats.total_likes || 0,
            followers: finalFollowersCount,
            following: finalFollowingCount,
            friends: finalFriendsCount,
            popularity: finalPopularity,
            rating: finalRating,
            unposted: finalUnpostedCount,
        };
         if(debugMode) console.log("Final User Stats object:", userStats);

        // Store stats if enabled
        await storeUserStats(userStats);

        // Generate bio text if enabled and profile data exists
        if (enableAutoBio && window.currentUserProfile) {
            const bioText = generateBioText(userStats);
            document.getElementById('description').innerHTML = bioText;
        } else if (!window.currentUserProfile) {
             document.getElementById('description').innerHTML = ''; // Clear loading/error text if profile failed
        } else {
             // Bio disabled, ensure description is user's original or empty
             document.getElementById('description').innerHTML = window.currentUserProfile.description || '';
        }
    }

  } catch (error) {
    console.error('Error in loadMoreProjects:', error);
    document.getElementById('projects-loading').style.display = 'none';
    document.getElementById('description').innerHTML = 'Error loading project data.';
    isLoading = false;
  }
}

/** Helper function to count all projects manually if API lacks count=true */
async function countAllProjectsManually() {
    let count = 0;
    let currentCursor = null;
    let hasMore = true;
    const batchCount = 100; // Fetch large batches for counting

    while(hasMore) {
        try {
            const params = new URLSearchParams();
            params.append('first', batchCount.toString());
            if (currentCursor) params.append('after', currentCursor);
            // No 'posted' filter here - we want all

            const response = await fetch(`/api/v1/users/${username}/projects?${params}`);
            if (!response.ok) {
                 console.error("Error counting projects page:", response.status);
                 break; // Stop counting on error
            }
            const data = await response.json();
            count += data.projects.data.length;
            hasMore = data.projects.meta.has_next_page;
            currentCursor = data.projects.meta.end_cursor;

            if (!hasMore || data.projects.data.length === 0) {
                break;
            }
        } catch (e) {
            console.error("Exception during manual project count:", e);
            break; // Stop counting on error
        }
    }
    return count;
}


/**
 * Initialize the user profile page
 */
async function initProfile() {
  try {
    // Clear previous profile state immediately
    document.getElementById('username').textContent = '';
    document.getElementById('avatar').src = '';
    document.getElementById('description').innerHTML = loadingText; // Show loading for bio
    document.querySelector('.username-hint').classList.add('hidden');
    resetStatsToLoading();
    window.currentUserProfile = null; // Clear old profile data
    projectsData = []; // Clear project data
    projectsAfterCursor = null;
    followersAfterCursor = null;
    followingAfterCursor = null;
    isLoading = false; // Reset loading flag
    document.getElementById('projects-grid').innerHTML = ''; // Clear grids
    document.getElementById('followers-grid').innerHTML = '';
    document.getElementById('following-grid').innerHTML = '';
    document.getElementById('friends-grid').innerHTML = '';
    document.querySelectorAll('.view-content').forEach(v => v.style.display = 'none'); // Hide all views
    document.getElementById('projects-view').style.display = 'block'; // Show projects view by default
    document.querySelectorAll('.view-button').forEach(b => b.classList.remove('active'));
    document.querySelector('.view-button[data-view="projects"]').classList.add('active');
    document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
    document.querySelector('.sort-button[data-sort="recent"]').classList.add('active');
    currentSort = 'recent';


    // Determine initial private state *after* fetching current user
    // This happens in the room.initialize().then() block now

    const user = await fetchUserProfile(); // Fetches profile for 'username' state var
    if (!user) {
      document.getElementById('description').innerHTML = 'Error: User not found.';
      // Clear loading spinners from stats
      document.querySelectorAll('.stat-card .value').forEach(el => {
          if (el.contains(el.querySelector('.loading-spinner'))) {
              el.innerHTML = 'N/A';
          }
      });
      return;
    }

    window.currentUserProfile = user; // Store the fetched profile data globally
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

    // Set the correct initial state for the private toggle *after* knowing if it's own profile
    if (isViewingOwnProfile()) {
        isShowingPrivate = showOwnPrivateByDefault;
         if(debugMode) console.log("Setting initial isShowingPrivate for own profile:", isShowingPrivate);
    } else {
        isShowingPrivate = showPrivateByDefault;
         if(debugMode) console.log("Setting initial isShowingPrivate for other profile:", isShowingPrivate);
    }
    updatePrivateToggleState(); // Update button based on initial state


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

// Centralized function to setup listeners
function setupActionListeners() {
    // --- Sort Buttons ---
    const sortButtons = document.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        // Remove old listener before adding new one to prevent duplicates
        button.replaceWith(button.cloneNode(true));
    });
    // Re-query after cloning
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', () => {
            if (isLoading) return; // Don't sort while loading
            document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentSort = button.dataset.sort;
            if(debugMode) console.log("Sort changed to:", currentSort);
            sortProjects(); // Re-sort and display existing data
        });
    });

    // --- Visibility Toggle ---
    setupPrivateToggle(); // This handles its own listener replacement

    // --- View Buttons ---
    const viewButtons = document.querySelectorAll('.view-button');
     viewButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });
     document.querySelectorAll('.view-button').forEach(button => {
        button.addEventListener('click', async () => {
            if (isLoading) return; // Prevent switching views while loading
            document.querySelectorAll('.view-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            document.querySelectorAll('.view-content').forEach(view => {
                view.style.display = 'none';
            });

            const viewType = button.dataset.view;
            const viewElement = document.getElementById(`${viewType}-view`);
            viewElement.style.display = 'block';

            if(debugMode) console.log("Switched to view:", viewType);

            // Load data for the view if it hasn't been loaded yet
            if (viewType === 'followers' && document.getElementById('followers-grid').children.length === 0) {
                followersAfterCursor = null; // Reset cursor for fresh load
                await loadMoreFollowers();
            } else if (viewType === 'following' && document.getElementById('following-grid').children.length === 0) {
                 followingAfterCursor = null; // Reset cursor
                await loadMoreFollowing();
            } else if (viewType === 'friends' && document.getElementById('friends-grid').children.length === 0) {
                await getFriends();
            }
        });
    });

    // --- Search ---
    const searchInput = document.getElementById('user-search');
    const searchToggle = document.getElementById('search-toggle');
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
      isShowingPrivate = showOwnPrivateByDefault;
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