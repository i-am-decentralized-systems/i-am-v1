/**
 * Starfield Animation - Canvas background effect
 */

export class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.animationId = null;
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.generateStars();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    generateStars() {
        const colors = ['#00d4ff', '#00ff88', '#ff9500', '#ffd500'];
        this.stars = [];
        
        for (let i = 0; i < 500; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.3,
                speed: Math.random() * 0.5 + 0.2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    animate() {
        this.ctx.fillStyle = 'rgba(5, 8, 16, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.stars.forEach(star => {
            star.y += star.speed;
            
            // Reset star when it goes off screen
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }

            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillRect(star.x, star.y, star.size, star.size * 2);
        });

        this.ctx.globalAlpha = 1;
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
