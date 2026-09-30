import { useEffect, useRef } from 'react';

// Golden color palette calibrated to CreatorForge's classical brass/gold aesthetic
const GOLD_COLORS = [
  '#FFE680', // Radiant Light Gold
  '#FFD700', // Pure Vibrant Gold
  '#F5C542', // Warm Sunlit Gold
  '#C9A962', // Signature CreatorForge Gold
  '#D4B872', // Antique Brass
  '#FFF8D6', // Pale Shimmer Champagne
];

// Helper to draw a delicate four-pointed star sparkle
function drawStar(ctx, x, y, radius, rotation, alpha, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;

  ctx.beginPath();
  const inner = radius * 0.22;
  for (let i = 0; i < 4; i++) {
    const outerAngle = (i * Math.PI) / 2;
    const innerAngle = outerAngle + Math.PI / 4;
    if (i === 0) {
      ctx.moveTo(Math.cos(outerAngle) * radius, Math.sin(outerAngle) * radius);
    } else {
      ctx.lineTo(Math.cos(outerAngle) * radius, Math.sin(outerAngle) * radius);
    }
    ctx.quadraticCurveTo(0, 0, Math.cos(innerAngle) * inner, Math.sin(innerAngle) * inner);
  }
  ctx.closePath();
  ctx.fill();

  // Brilliant core dot
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.9));
  ctx.fill();

  ctx.restore();
}

