// ===== Data Loading Functions (moved from js/main.js) =====

/**
 * Fetch and append more followers into the followers-view
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
 * Fetch and append more following into the following-view
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
 * Find mutual followers & following ("friends") and render them
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
        if (item && item.user) { 
          allFollowers[item.user.id] = item.user;
        }
      });
      
      hasMoreFollowers = followers.meta.has_next_page;
      followersAfter = followers.meta.end_cursor;
      
      // Limit the number of API calls to prevent infinite loops
      if (Object.keys(allFollowers).length > 1000) {
        console.warn("Too many followers, stopping loop");
        break;
      }
    }
    
    // Fetch all following
    let followingAfter = null;
    let hasMoreFollowing = true;
    
    while (hasMoreFollowing) {
      const following = await fetchFollowing(followingAfter);
      following.data.forEach(item => {
        if (item && item.user) { 
          allFollowing[item.user.id] = item.user;
        }
      });
      
      hasMoreFollowing = following.meta.has_next_page;
      followingAfter = following.meta.end_cursor;
      
      // Limit the number of API calls
      if (Object.keys(allFollowing).length > 1000) {
        console.warn("Too many following, stopping loop");
        break;
      }
    }
    
    // Find intersection (friends)
    let friends = [];
    Object.keys(allFollowers).forEach(userId => {
      if (allFollowing[userId]) {
        friends.push(allFollowers[userId]);
      }
    });
    
    // Update friends count 
    const friendsCount = friends.length || 0;
    document.getElementById('friends-count').innerHTML = formatNumber(friendsCount);
    
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
    document.getElementById('friends-count').innerHTML = formatNumber(0);
    document.getElementById('friends-grid').innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">Error loading friends data</div>`;
  }
}

/**
 * Load next batch of projects based on current visibility & sorting
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
    // loadMoreBtn.style.display = 'none';

    // Fetch projects using the current visibility filter
    const data = await fetchProjects(projectsAfterCursor);

    if (!data || !data.data) {
        console.error("Received invalid data from fetchProjects");
        isLoading = false;
        projectLoadingEl.style.display = 'none';
        return;
    }

    // Append new projects to existing data
    projectsData = projectsData.concat(data.data);

    // Re-sort and update the grid display
    sortProjects();

    // Update project count stat to reflect the *currently loaded* count for the active filter
    document.getElementById('sites-count').innerHTML = formatNumber(projectsData.length);
    // Update the label in case it wasn't updated by button click (e.g., initial load)
    updateVisibilityFilterButtons();


    projectLoadingEl.style.display = 'none'; // Hide loading indicator *after* rendering grid

    if (data.meta && data.meta.has_next_page) {
        projectsAfterCursor = data.meta.end_cursor;
        isLoading = false;

        // Setup infinite scroll
        const scrollHandler = () => {
          const projectsViewActive = document.getElementById('projects-view').style.display !== 'none';
          if (projectsViewActive && !isLoading && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
              window.removeEventListener('scroll', scrollHandler);
              if(debugMode) console.log("Near bottom, loading more projects...");
              loadMoreProjects();
          } else if (!projectsViewActive) {
              window.removeEventListener('scroll', scrollHandler);
              if(debugMode) console.log("Projects view inactive, stopping scroll listener.");
          }
        };
        // Add listener with passive option for better performance
        window.addEventListener('scroll', scrollHandler, { passive: true });

    } else {
        // --- All projects loaded for the current filter ---
        if (debugMode) console.log(`All projects loaded for filter '${currentVisibilityFilter}'. Final count: ${projectsData.length}`);
        isLoading = false;
        // Note: scroll listener might already be removed if we reached here via the scroll handler itself

        // --- Final Stat Update for this view ---
        // The "Projects" count card already reflects the final count for the current filter.
        document.getElementById('sites-count').innerHTML = formatNumber(projectsData.length);


        // We only need to recalculate *other* stats if this is the *very first* full load sequence
        // Check if other core stats are still showing loading spinners
        const needsFullStatUpdate = document.getElementById('views-count').innerHTML.includes('spinner');

        if (needsFullStatUpdate) {
             if (debugMode) console.log("Performing final full stat update sequence...");
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
            await getFriends(); // Updates 'friends-count' internally
            const finalUnpostedCount = await fetchUnpostedProjects();
            await updateStatWithPercentile('unposted-count', finalUnpostedCount, 'unposted');


            // --- Prepare data for Bio and Storage ---
            const finalPopularity = parseInt(document.getElementById('popularity-count').innerText.split('/')[0].replace(/[^\d]/g, '')) || 0;
            const finalRating = parseInt(document.getElementById('rating-count').innerText.split('/')[0].replace(/[^\d]/g, '')) || 0;
            const finalFriendsCount = parseInt(document.getElementById('friends-count').innerText.replace(/[^\d]/g, '')) || 0;

             // Use the project count relevant to the *initial* filter state for bio/storage?
             // Or should it always be total? Let's use the total count if possible for storage.
             let totalProjectsForStorage = projectsData.length; // Default to filtered count
             if (isViewingOwnProfile()) {
                 try {
                     totalProjectsForStorage = await countAllProjectsManually(); // Get total for storage/bio
                      if (debugMode) console.log("Using manually counted total projects for storage/bio:", totalProjectsForStorage);
                 } catch (countError) {
                     console.error("Error getting total project count for storage:", countError);
                     // Fallback to loaded count
                 }
             }


            const userStats = {
                username: username,
                projects: totalProjectsForStorage, // Store total count if possible
                views: finalApiStats.total_views || 0,
                likes: finalApiStats.total_likes || 0,
                followers: finalFollowersCount,
                following: finalFollowingCount,
                friends: finalFriendsCount,
                popularity: finalPopularity,
                rating: finalRating,
                unposted: finalUnpostedCount,
            };
             if(debugMode) console.log("Final User Stats object for storage:", userStats);

            // Store stats if enabled
            await storeUserStats(userStats);

            // Generate bio text if enabled and profile data exists
            if (enableAutoBio && window.currentUserProfile) {
                // Pass the stats object with the potentially total project count
                const bioText = generateBioText(userStats);
                document.getElementById('description').innerHTML = bioText;
            } else if (!window.currentUserProfile) {
                 document.getElementById('description').innerHTML = ''; // Clear loading/error text if profile failed
            } else {
                 // Bio disabled, ensure description is user's original or empty
                 document.getElementById('description').innerHTML = window.currentUserProfile.description || '';
            }

        } else {
             if (debugMode) console.log("Skipping full stat update sequence as initial load seems complete.");
        }


    }

  } catch (error) {
    console.error('Error in loadMoreProjects:', error);
    document.getElementById('projects-loading').style.display = 'none';
    document.getElementById('description').innerHTML = 'Error loading project data.';
    isLoading = false;
  }
}


/** Helper to count ALL projects manually for storage/bio */
async function countAllProjectsManually() {
    // Only run if viewing own profile, otherwise return 0 or error?
    if (!isViewingOwnProfile()) {
        console.warn("Attempted to count all projects manually for another user. Returning 0.");
        return 0;
    }

    let count = 0;
    let currentCursor = null;
    let hasMore = true;
    const batchCount = 100; // Fetch large batches for counting

    if (debugMode) console.log("Starting manual count of ALL projects...");

    while(hasMore) {
        try {
            const params = new URLSearchParams();
            params.append('first', batchCount.toString());
            if (currentCursor) params.append('after', currentCursor);
            // NO 'posted' filter here - we want all projects for the owner

            const response = await fetch(`/api/v1/users/${username}/projects?${params}`, {
                credentials: 'include' // Add credentials for authorization
            });
            
            if (!response.ok) {
                 console.error("Error counting projects page:", response.status);
                 // Return current count on error? Or throw? Let's return current count.
                 console.warn(`Manual count stopped due to error. Partial count: ${count}`);
                 return count;
            }
            const data = await response.json();
            const projectsOnPage = data.projects.data.length;
            count += projectsOnPage;
            hasMore = data.projects.meta.has_next_page;
            currentCursor = data.projects.meta.end_cursor;

            if (debugMode) console.log(`Manual count: Fetched ${projectsOnPage}, total so far: ${count}, hasMore: ${hasMore}`);


            if (!hasMore || projectsOnPage === 0) {
                break; // Exit loop if no more pages or page is empty
            }
             // Safety break to prevent infinite loops in unexpected scenarios
            if (count > 5000) { // Arbitrary limit
                console.warn("Manual project count exceeded 5000, stopping loop.");
                break;
            }

        } catch (e) {
            console.error("Exception during manual project count:", e);
            console.warn(`Manual count stopped due to exception. Partial count: ${count}`);
            return count; // Return current count on exception
        }
    }
     if (debugMode) console.log("Finished manual count of ALL projects. Total:", count);
    return count;
}