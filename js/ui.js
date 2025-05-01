// ===== UI CREATION FUNCTIONS =====

/**
 * Create a user card element for followers/following/friends views
 */
function createUserCard(user) {
  if (!user) return document.createElement('div');
  
  const card = document.createElement('a');
  card.href = `https://websim.ai/@${user.username}`;
  card.className = 'user-card';
  card.innerHTML = `
    <img class="user-avatar" src="${user.avatar_url || ''}" 
         alt="${user.username}'s avatar" 
         style="width: ${userAvatarSize}px; height: ${userAvatarSize}px;"
         onerror="this.src='https://images.websim.ai/avatar/anonymous'">
    <div class="user-name">${user.username}</div>
  `;
  
  card.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Set username display
    const usernameEl = document.getElementById('username');
    usernameEl.textContent = user.username;
    document.querySelector('.username-hint').classList.add('hidden');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Reset data
    projectsData = [];
    projectsAfterCursor = null;
    followersAfterCursor = null;
    followingAfterCursor = null;
    
    // Clear all grids
    document.getElementById('projects-grid').innerHTML = '';
    document.getElementById('followers-grid').innerHTML = '';
    document.getElementById('following-grid').innerHTML = '';
    document.getElementById('friends-grid').innerHTML = '';
    
    // Reset stats displays
    resetStatsToLoading();
    
    // Update current username and initialize new profile
    username = user.username;
    await initProfile();
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
      visibilityText = publicProjectText;
    }
    
    visibilityIndicator = `<div class="project-visibility-indicator">${visibilityText}</div>`;
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
    const projectUrl = `https://websim.ai/p/${project.id}`;
    
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
    projectsGrid.innerHTML = '';
    
    let sortedProjects = [...projectsData];
    switch (currentSort) {
      case 'views':
        sortedProjects.sort((a, b) => b.project.stats.views - a.project.stats.views);
        break;
      case 'likes':
        sortedProjects.sort((a, b) => b.project.stats.likes - a.project.stats.likes);
        break;
      case 'recent':
      default:
        sortedProjects.sort((a, b) => new Date(b.project.created_at) - new Date(a.project.created_at));
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
 * Update the private toggle button state based on current visibility setting
 * @deprecated Replaced by updateVisibilityFilterButtons
 */
function updatePrivateToggleState() {
  // This function is no longer needed as we have a button group now.
  // We'll handle the active state in setupVisibilityFilterControls.
  if (debugMode) console.log("updatePrivateToggleState is deprecated");
}

/**
 * Set up event listener for the private toggle button
 * @deprecated Replaced by setupVisibilityFilterControls
 */
function setupPrivateToggle() {
 // This function is no longer needed.
 if (debugMode) console.log("setupPrivateToggle is deprecated");
}

/**
 * Updates the active state of the visibility filter buttons
 */
function updateVisibilityFilterButtons() {
    const visibilityControls = document.getElementById('visibility-filter-controls');
    if (!visibilityControls) return;

    const buttons = visibilityControls.querySelectorAll('.visibility-button');
    buttons.forEach(button => {
        button.classList.toggle('active', button.dataset.filter === currentVisibilityFilter);
    });

    // Show/hide controls based on whether user can view non-public projects
    if (isViewingOwnProfile()) {
        visibilityControls.style.display = 'flex';
    } else {
        visibilityControls.style.display = 'none';
        // Force filter to public if viewing others
        if (currentVisibilityFilter !== 'public') {
            currentVisibilityFilter = 'public';
             if (debugMode) console.log("Forced visibility filter to 'public' for other user's profile.");
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
                projectCountLabel.textContent = '🌐 All Projects';
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
 * @tweakable The logic for determining if the current user owns the profile
 */
function isViewingOwnProfile() {
  // Note: currentUser might be null initially, username should always be set.
  return currentUser && currentUser.username === username;
}