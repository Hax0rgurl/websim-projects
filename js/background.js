/**
 * Initialize synthwave grid background
 */
function initSynthwaveBackground() {
  const canvas = document.getElementById('grid-background');
  if (!canvas) {
    console.error("Canvas element #grid-background not found.");
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
     console.error("Could not get 2D context for canvas.");
     return;
  }


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
    gradient.addColorStop(0, '#120638'); // Dark Purple/Blue
    gradient.addColorStop(0.5, '#2d1b69'); // Mid Purple
    gradient.addColorStop(1, '#5a1a80'); // Deeper Purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sun
    const sunRadius = synthSunSize / 2;
    const sunY = canvas.height * gridHorizon;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = synthSunColor; // Neon Pink/Purple
    ctx.shadowColor = synthSunColor;
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow blur

    // Draw grid lines
    const horizonY = canvas.height * gridHorizon;
    const numLines = gridLineCount * 2 + 1; // Ensure odd number for center line
    const maxLineWidth = canvas.width * 1.5; // How far lines spread at bottom

    // Reset shadows for grid
    ctx.shadowColor = gridColorPrimary; // Neon Pink/Purple for vertical
    ctx.shadowBlur = gridGlowIntensity;
    ctx.lineWidth = gridLineWidth;

    // --- Perspective Grid ---
    // Vertical Lines
    for (let i = 0; i < numLines; i++) {
      const ratio = i / (numLines - 1); // 0 to 1
      const lineXatHorizon = canvas.width / 2;
      const lineXatBottom = (canvas.width / 2) + (ratio - 0.5) * maxLineWidth;

      ctx.beginPath();
      ctx.moveTo(lineXatHorizon, horizonY);
      ctx.lineTo(lineXatBottom, canvas.height);
      ctx.strokeStyle = gridColorPrimary;
      ctx.stroke();
    }

    // Horizontal Lines (Animated)
    ctx.shadowColor = gridColorSecondary; // Neon Blue for horizontal
    ctx.lineWidth = gridLineWidth * 0.75; // Make horizontal lines slightly thinner

    const numHorizontalLines = 30;
    const maxPerspectiveFactor = 10; // Controls how fast lines accelerate downwards
    const verticalSpacing = (canvas.height - horizonY) / numHorizontalLines; // Base spacing

    for (let i = 0; i < numHorizontalLines; i++) {
       // Non-linear spacing: lines closer near horizon, further apart at bottom
       const yRatio = Math.pow(i / numHorizontalLines, 1.5); // Exponential curve for perspective
       const y = horizonY + yRatio * (canvas.height - horizonY);

       // Apply animation offset - make lines appear to move towards viewer
       const animatedY = horizonY + ((y - horizonY + offset) % (canvas.height - horizonY));

       // Perspective width calculation based on animated Y
       const perspectiveProgress = (animatedY - horizonY) / (canvas.height - horizonY);
       // Ensure width doesn't exceed maxLineWidth, especially near bottom
       const perspectiveWidth = Math.min(maxLineWidth, canvas.width * (1 + perspectiveProgress * 2)); // Make lines spread wider at bottom


       const xStart = (canvas.width - perspectiveWidth) / 2;
       const xEnd = xStart + perspectiveWidth;

       // Fade out lines very close to the horizon
       const fadeThreshold = horizonY + verticalSpacing * 2;
       const opacity = Math.min(1, (animatedY - horizonY) / (fadeThreshold-horizonY) );

       if (animatedY > horizonY && opacity > 0.05) { // Only draw lines below horizon and not fully faded
           ctx.globalAlpha = opacity;
           ctx.beginPath();
           ctx.moveTo(xStart, animatedY);
           ctx.lineTo(xEnd, animatedY);
           ctx.strokeStyle = gridColorSecondary;
           ctx.stroke();
           ctx.globalAlpha = 1.0; // Reset alpha
       }
    }

    // Update animation offset for next frame
    offset += gridSpeed * (16 / 1000); // Adjust speed based on typical frame time (approx 16ms)

    // Continue animation
    requestAnimationFrame(animate);
  }


  // Start animation
  animate();
}