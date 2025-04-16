/**
 * Configuration Module - Contains all tweakable parameters
 */
const Config = {
  // Grid Background Settings
  /** @tweakable Number of grid lines in the background */
  gridLineCount: 20,
  /** @tweakable Grid horizon position (0.0-1.0, higher values push horizon down) */
  gridHorizon: 0.5,
  /** @tweakable Grid animation speed (pixels per second) */
  gridSpeed: 20,
  /** @tweakable Primary grid color */
  gridColorPrimary: "#ff00ff",
  /** @tweakable Secondary grid color */
  gridColorSecondary: "#00eeff",
  /** @tweakable Grid line width */
  gridLineWidth: 2,
  /** @tweakable Grid line glow intensity */
  gridGlowIntensity: 10,
  /** @tweakable Sun size in pixels */
  synthSunSize: 120,
  /** @tweakable Sun color */
  synthSunColor: "#ff00ff",
  
  // UI Settings
  /** @tweakable Base size of user avatar in follower/following lists in pixels */
  userAvatarSize: 80,
  /** @tweakable Height of the project preview image in pixels */
  projectPreviewHeight: 200,
  /** @tweakable Text to display when a value is loading */
  loadingText: '<div class="loading-spinner"></div>',
  
  // Data Settings
  /** @tweakable Maximum projects to load per batch */
  projectBatchSize: 50,
  /** @tweakable Maximum followers/following to load per batch */
  userBatchSize: 50,
  /** @tweakable Format large numbers with commas (true) or use compact notation (false) */
  useCommaFormatting: true,
  /** @tweakable Maximum number to display before using K/M notation (e.g., 5.2K) */
  numberFormatThreshold: 10000,
  /** @tweakable Enable percentile calculations for stats (can slow down page for large datasets) */
  enablePercentiles: true,
  /** @tweakable Number of projects to load before calculating initial stats */
  initialStatsProjectCount: 10,
  /** @tweakable Enable automatically generated bio text */
  enableAutoBio: true,
  /** @tweakable Include additional details in auto-generated bio */
  bioIncludeProjectDetails: true,
  /** @tweakable Include social stats in auto-generated bio */
  bioIncludeSocialStats: true,
  
  // Default Settings
  /** @tweakable Default username to load on page load */
  defaultUsername: 'abandonedmuse',
  
  // Rating Thresholds
  /** @tweakable Thresholds for Popularity Score (Views, Likes) */
  popularityThresholds: [
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
  ],
  
  /** @tweakable Thresholds for Quality Rating (Views per Like, lower is better) */
  ratingThresholds: [
    { score: 1, viewsPerLike: 100 },
    { score: 2, viewsPerLike: 75 },
    { score: 3, viewsPerLike: 65 },
    { score: 4, viewsPerLike: 50 },
    { score: 5, viewsPerLike: 40 }  // Max score if VPL <= 40 or likes > 0
  ]
};