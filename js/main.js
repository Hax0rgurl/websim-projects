// State variables
let username = '';  // will be set to the project creator's username at runtime
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
    // Get the signed-in user
    currentUser = await window.websim.getUser();
    console.log("Current user:", currentUser);

    // Derive which profile to show: use the creator of this project if possible
    try {
      const { username: creatorUsername } = await window.websim.getCreatedBy();
      username = creatorUsername || defaultUsername;
    } catch (err) {
      console.error("Error fetching project creator; falling back to defaultUsername:", err);
      username = defaultUsername;
    }
    console.log("Initial profile username set to:", username);

    // If it's your own profile, show all projects (including private) by default
    if (currentUser && currentUser.username === username) {
      currentVisibilityFilter = 'all';
      console.log("Showing all projects by default (own profile)");
    }
  } catch (error) {
    console.error("Error during initialization of user/profile context:", error);
    // Fallback to defaultUsername
    username = defaultUsername;
  }

  // Enable debug mode to help troubleshoot
  window.debugMode = true;

  // Kick off the profile load
  await initProfile();
});