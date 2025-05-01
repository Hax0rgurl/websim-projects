// ===== UI CREATION FUNCTIONS =====

/**
 * Create a user card element for followers/following/friends views
 */
function createUserCard(user) {
  if (!user) return document.createElement('div');
  // Debug: Log the user object being processed
  if (debugMode) console.log("Creating user card for:", user?.username);

  const card = document.createElement('a');
  // Use a relative link or reconstruct URL based on current location if needed,
  // but direct link is simpler if always navigating away.
  card.href = `/@${user.username}`; // Assuming profile URLs are relative like /@username
  card.className = 'user-card';
  card.innerHTML = `
    <img class="user-avatar" src="${user.avatar_url || 'https://images.websim.ai/avatar/anonymous'}"
         alt="${user.username}'s avatar"
         style="width: ${userAvatarSize}px; height: ${userAvatarSize}px;"
         onerror="this.src='https://images.websim.ai/avatar/anonymous'">
    <div class="user-name">${user.username}</div>
  `;

  card.addEventListener('click', async (e) => {
    e.preventDefault();
    if (debugMode) console.log(`User card clicked: ${user.username}`);

    // Update URL hash or use history API for SPA-like navigation without full reload
    // history.pushState({ username: user.username }, '', `/@${user.username}`); // Example using history API

    // Set username display
    const usernameEl = document.getElementById('username');
    usernameEl.textContent = user.username;
    document.querySelector('.username-hint').classList.add('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reset data for the new profile
    projectsData = [];
    projectsAfterCursor = null;
    followersAfterCursor = null;
    followingAfterCursor = null;

    // Clear all grids visually
    document.getElementById('projects-grid').innerHTML = '';
    document.getElementById('followers-grid').innerHTML = '';
    document.getElementById('following-grid').innerHTML = '';
    document.getElementById('friends-grid').innerHTML = '';

    // Reset stats displays to loading state
    resetStatsToLoading();

    // Update current username and initialize new profile
    username = user.username;
    await initProfile(); // Reload profile for the clicked user
  });

  return card;
}


/**
 * Create a project card element for projects view
 */
function createProjectCard(project, project_revision, site) {
  if (!project) return document.createElement('div');

  const card = document.createElement('div');
  card.className = 'card';
  card.style.position = 'relative';

  // Set border color based on visibility
  if (project.visibility === 'private') {
    card.style.borderColor = privateProjectBorderColor;
  } else if (project.visibility === 'unlisted') {
    card.style.borderColor = unlistedProjectBorderColor;
  }

  // Create preview image or placeholder
  const previewHtml = site
    ? `<img class="preview-image"
            src="https://images.websim.ai/v1/site/${site.id}/600"
            alt="Preview of ${project.title || 'Untitled Project'}"
            style="height: ${projectPreviewHeight}px;"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
       <div class="preview-image"
            style="height: ${projectPreviewHeight}px; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: var(--text-secondary);">
         No Preview Available
       </div>`
    : `<div class="preview-image"
           style="height: ${projectPreviewHeight}px; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: var(--text-secondary);">
          No Preview
        </div>`;

  // Add visibility indicator if enabled
  let visibilityIndicator = '';
  if (showVisibilityIndicator) {
    let visibilityText = '';
    if (project.visibility === 'private') {
      visibilityText = privateProjectText;
    } else if (project.visibility === 'unlisted') {
      visibilityText = unlistedProjectText;
    } else {
      visibilityText = publicProjectText; // Default to public if not private/unlisted
    }

    // Only show indicator if it's not public (or if configured to always show)
    if (visibilityText !== publicProjectText || alwaysShowPublicIndicator) {
       visibilityIndicator = `<div class="project-visibility-indicator">${visibilityText}</div>`;
    }
  }


  card.innerHTML = `
    ${visibilityIndicator}
    <div class="project-link" style="text-decoration: none; color: inherit; cursor: pointer;">
      ${previewHtml}
      <div class="card-content">
        <h3>${project.title || 'Untitled Project'}</h3>
        <div class="card-stats">
          <span>👁️ ${formatNumber(project.stats.views)}</span>
          <span>❤️ ${formatNumber(project.stats.likes)}</span>
        </div>
        <div class="card-meta">
          ${getRelativeTimeString(new Date(project.created_at))} ago
        </div>
      </div>
    </div>
  `;

  // Add click handler to open modal
  const projectLink = card.querySelector('.project-link');
  projectLink.addEventListener('click', (e) => {
    e.preventDefault();

    const modal = document.querySelector('.modal');
    const overlay = document.querySelector('.modal-overlay');
    const iframe = modal.querySelector('iframe');
    const projectUrl = `/p/${project.id}`; // Use relative URL

    iframe.src = projectUrl;

    let openNewTab = modal.querySelector('.open-new-tab');
    if (!openNewTab) {
      openNewTab = document.createElement('a');
      openNewTab.className = 'open-new-tab';
      openNewTab.target = '_blank';
      openNewTab.textContent = '↗️ Open in new tab';
      modal.appendChild(openNewTab);
    }
    openNewTab.href = projectUrl;

    overlay.classList.add('active');
    modal.classList.add('active');
  });

  return card;
}

/**
 * Sort and display projects according to current sort criterion
 */
function sortProjects() {
  try {
    const projectsGrid = document.getElementById('projects-grid');
    projectsGrid.innerHTML = ''; // Clear existing grid

    if (!projectsData || projectsData.length === 0) {
        if (debugMode) console.log("No projects data to sort/display.");
        // Optionally show a message if needed, handled elsewhere usually
        return;
    }


    let sortedProjects = [...projectsData];
    switch (currentSort) {
      case 'views':
        sortedProjects.sort((a, b) => (b.project?.stats?.views || 0) - (a.project?.stats?.views || 0));
        break;
      case 'likes':
        sortedProjects.sort((a, b) => (b.project?.stats?.likes || 0) - (a.project?.stats?.likes || 0));
        break;
      case 'recent':
      default:
        // Ensure created_at exists and is valid before sorting
        sortedProjects.sort((a, b) => {
           const dateA = a.project?.created_at ? new Date(a.project.created_at) : 0;
           const dateB = b.project?.created_at ? new Date(b.project.created_at) : 0;
           // Check for invalid dates
           if (isNaN(dateA) && isNaN(dateB)) return 0;
           if (isNaN(dateA)) return 1; // Put invalid dates last
           if (isNaN(dateB)) return -1; // Put invalid dates last
           return dateB - dateA; // Newest first
        });
        break;
    }
    if (debugMode) console.log(`Sorted ${sortedProjects.length} projects by ${currentSort}`);

    // Append sorted projects
    sortedProjects.forEach(({ project, project_revision, site }) => {
      if (project) { // Ensure project data exists
        const card = createProjectCard(project, project_revision, site);
        projectsGrid.appendChild(card);
      } else if (debugMode) {
          console.warn("Skipping project card creation due to missing project data in an item.");
      }
    });
  } catch (error) {
    console.error('Error sorting projects:', error);
     // Optionally display error in the grid area
     document.getElementById('projects-grid').innerHTML = '<div style="color: var(--neon-primary); padding: 2rem; text-align: center;">Error displaying projects.</div>';
  }
}

/**
 * Update the private toggle button state based on current visibility setting
 */
function updatePrivateToggleState() {
  const showPrivateButton = document.getElementById('show-private');

  // Only show the toggle button if we're viewing our own profile
  // (Removed showOtherUsersPrivateProjects logic as per requirements/simplification)
  if (isViewingOwnProfile()) {
    showPrivateButton.style.display = 'inline-block';

    // Update button text based on current state
    showPrivateButton.textContent = isShowingPrivate ? privateToggleShownText : privateToggleHiddenText;

    // Update button visual state
    showPrivateButton.classList.toggle('active', isShowingPrivate);

    if (debugMode) {
      console.log("Private toggle updated:", {
        text: showPrivateButton.textContent,
        active: isShowingPrivate,
        visible: true
      });
    }
  } else {
    // Hide the button if we're not viewing our own profile
    showPrivateButton.style.display = 'none';

    if (debugMode) {
      console.log("Private toggle hidden (not own profile)");
    }
  }
}

/**
 * Set up event listener for the private toggle button
 */
function setupPrivateToggle() {
  const visibilityToggle = document.getElementById('show-private');

  // Remove any existing event listeners by cloning and replacing the element
  const newVisibilityToggle = visibilityToggle.cloneNode(true);
  visibilityToggle.parentNode.replaceChild(newVisibilityToggle, visibilityToggle);

  // Add the new event listener
  newVisibilityToggle.addEventListener('click', async () => {
    // Toggle the visibility state
    isShowingPrivate = !isShowingPrivate;

    if (debugMode) {
      console.log("Private toggle clicked, new isShowingPrivate:", isShowingPrivate);
    }

    // Update the toggle button appearance
    updatePrivateToggleState();

    // Reset project data and fetch again
    projectsData = [];
    projectsAfterCursor = null;
    document.getElementById('projects-grid').innerHTML = ''; // Clear grid

    // Show loading indicator
    document.getElementById('projects-loading').style.display = 'block';

    // Slight delay to ensure UI updates before fetching new data
    await new Promise(resolve => setTimeout(resolve, toggleRefreshDelay));
    await loadMoreProjects(); // Fetch projects with the new visibility state
  });
}

/**
 * Check if we're viewing our own profile
 */
function isViewingOwnProfile() {
  const ownProfile = !!(currentUser && currentUser.username && currentUser.username === username);
  if (debugMode) {
    // Log only if state changes or first check
    if (typeof window.lastOwnProfileCheck === 'undefined' || window.lastOwnProfileCheck !== ownProfile) {
       console.log("isViewingOwnProfile check:", {
         currentUser: currentUser?.username,
         profileUsername: username,
         result: ownProfile
       });
       window.lastOwnProfileCheck = ownProfile;
    }
  }
  return ownProfile;
}