export function GoldenCursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Respect user motion preferences & touch devices
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = null;
    let isRunning = false;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Track cursor trail points for the woven threads
    const trailPoints = [];
    const MAX_TRAIL_AGE = 550; // milliseconds that thread path persists

    // Spring nodes for 3 intertwined flowing threads
    const strands = [
      { x: 0, y: 0, vx: 0, vy: 0, stiffness: 0.35, damping: 0.65, offsetAngle: 0, color: '#FFE680', width: 2.2 },
      { x: 0, y: 0, vx: 0, vy: 0, stiffness: 0.22, damping: 0.60, offsetAngle: Math.PI * 0.66, color: '#FFD700', width: 1.6 },
      { x: 0, y: 0, vx: 0, vy: 0, stiffness: 0.14, damping: 0.55, offsetAngle: Math.PI * 1.33, color: '#C9A962', width: 1.2 },
    ];

    // Particle storage for glitter and star sparkles
    let particles = [];
    const MAX_PARTICLES = 220;

    // Current cursor state
    let mouseX = -100;
    let mouseY = -100;
    let lastMouseX = -100;
    let lastMouseY = -100;
    let lastMoveTime = 0;

    function handleResize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    function spawnGlitter(x, y, dx, dy, count) {
      for (let i = 0; i < count; i++) {
        if (particles.length >= MAX_PARTICLES) {
          particles.shift(); // Evict oldest
        }

        const isStar = Math.random() < 0.32;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.2 + 0.4;
        const color = GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)];

        particles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * speed + dx * 0.12,
          vy: Math.sin(angle) * speed + dy * 0.12 - 0.3, // slight upward float
          size: isStar ? Math.random() * 4.5 + 3.5 : Math.random() * 2.2 + 1.2,
          isStar,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          color,
          life: 1.0,
          decay: Math.random() * 0.022 + 0.016, // lasts approx 45-60 frames
          twinkleSpeed: Math.random() * 0.18 + 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function onMouseMove(e) {
      const now = performance.now();
      mouseX = e.clientX;
      mouseY = e.clientY;

      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      const dist = Math.hypot(dx, dy);

      // Initialize strands if first move
      if (lastMouseX < 0) {
        strands.forEach((s) => {
          s.x = mouseX;
          s.y = mouseY;
        });
        lastMouseX = mouseX;
        lastMouseY = mouseY;
      }

      // Add to thread path history
      trailPoints.push({
        x: mouseX,
        y: mouseY,
        time: now,
      });

      // Spawn glitter sparkles proportional to movement distance
      if (dist > 3) {
        const spawnCount = Math.min(6, Math.max(2, Math.floor(dist / 14)));
        spawnGlitter(mouseX, mouseY, dx, dy, spawnCount);
      }

      lastMouseX = mouseX;
      lastMouseY = mouseY;
      lastMoveTime = now;

      // Start animation loop if paused
      if (!isRunning) {
        isRunning = true;
        animFrameId = requestAnimationFrame(render);
      }
    }

    function onMouseLeave() {
      mouseX = -100;
      mouseY = -100;
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });

    function render(currentTime) {
      // Clear viewport
      ctx.clearRect(0, 0, width, height);

      // Prune old trail points
      const cutoff = currentTime - MAX_TRAIL_AGE;
      while (trailPoints.length > 0 && trailPoints[0].time < cutoff) {
        trailPoints.shift();
      }

      // Update strands spring physics
      if (mouseX >= 0) {
        strands.forEach((strand, idx) => {
          // Subtle circular offset wave so strands weave gracefully
          const wave = Math.sin(currentTime * 0.005 + strand.offsetAngle) * 3;
          const targetX = mouseX + Math.cos(strand.offsetAngle) * wave;
          const targetY = mouseY + Math.sin(strand.offsetAngle) * wave;

          const ax = (targetX - strand.x) * strand.stiffness;
          const ay = (targetY - strand.y) * strand.stiffness;

          strand.vx = (strand.vx + ax) * strand.damping;
          strand.vy = (strand.vy + ay) * strand.damping;

          strand.x += strand.vx;
          strand.y += strand.vy;
        });
      }

      // Draw Golden Threads
      if (trailPoints.length > 2) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'screen';

        strands.forEach((strand) => {
          ctx.beginPath();
          ctx.moveTo(trailPoints[0].x, trailPoints[0].y);

          for (let i = 1; i < trailPoints.length - 1; i++) {
            const pt = trailPoints[i];
            const nextPt = trailPoints[i + 1];

            // Smooth curve through midpoints
            const midX = (pt.x + nextPt.x) / 2;
            const midY = (pt.y + nextPt.y) / 2;
            ctx.quadraticCurveTo(pt.x, pt.y, midX, midY);
          }

          // Connect smoothly to the lagging spring head of this strand
          if (mouseX >= 0) {
            ctx.lineTo(strand.x, strand.y);
          }

          // Shimmering thread glow
          ctx.strokeStyle = strand.color;
          ctx.lineWidth = strand.width;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 9;
          ctx.stroke();

          // Subtle secondary bright core line
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.max(0.6, strand.width * 0.35);
          ctx.globalAlpha = 0.55;
          ctx.stroke();
          ctx.globalAlpha = 1;
        });

        ctx.restore();
      }

      // Render Glitter & Sparkle Particles
      if (particles.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          // Physics update
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96; // air resistance
          p.vy *= 0.96;
          p.rotation += p.rotationSpeed;
          p.life -= p.decay;

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          // Twinkle oscillation
          const twinkle = Math.sin(p.life * Math.PI * 4 + p.phase) * 0.3 + 0.7;
          const currentAlpha = p.life * twinkle;

          if (p.isStar) {
            // Draw four-point star sparkle
            drawStar(ctx, p.x, p.y, p.size * (1 + (1 - p.life) * 0.4), p.rotation, currentAlpha, p.color);
          } else {
            // Draw glowing circular glitter dust
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = currentAlpha * 0.25;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = currentAlpha * 0.85;
            ctx.fill();

            // Tiny bright center point
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = currentAlpha;
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Keep running if there are active threads or particles, or pause to save CPU
      const hasContent = trailPoints.length > 0 || particles.length > 0 || currentTime - lastMoveTime < 600;
      if (hasContent) {
        animFrameId = requestAnimationFrame(render);
      } else {
        isRunning = false;
        ctx.clearRect(0, 0, width, height);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9997]"
      aria-hidden="true"
    />
  );
}
export default GoldenCursorTrail;
