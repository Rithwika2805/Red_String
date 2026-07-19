import React, { useEffect, useRef } from 'react';

export const BackgroundRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Rain drop class representing drops running down glass
    class Drop {
      x: number;
      y: number;
      velY: number;
      size: number;
      alpha: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height - height;
        this.velY = 2 + Math.random() * 4;
        this.size = 1 + Math.random() * 2;
        this.alpha = 0.1 + Math.random() * 0.3;
      }

      update() {
        this.y += this.velY;
        if (this.y > height) {
          this.y = -20;
          this.x = Math.random() * width;
          this.velY = 2 + Math.random() * 4;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(156, 163, 175, ${this.alpha})`;
        ctx.lineWidth = this.size;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.size * 10);
        ctx.stroke();
      }
    }

    // Splatters running slower down window
    class GlassDrip {
      x: number;
      y: number;
      velY: number;
      size: number;
      trail: { x: number; y: number }[];

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.velY = 0.5 + Math.random() * 1.5;
        this.size = 2 + Math.random() * 3;
        this.trail = [];
      }

      update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) {
          this.trail.shift();
        }
        
        // Randomly slide slightly left/right (liquid path)
        this.x += (Math.random() - 0.5) * 0.3;
        this.y += this.velY;

        if (this.y > height) {
          this.y = -50;
          this.x = Math.random() * width;
          this.trail = [];
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(209, 213, 219, 0.15)';
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw slide trail
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(209, 213, 219, 0.05)';
        ctx.lineWidth = this.size * 0.5;
        if (this.trail.length > 1) {
          ctx.moveTo(this.trail[0].x, this.trail[0].y);
          for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
          }
          ctx.stroke();
        }
      }
    }

    const drops: Drop[] = Array.from({ length: 60 }, () => new Drop());
    const drips: GlassDrip[] = Array.from({ length: 25 }, () => new GlassDrip());

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Dark background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a0a0c');
      grad.addColorStop(1, '#050507');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      drops.forEach((drop) => {
        drop.update();
        drop.draw();
      });

      drips.forEach((drip) => {
        drip.update();
        drip.draw();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 rain-blur"
    />
  );
};
export default BackgroundRain;
