// =============================================================================
// src/components/three/ParticleBackground.jsx
// =============================================================================
// "Molten Iron" ember field — the site-wide animated background.
//
// Same 3D idea as the old three.js version (points in a 3D volume, perspective
// camera at z=80 / fov 75, camera follows the mouse), but drawn on a plain 2D
// canvas: forge sparks rise, cool from yellow to red and glow additively.
// No three.js needed, so the page loads much lighter.
//
// - Respects prefers-reduced-motion (draws one still frame, no loop)
// - Pauses while the tab is hidden
// - Caps devicePixelRatio at 2 and scales the count down on small screens
// =============================================================================

import { useEffect, useRef } from "react";

export default function ParticleBackground({
  particleCount = 110, // number of embers (scaled down on phones)
  particleSize = 0.8, // base ember size
  particleOpacity = 0.85, // peak brightness
  speed = 1, // rise speed multiplier
  mouseInfluence = 15, // how much the camera follows the mouse
  glow = true, // soft halo around each ember
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const CAM_Z = 80;
    let width = 0;
    let height = 0;
    let focal = 1;
    let frameId = 0;
    let tick = 0;
    const cam = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };

    const isSmall = window.innerWidth < 768;
    const count = Math.max(20, Math.round(particleCount * (isSmall ? 0.55 : 1)));

    const spawn = (p, anywhere) => {
      p.x = (Math.random() - 0.5) * 240;
      p.z = -100 + Math.random() * 140; // keep embers between the camera and the far wall
      p.y = anywhere ? (Math.random() - 0.5) * 220 : -110 - Math.random() * 20;
      p.vy = (0.12 + Math.random() * 0.35) * speed;
      p.phase = Math.random() * Math.PI * 2;
      p.big = Math.random() < 0.08;
      return p;
    };
    const embers = Array.from({ length: count }, () => spawn({}, true));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      focal = height / 2 / Math.tan((37.5 * Math.PI) / 180);
    };

    // k: 0 = just spawned (hot yellow) → 1 = top (cooled red)
    const color = (k, alpha) =>
      `rgba(255,${Math.round(216 - 150 * k)},${Math.round(74 - 40 * k)},${alpha.toFixed(3)})`;

    const draw = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      cam.x += (mouse.x * mouseInfluence - cam.x) * 0.02;
      cam.y += (-mouse.y * mouseInfluence - cam.y) * 0.02;

      for (const p of embers) {
        p.y += p.vy;
        p.x += Math.sin(tick * 0.012 + p.phase) * 0.05;
        if (p.y > 115) spawn(p, false);

        const depth = CAM_Z - p.z;
        if (depth < 40) continue; // too close to the camera — would render as big blobs
        const scale = focal / depth;
        const sx = width / 2 + (p.x - cam.x) * scale;
        const sy = height / 2 - (p.y - cam.y) * scale;
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

        const k = Math.min(1, Math.max(0, (p.y + 110) / 220));
        const flicker = 0.75 + 0.25 * Math.sin(tick * 0.2 + p.phase * 3);
        const alpha = (1 - k) * particleOpacity * flicker;
        const r = Math.min(p.big ? 3.6 : 2.6, Math.max(0.8, particleSize * scale * (p.big ? 0.6 : 0.35)));

        if (glow) {
          ctx.fillStyle = color(k, alpha * 0.22);
          ctx.beginPath();
          ctx.arc(sx, sy, r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = color(k, alpha);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.big) {
          ctx.strokeStyle = color(k, alpha * 0.5);
          ctx.lineWidth = r * 0.8;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + p.vy * scale * 14);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      if (!document.hidden) draw();
      frameId = requestAnimationFrame(loop);
    };

    const onMouse = (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 0.2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 0.2;
    };
    const onResize = () => {
      resize();
      if (reduceMotion) draw();
    };

    resize();
    window.addEventListener("resize", onResize);

    if (reduceMotion) {
      draw();
    } else {
      window.addEventListener("mousemove", onMouse, { passive: true });
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [particleCount, particleSize, particleOpacity, speed, mouseInfluence, glow]);

  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      {/* Forge glow from below */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 40% at 60% 100%, rgba(58,26,14,0.75) 0%, rgba(26,17,16,0.35) 45%, rgba(10,10,11,0) 80%)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block", maxWidth: "none" }}
      />
    </div>
  );
}
