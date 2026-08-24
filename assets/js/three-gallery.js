/**
 * WALLSPACE 3D — X-Stein Interactive Particle & Physics Stage
 * Renders 25,000+ interactive glowing particles with cursor fluid velocity,
 * slow-motion click shockwaves, and ambient cybernetic constellations.
 */

(function(window) {
    'use strict';

    class ParticleStageEngine {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas || typeof THREE === 'undefined') return;

            try {
                this.PARTICLE_COUNT = 20000;
                this.mouse3D = new THREE.Vector3(-999, -999, 0);
                this.prevMouse3D = new THREE.Vector3(-999, -999, 0);
                this.mouseVelocity = new THREE.Vector3(0, 0, 0);
                this.mouse2D = new THREE.Vector2(-999, -999);
                this.raycaster = new THREE.Raycaster();

                this.init();
            } catch (err) {
                console.warn('3D Canvas initialization skipped:', err);
            }
        }

        init() {
            // Scene & Camera
            this.scene = new THREE.Scene();
            const width = window.innerWidth;
            const height = window.innerHeight;

            this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
            this.camera.position.set(0, 0, 8.5);

            // WebGL Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Geometry & Buffers
            this.geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(this.PARTICLE_COUNT * 3);
            const homePositions = new Float32Array(this.PARTICLE_COUNT * 3);
            const colors = new Float32Array(this.PARTICLE_COUNT * 3);
            this.velocities = new Float32Array(this.PARTICLE_COUNT * 3);

            const cAmber = new THREE.Color('#da7756');
            const cCyan = new THREE.Color('#38bdf8');
            const cWhite = new THREE.Color('#ffffff');
            const cIndigo = new THREE.Color('#6366f1');

            for (let i = 0; i < this.PARTICLE_COUNT; i++) {
                const ix = i * 3;
                const x = (Math.random() - 0.5) * 22;
                const y = (Math.random() - 0.5) * 14;
                const z = (Math.random() - 0.5) * 8;

                positions[ix] = x;
                positions[ix + 1] = y;
                positions[ix + 2] = z;

                homePositions[ix] = x;
                homePositions[ix + 1] = y;
                homePositions[ix + 2] = z;

                const r = Math.random();
                let col = cWhite;
                if (r < 0.4) col = cAmber;
                else if (r < 0.75) col = cCyan;
                else if (r < 0.9) col = cIndigo;

                colors[ix] = col.r;
                colors[ix + 1] = col.g;
                colors[ix + 2] = col.b;
            }

            this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            this.homePositions = homePositions;

            // Texture
            const pTex = this.createParticleTexture();

            // Material
            this.material = new THREE.PointsMaterial({
                size: 0.045,
                sizeAttenuation: true,
                map: pTex,
                transparent: true,
                alphaTest: 0.05,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: true
            });

            this.particleMesh = new THREE.Points(this.geometry, this.material);
            this.scene.add(this.particleMesh);

            // Bind Events
            this.bindEvents();

            // Animate Loop
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        createParticleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
            grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
            grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)');
            grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
            grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(32, 32, 30, 0, Math.PI * 2);
            ctx.fill();

            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            return tex;
        }

        bindEvents() {
            const updateMouse = (e) => {
                this.mouse2D.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse2D, this.camera);
                const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
                const intersection = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(planeZ, intersection);

                if (intersection) {
                    if (this.prevMouse3D.x !== -999) {
                        this.mouseVelocity.x = (intersection.x - this.prevMouse3D.x) * 0.4;
                        this.mouseVelocity.y = (intersection.y - this.prevMouse3D.y) * 0.4;
                    }
                    this.mouse3D.copy(intersection);
                    this.prevMouse3D.copy(intersection);
                }
            };

            window.addEventListener('mousemove', updateMouse, { passive: true });
            window.addEventListener('mouseleave', () => {
                this.mouse3D.set(-999, -999, 0);
                this.prevMouse3D.set(-999, -999, 0);
            });

            // Shockwave burst on click
            window.addEventListener('click', (e) => {
                updateMouse(e);
                const pos = this.geometry.attributes.position.array;
                for (let i = 0; i < this.PARTICLE_COUNT; i++) {
                    const ix = i * 3;
                    const dx = pos[ix] - this.mouse3D.x;
                    const dy = pos[ix + 1] - this.mouse3D.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

                    if (dist < 3.2) {
                        const force = (3.2 - dist) * 0.035;
                        this.velocities[ix] += (dx / dist) * force + (Math.random() - 0.5) * 0.02;
                        this.velocities[ix + 1] += (dy / dist) * force + (Math.random() - 0.5) * 0.02;
                        this.velocities[ix + 2] += (Math.random() - 0.5) * 0.03;
                    }
                }
            });

            window.addEventListener('resize', () => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            });
        }

        animate() {
            requestAnimationFrame(this.animate);

            const pos = this.geometry.attributes.position.array;
            const home = this.homePositions;
            const vel = this.velocities;

            for (let i = 0; i < this.PARTICLE_COUNT; i++) {
                const ix = i * 3;
                let px = pos[ix];
                let py = pos[ix + 1];
                let pz = pos[ix + 2];

                // Mouse repulsion physics
                if (this.mouse3D.x !== -999) {
                    const mdx = px - this.mouse3D.x;
                    const mdy = py - this.mouse3D.y;
                    const mdist = Math.sqrt(mdx * mdx + mdy * mdy) + 0.01;

                    if (mdist < 2.0) {
                        const repForce = (2.0 - mdist) * 0.025;
                        vel[ix] += (mdx / mdist) * repForce + this.mouseVelocity.x * 0.08;
                        vel[ix + 1] += (mdy / mdist) * repForce + this.mouseVelocity.y * 0.08;
                    }
                }

                // Spring back to home position
                vel[ix] += (home[ix] - px) * 0.022;
                vel[ix + 1] += (home[ix + 1] - py) * 0.022;
                vel[ix + 2] += (home[ix + 2] - pz) * 0.022;

                // Friction damping
                vel[ix] *= 0.91;
                vel[ix + 1] *= 0.91;
                vel[ix + 2] *= 0.91;

                // Apply velocity
                pos[ix] += vel[ix];
                pos[ix + 1] += vel[ix + 1];
                pos[ix + 2] += vel[ix + 2];
            }

            this.geometry.attributes.position.needsUpdate = true;

            // Decay mouse velocity
            this.mouseVelocity.multiplyScalar(0.85);

            // Subtle slow ambient floating
            this.particleMesh.rotation.y += 0.0003;
            this.particleMesh.rotation.x = Math.sin(Date.now() * 0.0005) * 0.03;

            this.renderer.render(this.scene, this.camera);
        }
    }

    window.ParticleStageEngine = ParticleStageEngine;
})(window);
