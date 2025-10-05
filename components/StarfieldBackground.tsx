"use client";

import { useEffect, useRef } from "react";

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Star properties
    const stars: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      twinkleSpeed: number;
    }> = [];

    const starCount = 150;

    // Create stars with no movement, just twinkling
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        speed: 0, // No movement - stars are stationary
        opacity: Math.random() * 0.4 + 0.1, // Lower opacity range
        twinkleSpeed: Math.random() * 0.02 + 0.01, // Normal twinkle speed
      });
    }

    let animationId: number;
    let time = 0;

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(11, 14, 19, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        // No movement - stars stay in place
        // Only twinkle effect
        star.opacity = Math.sin(time * star.twinkleSpeed) * 0.5 + 0.5;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // Add glow for larger stars
        if (star.size > 1) {
          const gradient = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            star.size * 3
          );
          gradient.addColorStop(0, `rgba(0, 180, 216, ${star.opacity * 0.3})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      time += 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <div className="starfield" />
      <div className="grid-overlay" />
    </>
  );
}