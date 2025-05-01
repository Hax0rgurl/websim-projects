// Initialize WebsimSocket for persistent data storage
const room = new WebsimSocket();

// Config and Tweakable Values

// --- Background ---
/* @tweakable Number of grid lines in the background */
const gridLineCount = 20;
/* @tweakable Grid horizon position (0.0-1.0, higher values push horizon down) */
const gridHorizon = 0.5;
/* @tweakable Grid animation speed (pixels per second) */
const gridSpeed = 20;
/* @tweakable Primary grid color */
const gridColorPrimary = "#ff00ff";
/* @tweakable Secondary grid color */
const gridColorSecondary = "#00eeff";
/* @tweakable Grid line width */
const gridLineWidth = 2;
/* @tweakable Grid line glow intensity */
const gridGlowIntensity = 10;
/* @tweakable Sun size in pixels */
const synthSunSize = 120;
/* @tweakable Sun color */
const synthSunColor = "#ff00ff";

// --- UI Elements ---
/* @tweakable Base size of user avatar in follower/following lists in pixels */
const userAvatarSize = 80;
/* @tweakable Height of the project preview image in pixels */
const projectPreviewHeight = 200;
/* @tweakable Color for private project card borders */
const privateProjectBorderColor = "#ff00ff";
/* @tweakable Color for unlisted project card borders */
const unlistedProjectBorderColor = "#bf00ff";
/* @tweakable Text to display when a value is loading */
const loadingText = '<div class="loading-spinner"></div>';

// --- Data Loading & API ---
/* @tweakable Maximum projects to load per batch */
const projectBatchSize = 50;
/* @tweakable Maximum followers/following to load per batch */
const userBatchSize = 50;
/* @tweakable Private filter parameter name for API (usually 'posted' for websim) */
const privateFilterParam = "posted";
/* @tweakable Delay in ms before refreshing projects after visibility toggle */
const toggleRefreshDelay = 100;
/* @tweakable Default username to load on page load */
const defaultUsername = 'abandonedmuse';

// --- Stat Calculation & Display ---
/* @tweakable Format large numbers with commas (true) or use compact notation like K/M (false) */
const useCommaFormatting = true;
/* @tweakable Maximum number to display before using K/M notation (e.g., 5.2K). Only used if useCommaFormatting is false. */
const numberFormatThreshold = 10000;
/* @tweakable Enable percentile calculations for stats (can slow down page for large datasets) */
const enablePercentiles = true;
/* @tweakable Number of projects to load before calculating initial stats (uses API for views/likes regardless) */
const initialStatsProjectCount = 10;
/* @tweakable Include private projects when calculating the total 'Projects' count stat (only applies if viewing own profile) */
const includePrivateInStats = true;

/* @tweakable Thresholds for Popularity Score (out of 10). Score is the highest matching row based on Views & Likes. */
const popularityThresholds = [
  { score: 10, views: 20000, likes: 325 },
  { score: 9, views: 10000, likes: 250 },
  { score: 8, views: 5000, likes: 120 },
  { score: 7, views: 2500, likes: 75 },
  { score: 6, views: 1000, likes: 40 },
  { score: 5, views: 500, likes: 20 },
  { score: 4, views: 250, likes: 10 },
  { score: 3, views: 100, likes: 5 },
  { score: 2, views: 0, likes: 10 },  // Score based only on likes
  { score: 1, views: 10, likes: 0 }   // Score based only on views
];

/* @tweakable Thresholds for Quality Rating (out of 5). Score is based on Views per Like (VPL). Lower VPL can indicate higher engagement. Score is the *first* row where VPL is >= threshold. */
const ratingThresholds = [
  { score: 1, viewsPerLike: 100 }, 
  { score: 2, viewsPerLike: 75 },  
  { score: 3, viewsPerLike: 65 },  
  { score: 4, viewsPerLike: 50 },  
];

// --- Bio Generation ---
/* @tweakable Enable automatically generated bio text (overwrites user description) */
const enableAutoBio = true;
/* @tweakable Include project details (latest, most viewed, most liked) in auto-bio */
const bioIncludeProjectDetails = true;
/* @tweakable Include social stats (followers, following) in auto-bio */
const bioIncludeSocialStats = true;

// --- Project Visibility Toggles ---
/* @tweakable Initial visibility filter when viewing *your own* profile ('public', 'private', 'all') */
const initialOwnVisibilityFilter = 'all';
/* @tweakable Allow attempting to view private projects on other users' profiles (API permission still required) */
const showOtherUsersPrivateProjects = false; 
/* @tweakable Show visibility indicator (Public/Private/Unlisted) on project cards */
const showVisibilityIndicator = true;
/* @tweakable Indicator text for private projects */
const privateProjectText = "PRIVATE";
/* @tweakable Indicator text for public projects */
const publicProjectText = "PUBLIC";
/* @tweakable Indicator text for unlisted projects */
const unlistedProjectText = "UNLISTED";
/* @tweakable DEPRECATED Private toggle button text when private projects are currently shown */
// const privateToggleShownText = "Show Public Only"; 
/* @tweakable DEPRECATED Private toggle button text when private projects are currently hidden */
// const privateToggleHiddenText = "Show Private"; 

// --- Debugging ---
/* @tweakable Debug mode - log detailed information to the console */
const debugMode = false;