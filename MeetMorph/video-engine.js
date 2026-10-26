/**
 * OmeTV Vanish - Video Processing Engine
 * Handles real-time canvas rendering, 30fps stream generation,
 * empty-room background capture, aspect ratio preservation, and state transitions.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VideoEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATES = {
    IDLE: 'IDLE',
    INITIALIZING: 'INITIALIZING',
    VISIBLE: 'VISIBLE',
    COUNTDOWN: 'COUNTDOWN',
    CAPTURING: 'CAPTURING',
    VANISHED: 'VANISHED',
    ERROR: 'ERROR'
  };

  class VideoEngine {
    constructor(options = {}) {
      this.targetFps = options.targetFps || 30;
      this.transitionDuration = options.transitionDuration !== undefined ? options.transitionDuration : 120; // ms
      this.minBrightnessThreshold = options.minBrightnessThreshold || 14; // Average luma threshold (0-255)

      // State
      this.state = STATES.IDLE;
      this.isVanished = false;
      this.lastError = null;

      // Streams & Elements
      this.rawStream = null;
      this.rawVideoTrack = null;
      this.videoElement = null;
      this.canvas = null;
      this.ctx = null;
      this.canvasStream = null;
      this.processedVideoTrack = null;

      // Captured Background
      this.backgroundImage = null;
      this.backgroundDataUrl = null;
      this.backgroundMetadata = null;

      // Loop & Metrics
      this.animFrameId = null;
      this.lastFrameTime = 0;
      this.frameInterval = 1000 / this.targetFps;
      this.currentFps = 0;
      this.frameCount = 0;
      this.fpsTimer = 0;

      // Transition state
      this.transitionStartTime = 0;
      this.transitionProgress = 1.0;
      this.transitioningTo = null; // 'VANISHED' or 'VISIBLE'

      // Countdown
      this.countdownInterval = null;
      this.countdownRemaining = 0;

      // Event Callbacks
      this.listeners = {
        stateChange: [],
        countdownTick: [],
        backgroundCaptured: [],
        fpsUpdate: [],
        error: []
      };

      // Bindings
      this._renderLoop = this._renderLoop.bind(this);
    }

    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    }

    emit(event, data) {
      if (this.listeners[event]) {
        for (const cb of this.listeners[event]) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[VideoEngine] Error in ${event} listener:`, err);
          }
        }
      }
    }

    _setState(newState) {
      if (this.state !== newState) {
        const oldState = this.state;
        this.state = newState;
        this.emit('stateChange', { oldState, newState, isVanished: this.isVanished });
      }
    }

    /**
     * Initializes the engine with an existing MediaStream or raw video track.
     */
    async initWithStream(mediaStream) {
      try {
        this._setState(STATES.INITIALIZING);
        this.rawStream = mediaStream;
        const videoTracks = mediaStream.getVideoTracks();
        if (!videoTracks || videoTracks.length === 0) {
          throw new Error('Provided MediaStream does not contain any video tracks.');
        }

        this.rawVideoTrack = videoTracks[0];

        // Track lifecycle handlers
        this.rawVideoTrack.onended = () => {
          console.warn('[VideoEngine] Source video track ended.');
          this.stop();
        };

        // Create internal video element to play incoming raw stream
        if (typeof document !== 'undefined') {
          if (!this.videoElement) {
            this.videoElement = document.createElement('video');
            this.videoElement.autoplay = true;
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;
            this.videoElement.style.position = 'fixed';
            this.videoElement.style.top = '-9999px';
            this.videoElement.style.left = '-9999px';
            this.videoElement.style.opacity = '0';
            this.videoElement.style.pointerEvents = 'none';
            document.body.appendChild(this.videoElement);
          }

          this.videoElement.srcObject = mediaStream;

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timed out waiting for video element metadata.'));
            }, 6000);

            this.videoElement.onloadedmetadata = () => {
              clearTimeout(timeout);
              if (this.videoElement && typeof this.videoElement.play === 'function') {
                this.videoElement.play().then(resolve).catch(resolve);
              } else {
                resolve();
              }
            };
          });

          // Create canvas matching video's native resolution
          const width = this.videoElement.videoWidth || 1280;
          const height = this.videoElement.videoHeight || 720;

          if (!this.canvas) {
            this.canvas = document.createElement('canvas');
          }
          this.canvas.width = width;
          this.canvas.height = height;
          this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });

          // Generate the processed 30fps canvas stream
          if (this.canvas.captureStream) {
            this.canvasStream = this.canvas.captureStream(this.targetFps);
            this.processedVideoTrack = this.canvasStream.getVideoTracks()[0];
          } else {
            console.warn('[VideoEngine] canvas.captureStream not supported in this environment.');
          }

          // Restore previously stored background if available
          if (this.backgroundDataUrl && !this.backgroundImage) {
            await this.loadBackgroundFromDataUrl(this.backgroundDataUrl);
          }

          this.isVanished = false;
          this._setState(STATES.VISIBLE);
          this._startRenderLoop();
        }

        return this.processedVideoTrack;
      } catch (err) {
        this.lastError = err.message;
        this._setState(STATES.ERROR);
        this.emit('error', err);
        throw err;
      }
    }

    /**
     * Start the 30 FPS rendering loop.
     */
    _startRenderLoop() {
      if (this.animFrameId) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.animFrameId);
        } else {
          clearTimeout(this.animFrameId);
        }
      }
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      this.fpsTimer = performance.now();
      this._renderLoop();
    }

    _renderLoop() {
      if (this.state === STATES.IDLE || this.state === STATES.ERROR) {
        return;
      }

      this.animFrameId = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(this._renderLoop)
        : setTimeout(this._renderLoop, 1000 / this.targetFps);

      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      // FPS calculation every 1000ms
      this.frameCount++;
      if (now - this.fpsTimer >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = now;
        this.emit('fpsUpdate', { fps: this.currentFps });
      }

      // Throttle render loop to target FPS if necessary
      if (elapsed < this.frameInterval - 2) {
        return;
      }
      this.lastFrameTime = now - (elapsed % this.frameInterval);

      this._drawFrame(now);
    }

    /**
     * Draws the appropriate frame onto the canvas.
     */
    _drawFrame(now) {
      if (!this.ctx || !this.canvas) return;

      const cw = this.canvas.width;
      const ch = this.canvas.height;

      // Handle transition blending
      let alpha = 1.0;
      if (this.transitioningTo) {
        const transElapsed = now - this.transitionStartTime;
        alpha = Math.min(1.0, transElapsed / this.transitionDuration);
        if (alpha >= 1.0) {
          this.transitioningTo = null;
        }
      }

      const isLiveVisible = !this.isVanished || this.transitioningTo === 'VISIBLE';
      const isVanishedVisible = this.isVanished || this.transitioningTo === 'VANISHED';

      if (this.transitioningTo) {
        // Crossfade between live video and background
        if (this.transitioningTo === 'VANISHED') {
          // Fading from Live -> Background
          this._drawLiveFrame(cw, ch);
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this._drawBackgroundFrame(cw, ch);
          this.ctx.restore();
        } else {
          // Fading from Background -> Live
          this._drawBackgroundFrame(cw, ch);
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this._drawLiveFrame(cw, ch);
          this.ctx.restore();
        }
      } else if (this.isVanished) {
        // Full Vanished Mode: Draw stationary captured empty room
        this._drawBackgroundFrame(cw, ch);
      } else {
        // Full Visible Mode: Draw live webcam feed
        this._drawLiveFrame(cw, ch);
      }
    }

    _drawLiveFrame(cw, ch) {
      if (!this.videoElement || this.videoElement.readyState < 2) {
        // Black frame or loading state
        this.ctx.fillStyle = '#111116';
        this.ctx.fillRect(0, 0, cw, ch);
        return;
      }

      // Draw video maintaining native aspect ratio
      const vw = this.videoElement.videoWidth;
      const vh = this.videoElement.videoHeight;
      if (vw && vh && (cw !== vw || ch !== vh)) {
        this.canvas.width = vw;
        this.canvas.height = vh;
        cw = vw;
        ch = vh;
      }

      this.ctx.drawImage(this.videoElement, 0, 0, cw, ch);
    }

    _drawBackgroundFrame(cw, ch) {
      if (this.backgroundImage && this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
        this.ctx.drawImage(this.backgroundImage, 0, 0, cw, ch);
      } else {
        // Fallback placeholder if background missing
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, cw, ch);
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Empty Room Background Not Captured', cw / 2, ch / 2);
      }
    }

    /**
     * Start the 3-second countdown and capture the clean empty room frame.
     */
    async captureEmptyBackground(countdownSeconds = 3) {
      if (!this.videoElement || this.videoElement.readyState < 2) {
        throw new Error('Camera is not active or video frame is unavailable for capture.');
      }

      if (this.state === STATES.COUNTDOWN || this.state === STATES.CAPTURING) {
        return;
      }

      return new Promise((resolve, reject) => {
        this.countdownRemaining = countdownSeconds;
        this._setState(STATES.COUNTDOWN);
        this.emit('countdownTick', { secondsRemaining: this.countdownRemaining });

        this.countdownInterval = setInterval(() => {
          this.countdownRemaining -= 1;
          this.emit('countdownTick', { secondsRemaining: this.countdownRemaining });

          if (this.countdownRemaining <= 0) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
            this._setState(STATES.CAPTURING);

            try {
              const result = this._doCapture();
              resolve(result);
            } catch (err) {
              this._setState(this.isVanished ? STATES.VANISHED : STATES.VISIBLE);
              reject(err);
            }
          }
        }, 1000);
      });
    }

    cancelCountdown() {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      this.countdownRemaining = 0;
      this._setState(this.isVanished ? STATES.VANISHED : STATES.VISIBLE);
    }

    _doCapture() {
      const vw = this.videoElement.videoWidth || this.canvas.width;
      const vh = this.videoElement.videoHeight || this.canvas.height;

      // Offscreen canvas for full-resolution snapshot
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = vw;
      snapCanvas.height = vh;
      const snapCtx = snapCanvas.getContext('2d', { alpha: false });
      snapCtx.drawImage(this.videoElement, 0, 0, vw, vh);

      // Analyze image brightness and quality
      const imgData = snapCtx.getImageData(0, 0, vw, vh);
      const brightness = this._calculateAverageLuma(imgData);

      if (brightness < this.minBrightnessThreshold) {
        const warning = `Captured image is too dark (average brightness: ${brightness.toFixed(1)}/255). Please ensure the room is well-lit.`;
        console.warn(`[VideoEngine] ${warning}`);
        throw new Error(warning);
      }

      // Convert to full-quality JPEG
      const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.95);
      this.backgroundDataUrl = dataUrl;
      this.backgroundMetadata = {
        width: vw,
        height: vh,
        capturedAt: new Date().toISOString(),
        averageBrightness: brightness
      };

      // Load into HTMLImageElement
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        this._setState(this.isVanished ? STATES.VANISHED : STATES.VISIBLE);
        this.emit('backgroundCaptured', {
          dataUrl: this.backgroundDataUrl,
          metadata: this.backgroundMetadata
        });
      };
      img.onerror = (e) => {
        console.error('[VideoEngine] Failed to load captured background image element:', e);
      };
      img.src = dataUrl;

      return {
        dataUrl,
        metadata: this.backgroundMetadata
      };
    }

    /**
     * Compute perceived luminance (Rec. 601 Luma formula)
     */
    _calculateAverageLuma(imageData) {
      const data = imageData.data;
      let totalLuma = 0;
      const sampleStep = 4 * 8; // Sample every 8th pixel for speed
      let sampleCount = 0;

      for (let i = 0; i < data.length; i += sampleStep) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        sampleCount++;
      }

      return sampleCount > 0 ? totalLuma / sampleCount : 0;
    }

    /**
     * Loads a background from a previously stored base64 data URL.
     */
    async loadBackgroundFromDataUrl(dataUrl) {
      if (!dataUrl) return false;
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.backgroundImage = img;
          this.backgroundDataUrl = dataUrl;
          this.backgroundMetadata = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            restored: true
          };
          resolve(true);
        };
        img.onerror = () => {
          console.warn('[VideoEngine] Could not load background from data URL.');
          resolve(false);
        };
        img.src = dataUrl;
      });
    }

    /**
     * Switch to Vanish Mode: outgoing video will show the captured empty room.
     */
    vanish() {
      if (!this.backgroundImage) {
        throw new Error('Cannot vanish: You must capture an empty background image first.');
      }

      if (this.isVanished) {
        return; // Already vanished
      }

      this.isVanished = true;
      if (this.transitionDuration > 0) {
        this.transitioningTo = 'VANISHED';
        this.transitionStartTime = performance.now();
      }
      this._setState(STATES.VANISHED);
    }

    /**
     * Switch to Return Mode: outgoing video resumes the live webcam feed.
     */
    return() {
      if (!this.isVanished) {
        return; // Already visible
      }

      this.isVanished = false;
      if (this.transitionDuration > 0) {
        this.transitioningTo = 'VISIBLE';
        this.transitionStartTime = performance.now();
      }
      this._setState(STATES.VISIBLE);
    }

    /**
     * Toggle between Vanish and Return modes.
     */
    toggle() {
      if (this.isVanished) {
        this.return();
      } else {
        this.vanish();
      }
      return this.isVanished;
    }

    getProcessedTrack() {
      return this.processedVideoTrack;
    }

    getProcessedStream() {
      return this.canvasStream;
    }

    getDiagnosticInfo() {
      return {
        state: this.state,
        isVanished: this.isVanished,
        fps: this.currentFps,
        resolution: this.canvas ? { width: this.canvas.width, height: this.canvas.height } : null,
        hasBackground: !!this.backgroundImage,
        backgroundMetadata: this.backgroundMetadata,
        hasRawStream: !!this.rawStream,
        hasProcessedTrack: !!this.processedVideoTrack,
        trackId: this.processedVideoTrack ? this.processedVideoTrack.id : null,
        trackReadyState: this.processedVideoTrack ? this.processedVideoTrack.readyState : null,
        lastError: this.lastError
      };
    }

    /**
     * Clean up all resources, stop animation frames, and release video tracks.
     */
    stop() {
      if (this.animFrameId) {
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this.animFrameId);
        } else {
          clearTimeout(this.animFrameId);
        }
        this.animFrameId = null;
      }
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }

      if (this.videoElement) {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
        if (this.videoElement.parentNode) {
          this.videoElement.parentNode.removeChild(this.videoElement);
        }
        this.videoElement = null;
      }

      if (this.canvasStream) {
        for (const track of this.canvasStream.getTracks()) {
          track.stop();
        }
        this.canvasStream = null;
      }

      this.processedVideoTrack = null;
      this.isVanished = false;
      this._setState(STATES.IDLE);
    }
  }

  VideoEngine.STATES = STATES;
  return VideoEngine;
});
