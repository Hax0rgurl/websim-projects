// Initialize WebsimSocket for persistent data storage
const room = new WebsimSocket();

// Config and Tweakable Values
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

/* @tweakable Base size of user avatar in follower/following lists in pixels */
const userAvatarSize = 80;

/* @tweakable Height of the project preview image in pixels */
const projectPreviewHeight = 200;

/* @tweakable Maximum projects to load per batch */
const projectBatchSize = 50;

/* @tweakable Maximum followers/following to load per batch */
const userBatchSize = 50;

/* @tweakable Format large numbers with commas (true) or use compact notation (false) */
const useCommaFormatting = true;

/* @tweakable Enable percentile calculations for stats (can slow down page for large datasets) */
const enablePercentiles = true;

/* @tweakable Number of projects to load before calculating initial stats */
const initialStatsProjectCount = 10;

/* @tweakable Enable automatically generated bio text */
const enableAutoBio = true;

/* @tweakable Thresholds for Popularity Score (Views, Likes) */
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

/* @tweakable Thresholds for Quality Rating (Views per Like, lower is better) */
const ratingThresholds = [
  { score: 1, viewsPerLike: 100 },
  { score: 2, viewsPerLike: 75 },
  { score: 3, viewsPerLike: 65 },
  { score: 4, viewsPerLike: 50 },
  { score: 5, viewsPerLike: 40 }  // Max score if VPL <= 40 or likes > 0
];

/* @tweakable Default username to load on page load */
const defaultUsername = 'abandonedmuse';

/* @tweakable Show private projects by default */
const showPrivateByDefault = false;

/* @tweakable Indicator text for private projects */
const privateProjectText = "PRIVATE";

/* @tweakable Indicator text for public projects */
const publicProjectText = "PUBLIC";

/* @tweakable Indicator text for unlisted projects */
const unlistedProjectText = "UNLISTED";

/* @tweakable Show visibility indicator on projects */
const showVisibilityIndicator = true;

/* @tweakable Color for private project cards */
const privateProjectBorderColor = "#ff00ff";

/* @tweakable Color for unlisted project cards */
const unlistedProjectBorderColor = "#bf00ff";

/* @tweakable Show projects from other users that are private (only works for your own account) */
const showOtherUsersPrivateProjects = false;

/* @tweakable Show own projects regardless of visibility */
const showAllOwnProjects = true;

/* @tweakable Debug mode - log information about visibility settings and API calls */
const debugMode = false;

/* @tweakable Include private projects in stats calculations */
const includePrivateInStats = true;

/* @tweakable Private toggle text when showing private */
const privateToggleShownText = "Show Public Only";

/* @tweakable Private toggle text when showing public */
const privateToggleHiddenText = "Show Private";

/* @tweakable Private filter parameter name for API */
const privateFilterParam = "posted";

/* @tweakable Delay in ms before refreshing projects after toggle */
const toggleRefreshDelay = 100;

/* @tweakable Text to display when a value is loading */
const loadingText = '<div class="loading-spinner"></div>';

/* @tweakable Maximum number to display before using K/M notation (e.g., 5.2K) */
const numberFormatThreshold = 10000;

/* @tweakable Include additional details in auto-generated bio */
const bioIncludeProjectDetails = true;

/* @tweakable Include social stats in auto-generated bio */
const bioIncludeSocialStats = true;