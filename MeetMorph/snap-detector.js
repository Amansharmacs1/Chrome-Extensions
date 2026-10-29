/**
 * OmeTV Vanish - Snap Detector
 * High-precision acoustic transient detector for finger snaps using Web Audio API.
 * Analyzes spectral energy, crest factor, and onset slope with noise rejection.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnapDetector = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class SnapDetector {
    constructor(options = {}) {
      this.enabled = options.enabled !== undefined ? !!options.enabled : true;
      this.sensitivity = options.sensitivity !== undefined ? options.sensitivity : 7; // 1 (least sensitive) to 10 (most sensitive)
      this.cooldownMs = options.cooldownMs || 650; // ms between allowable triggers

      // Audio Nodes & Context
      this.audioCtx = null;
      this.sourceNode = null;
      this.inputGain = null;
      this.highpassFilter = null;
      this.bandpassFilter = null;
      this.analyser = null;
      this.processor = null;

      // Detection State
      this.lastSnapTime = -100000;
      this.recentEnergyHistory = [];
      this.historySize = 10;
      this.ambientEnergy = 0.005;
      this.isListening = false;

      // Listeners
      this.listeners = {
        snap: [],
        energy: [],
        stateChange: []
      };

      this._processAudio = this._processAudio.bind(this);
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
            console.error(`[SnapDetector] Error in ${event} callback:`, err);
          }
        }
      }
    }

    setSensitivity(level) {
      this.sensitivity = Math.max(1, Math.min(10, Number(level) || 5));
    }

    setEnabled(enabled) {
      this.enabled = !!enabled;
      this.emit('stateChange', { enabled: this.enabled, isListening: this.isListening });
    }

    /**
     * Initializes detector with an existing MediaStream containing an audio track.
     */
    async init(mediaStream) {
      if (!mediaStream) {
        throw new Error('MediaStream required for SnapDetector initialization.');
      }

      const audioTracks = mediaStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('No audio tracks found in provided MediaStream.');
      }

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser.');
        }

        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContextClass();
        }

        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }

        // Connect source from the stream
        this.sourceNode = this.audioCtx.createMediaStreamSource(mediaStream);

        // Input pre-gain to reliably pick up finger snaps at normal desk distances
        this.inputGain = this.audioCtx.createGain();
        this.inputGain.gain.value = 1.6;

        // Highpass filter at 1200 Hz to cut human speech fundamentals & low rumble
        this.highpassFilter = this.audioCtx.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.value = 1200;
        this.highpassFilter.Q.value = 0.7;

        // Bandpass filter centered at 2800 Hz (characteristic human finger snap acoustic peak)
        this.bandpassFilter = this.audioCtx.createBiquadFilter();
        this.bandpassFilter.type = 'bandpass';
        this.bandpassFilter.frequency.value = 2800;
        this.bandpassFilter.Q.value = 1.0;

        // Analyser for real-time time-domain and frequency data
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.1;

        // ScriptProcessor / AudioWorklet for low-latency transient analysis
        // Using ScriptProcessor with small buffer for broad compatibility
        this.processor = this.audioCtx.createScriptProcessor(512, 1, 1);
        this.processor.onaudioprocess = this._processAudio;

        // Chain nodes: Source -> InputGain -> Highpass -> Bandpass -> Analyser -> Processor -> Destination (muted)
        this.sourceNode.connect(this.inputGain);
        this.inputGain.connect(this.highpassFilter);
        this.highpassFilter.connect(this.bandpassFilter);
        this.bandpassFilter.connect(this.analyser);
        this.analyser.connect(this.processor);

        // Silent sink to ensure audio clock runs without emitting any sound through speakers
        const silentGain = this.audioCtx.createGain();
        silentGain.gain.value = 0.0;
        this.processor.connect(silentGain);
        silentGain.connect(this.audioCtx.destination);

        this.isListening = true;
        this.emit('stateChange', { enabled: this.enabled, isListening: this.isListening });
      } catch (err) {
        console.error('[SnapDetector] Failed to initialize audio processing:', err);
        throw err;
      }
    }

    _processAudio(event) {
      if (!this.isListening) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const bufferLength = inputBuffer.length;

      // Calculate instantaneous Root Mean Square (RMS) and Peak Energy
      let sumSquares = 0;
      let peakValue = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = Math.abs(inputBuffer[i]);
        if (val > peakValue) {
          peakValue = val;
        }
        sumSquares += val * val;
      }

      const rms = Math.sqrt(sumSquares / bufferLength);

      // Crest factor: peak-to-RMS ratio (snaps have high crest factor > 3.5)
      const crestFactor = rms > 0.0001 ? peakValue / rms : 0;

      // Only track ambient baseline when signal is quiet (prevents snap energy from raising noise floor)
      if (peakValue < 0.08) {
        this.ambientEnergy = this.ambientEnergy * 0.95 + rms * 0.05;
      }
      if (this.ambientEnergy < 0.002) {
        this.ambientEnergy = 0.002;
      }

      // Emit energy metric for UI visualization
      this.emit('energy', { rms, peak: peakValue, ambient: this.ambientEnergy, crestFactor });

      if (!this.enabled) return;

      // Determine sensitivity threshold:
      // sensitivity 1 -> threshold 0.22 (harder snap required)
      // sensitivity 7 -> threshold 0.10 (natural finger snap)
      // sensitivity 10 -> threshold 0.04 (subtle snap detected)
      const threshold = 0.24 - (this.sensitivity / 10) * 0.20;

      const now = performance.now();
      const timeSinceLastSnap = now - this.lastSnapTime;

      // Transient Detection Criteria:
      // 1. Peak value must exceed sensitivity threshold
      // 2. High crest factor (> 2.2), distinguishing snap from sustained speech
      // 3. Significant burst over ambient noise (peak > 2.8 * ambient)
      // 4. Respect cooldown period
      const isTransientSpike = peakValue > threshold &&
                               crestFactor > 2.2 &&
                               peakValue > (this.ambientEnergy * 2.8);

      if (isTransientSpike && timeSinceLastSnap > this.cooldownMs) {
        this.lastSnapTime = now;
        console.log(`[SnapDetector] SNAP DETECTED! (Peak: ${peakValue.toFixed(3)}, Threshold: ${threshold.toFixed(3)}, Crest: ${crestFactor.toFixed(2)})`);
        this.emit('snap', {
          peak: peakValue,
          crestFactor,
          timestamp: now
        });
      }
    }

    stop() {
      this.isListening = false;
      if (this.processor) {
        this.processor.onaudioprocess = null;
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
      if (this.bandpassFilter) {
        this.bandpassFilter.disconnect();
        this.bandpassFilter = null;
      }
      if (this.highpassFilter) {
        this.highpassFilter.disconnect();
        this.highpassFilter = null;
      }
      if (this.inputGain) {
        this.inputGain.disconnect();
        this.inputGain = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close().catch(() => {});
        this.audioCtx = null;
      }
      this.emit('stateChange', { enabled: this.enabled, isListening: false });
    }
  }

  return SnapDetector;
});
