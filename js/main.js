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
    currentUser = await window.websim.getUser();
    console.log("Current user:", currentUser);
    if (currentUser && currentUser.username === username) {
      currentVisibilityFilter = 'all';
      console.log("Showing all projects by default (own profile)");
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  // Start the profile load
  await initProfile();
});