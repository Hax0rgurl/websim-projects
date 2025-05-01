// ===== UI CREATION FUNCTIONS =====

/**
 * Create a user card element for followers/following/friends views
 */
function createUserCard(user) {
  if (!user || !user.username) return document.createElement('div'); // Basic safety check

  const card = document.createElement('div'); // Use div instead of <a> initially
  card.className = 'user-card';
  card.dataset.username = user.username; // Store username for click handler

  card.innerHTML = `
    <img class="user-avatar" src="${user.avatar_url || `https://images.websim.ai/avatar/${user.username}`}"
         alt="${user.username}'s avatar"
         style="width: ${userAvatarSize}px; height: ${userAvatarSize}px;"
         onerror="this.src='https://images.websim.ai/avatar/anonymous'">
    <div class="user-name">${user.username}</div>
  `;

  // Add click listener to navigate within the app
  card.addEventListener('click', async (e) => {
    e.preventDefault();
    const targetUsername = card.dataset.username;

    if (targetUsername && targetUsername !== username) {
        // Update the global username state
        username = targetUsername;

        // Update the search input visually (optional)
        document.getElementById('user-search').value = username;

        // Scroll to top for new profile load
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Initiate the profile load process
        await initProfile(); // initProfile handles resets and loading
    } else {
         if (debugMode) console.log("Clicked on current user's card, no navigation needed.");
    }
  });

  return card;
}

/**
 * Create a project card element for projects view
 */
function createProjectCard(project, project_revision, site) {
  if (!project || !project.id) {
      if (debugMode) console.warn("Attempted to create card for invalid project:", project);
      return document.createElement('div'); // Return empty div if project data is invalid
  }

  const card = document.createElement('div');
  card.className = 'card';
  card.style.position = 'relative'; // Needed for absolute positioning of indicator

  // Determine border color and visibility text based on project.visibility
  let borderColor = publicProjectBorderColor; // Default
  let visibilityText = publicProjectText; // Default
  const projectVisibility = project.visibility || 'public'; // Default to public if undefined

  switch (projectVisibility) {
    case 'private':
      borderColor = privateProjectBorderColor;
      visibilityText = privateProjectText;
      break;
    case 'unlisted':
      borderColor = unlistedProjectBorderColor;
      visibilityText = unlistedProjectText;
      break;
    case 'public':
      borderColor = publicProjectBorderColor;
      visibilityText = publicProjectText;
      break;
    default:
       if (debugMode) console.warn(`Unknown project visibility: ${projectVisibility} for project ${project.id}`);
       visibilityText = projectVisibility.toUpperCase(); // Show the unknown status
      break;
  }
  card.style.borderColor = borderColor;
  card.style.borderWidth = 'var(--neon-border-width)'; // Ensure border width is applied
  card.style.borderStyle = 'solid';

  // Create preview image or placeholder
   const previewImageUrl = site?.id ? `https://images.websim.ai/v1/site/${site.id}/600` : null;
   const placeholderText = site?.id ? 'Preview Unavailable' : 'No Site Generated';
   const projectTitle = project.title || 'Untitled Project';

   const previewHtml = previewImageUrl
     ? `<img class="preview-image"
             src="${previewImageUrl}"
             alt="Preview of ${projectTitle}"
             style="height: ${projectPreviewHeight}px;"
             loading="lazy"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="preview-image placeholder error-placeholder"
             style="height: ${projectPreviewHeight}px; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); color: var(--text-secondary);">
          ${placeholderText}
        </div>`
     : `<div class="preview-image placeholder no-site-placeholder"
            style="height: ${projectPreviewHeight}px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); color: var(--text-secondary);">
           ${placeholderText}
         </div>`;

  // Add visibility indicator only for non-public projects when
  let visibilityIndicator = '';
  if (projectVisibility !== 'public' && showVisibilityIndicator) {
    let indicatorColor = borderColor; // Match border color
    visibilityIndicator = `<div class="project-visibility-indicator" style="color: ${indicatorColor}; border-color: ${indicatorColor}; box-shadow: 0 0 5px ${indicatorColor};">
      ${visibilityText}
    </div>`;
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

    // Prevent opening modal for private projects if not owner?
    // API should prevent loading content anyway, but UI can be clearer
    if (project.visibility === 'private' && !isViewingOwnProfile()) {
      // Maybe show a small notification instead?
      console.log("Cannot view private project of another user.");
      return;
    }

    const modal = document.querySelector('.modal');
    const overlay = document.querySelector('.modal-overlay');
    const iframe = modal.querySelector('iframe');
    const projectUrl = `https://websim.ai/p/${project.id}`;

    iframe.src = projectUrl; // Load project in iframe

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
    projectsGrid.innerHTML = ''; // Clear previous items

    if (!projectsData || projectsData.length === 0) {
        // Display a message if no projects match the current filter
        let message = "No projects found.";
        if (currentVisibilityFilter === 'private') message = "No private projects found. Private projects are only visible to their owner.";
        else if (currentVisibilityFilter === 'public') message = "No public projects found.";

        projectsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">${message}</div>`;
        return;
    }

    let sortedProjects = [...projectsData];

    // Apply visibility filter (public / private / all)
    if (currentVisibilityFilter === 'public') {
      sortedProjects = sortedProjects.filter(p => p.project.visibility === 'public');
    } else if (currentVisibilityFilter === 'private') {
      sortedProjects = sortedProjects.filter(p => p.project.visibility === 'private');
    }

    // Filter out any potential null/invalid project entries before sorting
    sortedProjects = sortedProjects.filter(p => p && p.project && p.project.stats);

    if (sortedProjects.length === 0) {
        // After filtering, we might have no projects to show
        let message = "No projects match the selected filter.";
        if (currentVisibilityFilter === 'private') message = "No private projects found. Private projects are only visible to their owner.";
        projectsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">${message}</div>`;
        return;
    }

    // Now sort by the chosen criterion
    switch (currentSort) {
      case 'views':
        sortedProjects.sort((a, b) => (b.project.stats.views || 0) - (a.project.stats.views || 0));
        break;
      case 'likes':
        sortedProjects.sort((a, b) => (b.project.stats.likes || 0) - (a.project.stats.likes || 0));
        break;
      case 'recent':
      default:
        // Sort by creation date, handling potential invalid dates
        sortedProjects.sort((a, b) => {
            const dateA = a.project.created_at ? new Date(a.project.created_at) : 0;
            const dateB = b.project.created_at ? new Date(b.project.created_at) : 0;
            // Ensure valid dates are compared correctly
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1; // Put invalid dates last
            if (isNaN(dateB)) return -1; // Put invalid dates last
            return dateB - dateA; // Newest first
        });
        break;
    }

    sortedProjects.forEach(({ project, project_revision, site }) => {
      const card = createProjectCard(project, project_revision, site);
      projectsGrid.appendChild(card);
    });
  } catch (error) {
    console.error('Error sorting projects:', error);
  }
}

