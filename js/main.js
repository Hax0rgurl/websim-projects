// State variables
let username = defaultUsername; 
let projectsAfterCursor = null;
let followersAfterCursor = null;
let followingAfterCursor = null;
let currentSort = 'recent';
let currentVisibilityFilter = 'public'; 
let projectsData = [];
let isLoading = false;
let currentUser = null;
window.currentUserProfile = null;

// Initialize WebsimSocket and then kick off profile init
room.initialize().then(async () => {
  try {
    // CRITICAL: Get current user with explicit await to ensure we have it before proceeding
    try {
      currentUser = await window.websim.getUser();
      window.currentUserId = currentUser?.id;
      window.currentUsername = currentUser?.username;
    } catch (e) {
      console.warn("Could not get current user context (possibly generic viewer)", e);
    }
    
    // Force thorough auth refresh before any content loading
    try {
      await refreshAuthCookies();
    } catch(e) { console.error("Auth refresh failed", e); }
    
    // Wait a brief moment to ensure auth state is fully processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Initialize with all projects for own profile
    if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
      currentVisibilityFilter = initialOwnVisibilityFilter;
      console.log(`📝 Initially showing ${initialOwnVisibilityFilter} projects (own profile)`);
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  
  // Enable debug mode to help troubleshoot
  window.debugMode = true; // Force debug mode ON for diagnostics
  
  // Start the profile load
  await initProfile();
  
  // Set up modal closing functionality
  const closeModal = () => {
    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal');
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
    const iframe = document.querySelector('.modal iframe');
    if (iframe) iframe.src = '';
  };
  
  document.querySelector('.modal-close')?.addEventListener('click', closeModal);
  document.querySelector('.modal-overlay')?.addEventListener('click', event => {
    if (event.target === document.querySelector('.modal-overlay')) {
      closeModal();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});

// Add escape key handler outside initialization to ensure it's always available
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay && modalOverlay.classList.contains('active')) {
      modalOverlay.classList.remove('active');
      document.querySelector('.modal').classList.remove('active');
      const iframe = document.querySelector('.modal iframe');
      if (iframe) iframe.src = '';
    }
  }
});