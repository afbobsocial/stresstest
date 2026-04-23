class KeystrokeTracker {
    constructor() {
        this.currentMode = 'type'; // 'type' or 'voice'
        
        this.keystrokes = [];
        this.activeKeys = new Map();
        this.intensity = 0;
        this.targetIntensity = 0;
        
        // Pacing configuration
        this.maxHistoryTime = 30000; 
        this.maxKeysPerSecond = 150 / 60; 
        
        // Audio API variables
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.timeDomainArray = null;
        this.audioVolume = 0;

        // UI State
        this.isCalmingDown = false;
        this.sessionStartTime = null;
        
        this.setupUI();
        this.setupParticles();
        this.setupVisualizer();
        this.loop();
    }

    setupUI() {
        const startBtn = document.getElementById('start-btn');
        const landingOverlay = document.getElementById('landing-overlay');
        const dismissBtn = document.getElementById('dismiss-popup-btn');
        const calmPopup = document.getElementById('calm-popup');
        const textarea = document.getElementById('text-input');
        const homeBtn = document.getElementById('home-btn');
        
        const btnType = document.getElementById('btn-type');
        const btnVoice = document.getElementById('btn-voice');
        const visualizer = document.getElementById('audio-visualizer');

        startBtn.addEventListener('click', async () => {
            landingOverlay.classList.remove('active');
            this.sessionStartTime = performance.now();
            await this.initAudio();
            if (this.currentMode === 'type') textarea.focus();
        });

        homeBtn.addEventListener('click', () => {
            location.reload();
        });

        dismissBtn.addEventListener('click', () => {
            calmPopup.classList.remove('active');
            this.isCalmingDown = false;
            this.intensity = 0;
            this.targetIntensity = 0;
            this.keystrokes = [];
            this.sessionStartTime = performance.now();
            textarea.value = ''; 
            if (this.currentMode === 'type') textarea.focus();
        });

        btnType.addEventListener('click', () => {
            this.currentMode = 'type';
            btnType.classList.add('active');
            btnVoice.classList.remove('active');
            textarea.style.display = 'block';
            visualizer.style.display = 'none';
            textarea.focus();
            
            // Reset intensity smoothly when switching
            this.targetIntensity = 0;
            this.keystrokes = [];
        });

        btnVoice.addEventListener('click', async () => {
            this.currentMode = 'voice';
            btnVoice.classList.add('active');
            btnType.classList.remove('active');
            textarea.style.display = 'none';
            visualizer.style.display = 'block';
            
            // Reset intensity smoothly when switching
            this.targetIntensity = 0;
            this.keystrokes = [];
            
            if (!this.audioContext) {
                await this.initAudio();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.isCalmingDown || e.repeat || this.currentMode !== 'type') return;
            const now = performance.now();
            this.keystrokes.push(now);
            this.activeKeys.set(e.code, now);
            this.triggerEffects();
        });

        document.addEventListener('keyup', (e) => {
            if (this.currentMode === 'type') {
                this.activeKeys.delete(e.code);
            }
        });

        document.addEventListener('click', () => {
            if (this.currentMode === 'type' && !landingOverlay.classList.contains('active') && !calmPopup.classList.contains('active')) {
                textarea.focus();
            }
        });
    }

    async initAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048; // Larger for smoother waveform
            
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeDomainArray = new Uint8Array(this.analyser.frequencyBinCount);
        } catch (err) {
            console.warn('Microphone access denied or unavailable.', err);
        }
    }

    updateAudioVolume() {
        if (!this.analyser || !this.dataArray) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getByteTimeDomainData(this.timeDomainArray);
        
        // Find peak volume
        let maxVal = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            if (this.dataArray[i] > maxVal) maxVal = this.dataArray[i];
        }
        
        let rawVolume = maxVal / 255.0;
        
        if (rawVolume < 0.15) rawVolume = 0;
        else rawVolume = (rawVolume - 0.15) / 0.85; 
        
        rawVolume = Math.pow(rawVolume, 1.5);
        
        this.audioVolume += (rawVolume - this.audioVolume) * 0.2; 
    }

    triggerEffects() {
        if (this.intensity > 0.8 && !this.isCalmingDown) {
            const shakeAmount = (this.intensity - 0.8) * 30;
            const root = document.documentElement;
            root.style.setProperty('--shake', `${(Math.random() - 0.5) * shakeAmount}px`);
            
            if (Math.random() > 0.7) {
                document.body.classList.add('aggressive-glitch');
                setTimeout(() => document.body.classList.remove('aggressive-glitch'), 150);
            }

            setTimeout(() => {
                root.style.setProperty('--shake', `0px`);
            }, 50);
        }
    }

    checkPopup() {
        if (this.intensity >= 0.99 && !this.isCalmingDown) {
            this.isCalmingDown = true;
            
            const timeTaken = performance.now() - this.sessionStartTime;
            const totalSeconds = Math.floor(timeTaken / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            document.getElementById('popup-time-msg').innerText = `It took you ${formattedTime} to get agitated.`;
            
            document.getElementById('calm-popup').classList.add('active');
            if (this.currentMode === 'type') {
                document.getElementById('text-input').blur();
            }
        }
    }

    setupParticles() {
        this.canvas = document.getElementById('particles-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.numParticles = 100;

        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                baseRadius: Math.random() * 2 + 1
            });
        }
    }

    setupVisualizer() {
        this.visCanvas = document.getElementById('audio-visualizer');
        this.visCtx = this.visCanvas.getContext('2d');
        
        const resizeVis = () => {
            const rect = this.visCanvas.parentElement.getBoundingClientRect();
            // Match the approximate size of the textarea
            this.visCanvas.width = window.innerWidth * 0.8;
            this.visCanvas.height = window.innerHeight * 0.4;
        };
        window.addEventListener('resize', resizeVis);
        resizeVis();
    }

    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Colors from White (low intensity) to Red #ef4444 (high intensity)
        const r = Math.floor(255 - this.intensity * (255 - 239));
        const g = Math.floor(255 - this.intensity * (255 - 68));
        const b = Math.floor(255 - this.intensity * (255 - 68));
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.2 + this.intensity * 0.8})`;

        const speedMultiplier = 1 + (this.intensity * 15);
        const radiusMultiplier = 1 + (this.intensity * 2);

        for (const p of this.particles) {
            p.x += p.vx * speedMultiplier;
            p.y += p.vy * speedMultiplier;

            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            let jitterX = 0;
            let jitterY = 0;
            if (this.intensity > 0.8) {
                jitterX = (Math.random() - 0.5) * this.intensity * 10;
                jitterY = (Math.random() - 0.5) * this.intensity * 10;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x + jitterX, p.y + jitterY, p.baseRadius * radiusMultiplier, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawVisualizer() {
        if (this.currentMode !== 'voice' || !this.timeDomainArray) return;
        
        this.visCtx.clearRect(0, 0, this.visCanvas.width, this.visCanvas.height);
        
        // Colors from White to Red #ef4444
        const r = Math.floor(255 - this.intensity * (255 - 239));
        const g = Math.floor(255 - this.intensity * (255 - 68));
        const b = Math.floor(255 - this.intensity * (255 - 68));
        
        // Line thickness increases with intensity
        this.visCtx.lineWidth = 1 + (this.intensity * 10);
        this.visCtx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        this.visCtx.lineCap = 'square'; // brutalist edges
        this.visCtx.lineJoin = 'miter';
        
        this.visCtx.beginPath();
        
        const sliceWidth = this.visCanvas.width * 1.0 / this.timeDomainArray.length;
        let x = 0;
        
        // Multiply amplitude by intensity to make it jump more wildly when aggressive
        const amplitudeMultiplier = 1 + (this.intensity * 2);

        for (let i = 0; i < this.timeDomainArray.length; i++) {
            const v = this.timeDomainArray[i] / 128.0;
            const y = (v * this.visCanvas.height / 2);
            
            // Apply amplitude multiplier from the center
            const centerY = this.visCanvas.height / 2;
            const dy = y - centerY;
            const finalY = centerY + (dy * amplitudeMultiplier);

            if (i === 0) {
                this.visCtx.moveTo(x, finalY);
            } else {
                this.visCtx.lineTo(x, finalY);
            }
            x += sliceWidth;
        }
        
        this.visCtx.lineTo(this.visCanvas.width, this.visCanvas.height / 2);
        this.visCtx.stroke();
    }

    loop() {
        if (!this.isCalmingDown) {
            const now = performance.now();
            
            if (this.currentMode === 'type') {
                this.keystrokes = this.keystrokes.filter(time => now - time < this.maxHistoryTime);
                const timeSinceLastKey = this.keystrokes.length > 0 ? (now - this.keystrokes[this.keystrokes.length - 1]) : 0;
                
                if (timeSinceLastKey > 1500 && this.keystrokes.length > 0) {
                    this.keystrokes.splice(0, Math.ceil(this.keystrokes.length * 0.05));
                }
                
                const keysPerSecond = this.keystrokes.length / (this.maxHistoryTime / 1000);
                let typingIntensity = keysPerSecond / this.maxKeysPerSecond;
                const activeCount = this.activeKeys.size;
                let overlapBoost = Math.max(0, (activeCount - 1) * 0.1);
                
                this.targetIntensity = Math.min(typingIntensity + overlapBoost, 1.0);
                
                if (timeSinceLastKey > 1500) {
                    this.targetIntensity = 0;
                }
            } else if (this.currentMode === 'voice') {
                this.updateAudioVolume();
                this.targetIntensity = this.audioVolume;
                
                // Also trigger screen shake randomly if voice is very loud
                if (this.targetIntensity > 0.8) {
                    this.triggerEffects();
                }
            }

            if (this.targetIntensity > this.intensity) {
                this.intensity += (this.targetIntensity - this.intensity) * 0.05;
            } else {
                this.intensity += (this.targetIntensity - this.intensity) * 0.08; 
            }

            this.applyVisuals();
            this.checkPopup();
        }
        
        this.drawParticles();
        if (this.currentMode === 'voice') {
            this.drawVisualizer();
        }
        
        requestAnimationFrame(() => this.loop());
    }

    applyVisuals() {
        const root = document.documentElement;
        
        root.style.setProperty('--intensity', this.intensity);
        
        const weight = 300 + (this.intensity * 600);
        root.style.setProperty('--font-weight', weight);
        
        const spacing = 0.05 - (this.intensity * 0.1);
        root.style.setProperty('--letter-spacing', `${spacing}em`);
        
        const duration = 1.2 - (this.intensity * 1.1);
        root.style.setProperty('--transition-duration', `${duration}s`);
        
        // Background stays black in brutalist theme, text shifts to red
        const percent = this.intensity * 100;
        const textMix = `color-mix(in srgb, #ef4444 ${percent}%, #ffffff)`;
        root.style.setProperty('--text-color', textMix);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new KeystrokeTracker();
});
