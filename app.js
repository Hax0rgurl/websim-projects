/**
 * AppState Module - Manages application state
 */
const AppState = {
  username: Config.defaultUsername,
  projectsAfterCursor: null,
  followersAfterCursor: null,
  followingAfterCursor: null,
  currentSort: 'recent',
  projectsData: [],
  isLoading: false,
  currentUserProfile: null,
  
  reset() {
    this.projectsData = [];
    this.projectsAfterCursor = null;
    this.followersAfterCursor = null;
    this.followingAfterCursor = null;
    this.isLoading = false;
  },
  
  setUsername(username) {
    this.username = username;
  }
};

// Initialize WebsimSocket for persistent data storage
const room = new WebsimSocket();

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  ProfileController.init();
});