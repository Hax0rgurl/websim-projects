// Initialize WebsimSocket for persistent data storage
const room = new WebsimSocket();

// Config and Tweakable Values

// --- Background ---
const gridLineCount = 20;
const gridHorizon = 0.5;
const gridSpeed = 20;
const gridColorPrimary = "#ff00ff";
const gridColorSecondary = "#00eeff";
const gridLineWidth = 2;
const gridGlowIntensity = 10;
const synthSunSize = 120;
const synthSunColor = "#ff00ff";

// --- UI Elements ---
const userAvatarSize = 80;
const projectPreviewHeight = 200;
const privateProjectBorderColor = "#ff00ff"; // Use primary neon for private
const unlistedProjectBorderColor = "#bf00ff"; // Use tertiary neon for unlisted
const publicProjectBorderColor = "#00eeff"; // Use secondary neon for public (or default card border)
const loadingText = '<div class="loading-spinner"></div>';

// --- Data Loading & API ---
const projectBatchSize = 50;
const userBatchSize = 50;
// DEPRECATED: const privateFilterParam = "posted"; // Replaced by 'visibility' param
const toggleRefreshDelay = 100;
const defaultUsername = 'abandonedmuse';

// --- Stat Calculation & Display ---
const useCommaFormatting = true;
const numberFormatThreshold = 10000;
const enablePercentiles = true;
const initialStatsProjectCount = 10;
// DEPRECATED: const includePrivateInStats = true; // Stats now primarily use direct API calls

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

const ratingThresholds = [
    { score: 5, viewsPerLike: 20 },  // High quality: ~5% like rate or better
    { score: 4, viewsPerLike: 50 },  // Good quality: ~2% like rate
    { score: 3, viewsPerLike: 100 }, // Average quality: ~1% like rate
    { score: 2, viewsPerLike: 200 }, // Below average: ~0.5% like rate
    { score: 1, viewsPerLike: Infinity }, // Low quality / few interactions
];

// --- Bio Generation ---
const enableAutoBio = true;
const bioIncludeProjectDetails = true;
const bioIncludeSocialStats = true;

// --- Project Visibility Toggles ---
const initialOwnVisibilityFilter = 'all'; // Default for own profile
const initialOtherVisibilityFilter = 'public'; // Default for other profiles
// DEPRECATED: const showOtherUsersPrivateProjects = false; // API permissions handle this
const showVisibilityIndicator = true;
const privateProjectText = "PRIVATE";
const publicProjectText = "PUBLIC";
const unlistedProjectText = "UNLISTED";

// --- Debugging ---
const debugMode = true; // Set to true for console logs to help troubleshoot private projects