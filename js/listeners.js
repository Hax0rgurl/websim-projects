// ===== UI Event Listeners (moved from js/main.js) =====

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

    // --- Visibility Toggle Buttons ---
    const visibilityButtons = document.querySelectorAll('.visibility-button');
    visibilityButtons.forEach(btn => btn.replaceWith(btn.cloneNode(true)));
    document.querySelectorAll('.visibility-button').forEach(button => {
      button.addEventListener('click', async () => {
        if (isLoading) return;
        
        // Update active button
        document.querySelectorAll('.visibility-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Update filter and UI
        const newFilter = button.dataset.filter;
        if (debugMode) console.log(`🔍 Visibility filter button clicked: ${newFilter}`);
        
        if (currentVisibilityFilter !== newFilter) {
          currentVisibilityFilter = newFilter;
          
          // Reset project list and reload
          projectsData = [];
          projectsAfterCursor = null;
          window._hasRetriedPrivateAuth = false; // Reset retry flag
          document.getElementById('projects-grid').innerHTML = '';
          
          // Update UI and fetch new data with the new filter
          updateVisibilityFilterButtons();
          document.getElementById('projects-loading').style.display = 'block';
          
          // CRITICAL: For private projects or drafts, perform thorough auth refresh first
          if (newFilter === 'private' || newFilter === 'all' || newFilter === 'unposted') {
            try {
              if (debugMode) console.log("🔒 Preparing to load protected content");
              
              // Display loading message while we refresh auth
              document.getElementById('projects-grid').innerHTML = 
                '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--neon-primary);">Refreshing authentication...</div>';
              
              // Wait for full auth refresh to complete
              await refreshAuthCookies();
              
              // Brief delay to ensure cookies are fully processed
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
              console.error("Error refreshing auth for private content:", e);
            }
          }
          
          if (debugMode) console.log(`⏳ Loading projects with new filter: ${currentVisibilityFilter}`);
          await loadMoreProjects();
        }
      });
    });

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

    // --- Editable Username ---
    const usernameSpan = document.getElementById('username');
    if (usernameSpan) {
        usernameSpan.addEventListener('blur', async () => {
            const newName = usernameSpan.textContent.trim();
            if (newName && newName !== username) {
                username = newName;
                if (debugMode) console.log("Username edited to:", username);
                await initProfile();
            }
        });
        usernameSpan.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                usernameSpan.blur();
            }
        });
    }

    // --- Modal Close Button ---
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal');
    
    // Fix modal closing - ensure we're using removeEventListener before adding a new one
    const closeModal = () => {
        modalOverlay.classList.remove('active');
        modal.classList.remove('active');
        // Stop iframe content from playing
        const iframe = modal.querySelector('iframe');
        iframe.src = '';
    };
    
    // Remove previous listeners to avoid duplicates
    modalCloseBtn.removeEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    
    // Ensure the overlay click works properly
    modalOverlay.removeEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Add escape key listener for modal
    document.removeEventListener('keydown', closeModalOnEsc);
    document.addEventListener('keydown', closeModalOnEsc);
}

function closeModalOnEsc(e) {
    if (e.key === 'Escape') {
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay.classList.contains('active')) {
            modalOverlay.classList.remove('active');
            document.querySelector('.modal').classList.remove('active');
            const iframe = document.querySelector('.modal iframe');
            if (iframe) iframe.src = '';
        }
    }
}

window.setupActionListeners = setupActionListeners;