/**
 * Updates the active state of the visibility filter buttons and shows/hides the controls
 */
function updateVisibilityFilterButtons() {
    const visibilityControls = document.getElementById('visibility-filter-controls');
    if (!visibilityControls) return;

    const viewingOwn = isViewingOwnProfile();

    if (viewingOwn) {
        visibilityControls.style.display = 'flex';
        const buttons = visibilityControls.querySelectorAll('.visibility-button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === currentVisibilityFilter);
        });
    } else {
        // Hide controls if not viewing own profile
        visibilityControls.style.display = 'none';
        // Force filter to public if somehow it wasn't already
        if (currentVisibilityFilter !== 'public') {
             currentVisibilityFilter = 'public';
             if (debugMode) console.log("Forced visibility filter to 'public' for other user's profile update.");
        }
    }

    // Update the label for the project count stat card
    const projectCountLabel = document.getElementById('project-count-label');
    if (projectCountLabel) {
        switch (currentVisibilityFilter) {
            case 'private':
                projectCountLabel.textContent = '🤫 Private Projects';
                break;
            case 'all':
                 projectCountLabel.textContent = viewingOwn ? '🌐 All Projects' : '🌐 Public Projects'; // Show "All" only for self
                break;
            case 'public':
            default:
                projectCountLabel.textContent = '🌐 Public Projects';
                break;
        }
    }
}

/**
 * Check if we're viewing our own profile
 */
function isViewingOwnProfile() {
  const currentUsername = window.currentUsername || (currentUser && currentUser.username);
  const result = currentUsername && currentUsername === username;
  
  if (debugMode) {
    console.log(`isViewingOwnProfile check: currentUsername=${currentUsername}, profile username=${username}, result=${result}`);
  }
  return result;
}