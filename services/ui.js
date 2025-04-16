/**
 * UIService - Handle UI updates
 */
const UIService = {
  /**
   * Reset all stat displays to loading state
   */
  resetStatsToLoading() {
    document.getElementById('views-count').innerHTML = Config.loadingText;
    document.getElementById('sites-count').innerHTML = Config.loadingText;
    document.getElementById('likes-count').innerHTML = Config.loadingText;
    document.getElementById('followers-count').innerHTML = Config.loadingText;
    document.getElementById('following-count').innerHTML = Config.loadingText;
    document.getElementById('friends-count').innerHTML = Config.loadingText;
    document.getElementById('popularity-count').innerHTML = Config.loadingText;
    document.getElementById('rating-count').innerHTML = Config.loadingText;
    document.getElementById('unposted-count').innerHTML = Config.loadingText;
    document.getElementById('joined-count').innerHTML = Config.loadingText;
    document.getElementById('description').innerHTML = Config.loadingText;
  },
  
  /**
   * Create a user card element for followers/following/friends views
   */
  createUserCard(user) {
    if (!user) return document.createElement('div');
    
    const card = document.createElement('a');
    card.href = `https://websim.ai/@${user.username}`;
    card.className = 'user-card';
    card.innerHTML = `
      <img class="user-avatar" src="${user.avatar_url || ''}" 
           alt="${user.username}'s avatar" 
           style="width: ${Config.userAvatarSize}px; height: ${Config.userAvatarSize}px;"
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
      AppState.reset();
      
      // Clear all grids
      document.getElementById('projects-grid').innerHTML = '';
      document.getElementById('followers-grid').innerHTML = '';
      document.getElementById('following-grid').innerHTML = '';
      document.getElementById('friends-grid').innerHTML = '';
      
      // Reset stats displays
      this.resetStatsToLoading();
      
      // Update current username and initialize new profile
      AppState.setUsername(user.username);
      await ProfileController.initProfile();
    });
    
    return card;
  },
  
  /**
   * Create a project card element for projects view
   */
  createProjectCard(project, project_revision, site) {
    if (!project) return document.createElement('div');
    
    const card = document.createElement('div');
    card.className = 'card';
    
    // Create preview image or placeholder
    const previewHtml = site
      ? `<img class="preview-image" 
              src="https://images.websim.ai/v1/site/${site.id}/600" 
              alt="Preview of ${project.title || 'Untitled Project'}" 
              style="height: ${Config.projectPreviewHeight}px;"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="preview-image" 
              style="height: ${Config.projectPreviewHeight}px; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: var(--text-secondary);">
           No Preview Available
         </div>`
      : `<div class="preview-image" 
             style="height: ${Config.projectPreviewHeight}px; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: var(--text-secondary);">
            No Preview
          </div>`;
    
    card.innerHTML = `
      <div class="project-link" style="text-decoration: none; color: inherit; cursor: pointer;">
        ${previewHtml}
        <div class="card-content">
          <h3>${project.title || 'Untitled Project'}</h3>
          <div class="card-stats">
            <span>👁️ ${Utils.formatNumber(project.stats.views)}</span>
            <span>❤️ ${Utils.formatNumber(project.stats.likes)}</span>
          </div>
          <div class="card-meta">
            ${Utils.getRelativeTimeString(new Date(project.created_at))} ago
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
  },
  
  /**
   * Sort and display projects according to current sort criterion
   */
  sortProjects() {
    try {
      const projectsGrid = document.getElementById('projects-grid');
      projectsGrid.innerHTML = '';
      
      let sortedProjects = [...AppState.projectsData];
      switch (AppState.currentSort) {
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
        const card = this.createProjectCard(project, project_revision, site);
        projectsGrid.appendChild(card);
      });
    } catch (error) {
      console.error('Error sorting projects:', error);
    }
  }
};