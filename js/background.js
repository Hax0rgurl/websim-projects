/**
 * Initialize synthwave grid background
 */
function initSynthwaveBackground() {
  const canvas = document.getElementById('grid-background');
  const ctx = canvas.getContext('2d');
  
  // Resize canvas to window size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Animation variables
  let offset = 0;
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#120638');
    gradient.addColorStop(0.5, '#2d1b69');
    gradient.addColorStop(1, '#5a1a80');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw sun
    const sunRadius = synthSunSize / 2;
    const sunY = canvas.height * gridHorizon;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = synthSunColor;
    ctx.shadowColor = synthSunColor;
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw horizontal grid lines
    const horizonY = canvas.height * gridHorizon;
    const gridSpacing = canvas.width / gridLineCount;
    
    // Reset shadows for grid
    ctx.shadowColor = gridColorPrimary;
    ctx.shadowBlur = gridGlowIntensity;
    
    // Vertical lines (perspective)
    ctx.lineWidth = gridLineWidth;
    
    for (let i = 0; i <= gridLineCount; i++) {
      const x = i * gridSpacing;
      
      // Primary lines
      ctx.beginPath();
      ctx.moveTo(x, horizonY);
      ctx.lineTo(x, canvas.height);
      ctx.strokeStyle = gridColorPrimary;
      ctx.stroke();
    }
    
    // Horizontal lines with animation
    const horizontalLines = 20;
    const animatedOffset = (offset % gridSpacing);
    
    ctx.shadowColor = gridColorSecondary;
    
    for (let i = 0; i <= horizontalLines; i++) {
      const progress = i / horizontalLines;
      const y = horizonY + (canvas.height - horizonY) * progress;
      
      // Calculate perspective width
      const perspectiveWidth = progress * canvas.width * 0.8;
      const xStart = (canvas.width - perspectiveWidth) / 2;
      const xEnd = xStart + perspectiveWidth;
      
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.strokeStyle = gridColorSecondary;
      ctx.stroke();
    }
    
    // Update animation
    offset += gridSpeed / 60; // Speed adjusted for 60fps
    
    // Continue animation
    requestAnimationFrame(animate);
  }
  
  // Start animation
  animate();
}