// ===== UI Event Listeners (moved from js/main.js) =====

function setupActionListeners() {
    // --- Sort Buttons ---
    const sortButtonsContainer = document.querySelector('.project-sort-controls');
    if (sortButtonsContainer) {
        sortButtonsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('sort-button')) {
                if (isLoading) return; // Don't sort while loading
                document.querySelectorAll('.sort-button').forEach(b => b.classList.remove('active'));
                event.target.classList.add('active');
                currentSort = event.target.dataset.sort;
                if (debugMode) console.log("Sort changed to:", currentSort);
                sortProjects(); // Re-sort and display existing data
            }
        });
    } else {
        console.warn("Sort buttons container not found.");
    }


    // --- Visibility Toggle Buttons ---
    const visibilityButtonsContainer = document.getElementById('visibility-filter-controls');
    if (visibilityButtonsContainer) {
        visibilityButtonsContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('visibility-button')) {
                if (isLoading) return;
                currentVisibilityFilter = event.target.dataset.filter;
                if (debugMode) console.log("Visibility filter changed to:", currentVisibilityFilter);
                document.querySelectorAll('.visibility-button').forEach(b => b.classList.remove('active'));
                event.target.classList.add('active');
                // Reset project list and reload
                projectsData = [];
                projectsAfterCursor = null;
                document.getElementById('projects-grid').innerHTML = '';
                updateVisibilityFilterButtons(); // Update label immediately
                await loadMoreProjects();
            }
        });
    } else {
        console.warn("Visibility buttons container not found.");
    }


    // --- View Buttons ---
    const viewButtonsContainer = document.querySelector('.content-section > .sort-controls');
    if (viewButtonsContainer) {
        viewButtonsContainer.addEventListener('click', async (event) => {
            if (event.target.classList.contains('view-button')) {
                if (isLoading) return; // Prevent switching views while loading
                document.querySelectorAll('.view-button').forEach(b => b.classList.remove('active'));
                event.target.classList.add('active');

                document.querySelectorAll('.view-content').forEach(view => {
                    view.style.display = 'none';
                });

                const viewType = event.target.dataset.view;
                const viewElement = document.getElementById(`${viewType}-view`);
                if (viewElement) {
                    viewElement.style.display = 'block';
                } else {
                    console.error(`View element not found for type: ${viewType}`);
                    return;
                }


                if (debugMode) console.log("Switched to view:", viewType);

                // Load data for the view if it hasn't been loaded yet or needs refresh
                try {
                    if (viewType === 'followers') {
                        const grid = document.getElementById('followers-grid');
                        if (!grid.dataset.loaded) { // Check if loaded before
                            followersAfterCursor = null; // Reset cursor for fresh load
                            grid.innerHTML = ''; // Clear previous potentially incomplete load
                            await loadMoreFollowers();
                            grid.dataset.loaded = true; // Mark as loaded
                        }
                    } else if (viewType === 'following') {
                        const grid = document.getElementById('following-grid');
                        if (!grid.dataset.loaded) {
                            followingAfterCursor = null; // Reset cursor
                            grid.innerHTML = '';
                            await loadMoreFollowing();
                            grid.dataset.loaded = true;
                        }
                    } else if (viewType === 'friends') {
                        const grid = document.getElementById('friends-grid');
                        if (!grid.dataset.loaded) {
                            grid.innerHTML = '';
                            await getFriends(); // Friends calculation involves fetching all, so it's always a "full" load
                            grid.dataset.loaded = true;
                        }
                    } else if (viewType === 'projects') {
                        // Project view is handled by visibility/sort buttons, no extra load needed here
                        // Ensure scroll listener is reattached if needed
                        attachProjectScrollListener();
                    }
                } catch (loadError) {
                    console.error(`Error loading data for view ${viewType}:`, loadError);
                    const errorGrid = document.getElementById(`${viewType}-grid`);
                    if (errorGrid) errorGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--neon-primary);">Error loading data.</div>`;
                }
            }
        });
    } else {
        console.warn("View buttons container not found.");
    }


    // --- Modal Close Button ---
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');

    const closeModal = () => {
        const modal = document.querySelector('.modal'); // Get modal element inside function
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
        // Stop iframe content from playing
        const iframe = modal?.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank'; // More reliable way to clear content
        }
        if (debugMode) console.log("Modal closed");
    };

    // Ensure listeners are added only once or removed properly
    if (modalCloseBtn && modalOverlay) {
        // Use unique function references or flags if needed, but direct assignment might be okay if setupActionListeners isn't called excessively
        modalCloseBtn.onclick = closeModal; // Assign directly
        modalOverlay.onclick = function (e) { // Assign directly
            if (e.target === modalOverlay) {
                closeModal();
            }
        };
    } else {
        console.warn("Modal close button or overlay not found.");
    }

    // Add escape key listener for modal - use keydown for Escape
    document.removeEventListener('keydown', closeModalOnEsc); // Ensure old listener is removed
    document.addEventListener('keydown', closeModalOnEsc);
}

// Separate function for the Escape key listener
function closeModalOnEsc(e) {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
        // Call the same close logic
        const modal = document.querySelector('.modal');
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (modal) modal.classList.remove('active');
        const iframe = modal?.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
        }
        if (debugMode) console.log("Modal closed via Escape key");
    }
}


// Helper to attach scroll listener for projects view
function attachProjectScrollListener() {
    // Remove existing listener first to prevent duplicates
    window.removeEventListener('scroll', projectScrollHandler);
    // Add listener with passive option for better performance
    window.addEventListener('scroll', projectScrollHandler, { passive: true });
    if (debugMode) console.log("Attached project scroll listener.");
}

// Define the scroll handler function separately
const projectScrollHandler = () => {
    const projectsViewActive = document.getElementById('projects-view')?.style.display !== 'none';
    // Check if near bottom, projects view is active, and not currently loading
    if (projectsViewActive && !isLoading && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        window.removeEventListener('scroll', projectScrollHandler); // Remove listener before loading
        if (debugMode) console.log("Near bottom, loading more projects...");
        loadMoreProjects(); // This function should re-attach the listener if more data exists
    } else if (!projectsViewActive) {
        window.removeEventListener('scroll', projectScrollHandler);
        if (debugMode) console.log("Projects view inactive, stopping scroll listener.");
    }
};


window.setupActionListeners = setupActionListeners;
window.attachProjectScrollListener = attachProjectScrollListener; // Expose if needed elsewhere