/**
 * MeetMorph - Page Bridge (MAIN Execution World)
 * Injected at document_start in the MAIN world to intercept navigator.mediaDevices.getUserMedia
 * and RTCPeerConnection, routing outgoing video through the VideoEngine canvas pipeline.
 */

(function () {
  'use strict';

  if (window.__meetmorphBridge || window.__ometvVanishBridge) {
    console.log('[MeetMorph] Bridge already initialized.');
    return;
  }

  console.log('[MeetMorph] Initializing Page Bridge in MAIN world...');

  const MESSAGE_SOURCE_PAGE = 'ometv-vanish-page';
  const MESSAGE_SOURCE_CONTENT = 'ometv-vanish-content';

  class PageBridge {
    constructor() {
      this.videoEngine = new window.VideoEngine({
        targetFps: 30,
        transitionDuration: 100
      });

      this.snapDetector = new window.SnapDetector({
        enabled: true,
        sensitivity: 7
      });

      // Active state
      this.isHooked = false;
      this.rawMediaStream = null;
      this.capturedAudioStream = null;
      this.compositeMediaStream = null;
      this.activePeerConnections = new Set();
      this.activeVideoSenders = new Map(); // sender -> { pc, originalTrack, processedTrack }
      this.diagnosticHistory = [];

      this._setupVideoEngineListeners();
      this._setupSnapDetectorListeners();
      this._interceptMediaDevices();
      this._interceptPeerConnection();
      this._setupMessageBridge();

      this.isHooked = true;
      this._logDiagnostic('PageBridge initialized and WebRTC hooks installed.');
    }

    _logDiagnostic(msg, data = null) {
      const entry = { time: new Date().toLocaleTimeString(), msg, data };
      this.diagnosticHistory.push(entry);
      if (this.diagnosticHistory.length > 50) this.diagnosticHistory.shift();
      console.log(`[MeetMorph] ${msg}`, data || '');
    }

    _setupVideoEngineListeners() {
      this.videoEngine.on('stateChange', ({ oldState, newState, isVanished }) => {
        this._notifyStatus();
      });

      this.videoEngine.on('countdownTick', ({ secondsRemaining }) => {
        this._postToContent('COUNTDOWN_TICK', { secondsRemaining });
      });

      this.videoEngine.on('backgroundCaptured', ({ dataUrl, metadata }) => {
        this._postToContent('BACKGROUND_CAPTURED', { dataUrl, metadata });
        this._notifyStatus();
      });

      this.videoEngine.on('fpsUpdate', ({ fps }) => {
        this._postToContent('FPS_UPDATE', { fps });
      });

      this.videoEngine.on('error', (err) => {
        this._postToContent('ERROR', { message: err.message });
      });
    }

    _setupSnapDetectorListeners() {
      this.snapDetector.on('snap', (details) => {
        this._logDiagnostic('Finger snap detected! Details:', details);
        this._postToContent('SNAP_TRIGGERED', details);

        // Check if empty background has been captured
        if (!this.videoEngine.backgroundImage) {
          this._logDiagnostic('Snap detected but no background image captured yet.');
          this._postToContent('SNAP_NO_BACKGROUND');
          return;
        }

        this.toggle();
      });

      this.snapDetector.on('energy', (energy) => {
        this._postToContent('AUDIO_ENERGY', energy);
      });

      // Resume Web Audio AudioContext on any user interaction with the window (Autoplay Policy)
      const resumeAudio = () => {
        if (this.snapDetector.audioCtx && this.snapDetector.audioCtx.state === 'suspended') {
          this.snapDetector.audioCtx.resume().catch(() => {});
        }
      };
      window.addEventListener('click', resumeAudio, { passive: true });
      window.addEventListener('keydown', resumeAudio, { passive: true });
    }

    async _initSnapWithStream(stream) {
      if (!stream) return;
      const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
      if (!audioTracks || audioTracks.length === 0) return;

      try {
        await this.snapDetector.init(stream);
        this._logDiagnostic('Snap detector successfully initialized with audio stream.');
        this._notifyStatus();
      } catch (err) {
        console.warn('[MeetMorph] Snap detector init warning:', err);
      }
    }

    async _ensureAudioListening() {
      if (this.snapDetector.isListening) return;
      if (this.capturedAudioStream && this.capturedAudioStream.active && this.capturedAudioStream.getAudioTracks().some(t => t.readyState === 'live')) {
        await this._initSnapWithStream(this.capturedAudioStream);
        return;
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.capturedAudioStream = micStream;
          await this._initSnapWithStream(micStream);
        } catch (e) {
          console.warn('[MeetMorph] Could not auto-acquire mic for snap detector:', e.message);
        }
      }
    }

    /**
     * Intercept navigator.mediaDevices.getUserMedia and MediaDevices.prototype.getUserMedia
     */
    _interceptMediaDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[MeetMorph] navigator.mediaDevices.getUserMedia not found on page.');
        return;
      }

      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      const self = this;

      const hookedGetUserMedia = async function (constraints) {
        self._logDiagnostic('getUserMedia called with constraints:', constraints);

        const videoRequested = constraints && (
          constraints.video === true ||
          (typeof constraints.video === 'object' && constraints.video !== null)
        );

        const audioRequested = constraints && (
          constraints.audio === true ||
          (typeof constraints.audio === 'object' && constraints.audio !== null)
        );

        // Case 1: Audio-only requested (e.g. Google Meet microphone initialization)
        if (!videoRequested) {
          const audioStream = await originalGetUserMedia(constraints);
          if (audioRequested && audioStream && audioStream.getAudioTracks().length > 0) {
            self.capturedAudioStream = audioStream;
            self._initSnapWithStream(audioStream);
          }
          return audioStream;
        }

        // Case 2: Video requested (with or without audio)
        try {
          // Acquire native stream from hardware
          const realStream = await originalGetUserMedia(constraints);
          self.rawMediaStream = realStream;

          // Initialize snap detector if audio track present in this call
          if (realStream.getAudioTracks().length > 0) {
            self.capturedAudioStream = realStream;
            self._initSnapWithStream(realStream);
          } else if (self.capturedAudioStream && !self.snapDetector.isListening) {
            self._initSnapWithStream(self.capturedAudioStream);
          }

          // Initialize VideoEngine with real camera stream
          const processedVideoTrack = await self.videoEngine.initWithStream(realStream);

          // Audio tracks are preserved 100% untouched
          const audioTracks = realStream.getAudioTracks();

          // Create composite stream: Processed 30fps Canvas Video + Pure Native Audio
          const compositeTracks = [processedVideoTrack, ...audioTracks];
          const compositeStream = new MediaStream(compositeTracks);
          self.compositeMediaStream = compositeStream;

          self._logDiagnostic('Composite stream created and returning to caller. Video track:', {
            id: processedVideoTrack.id,
            label: 'MeetMorph Virtual Track (30fps)',
            audioTracksCount: audioTracks.length
          });

          // Replace track on any existing active peer connections
          self._replaceTracksOnActiveSenders(processedVideoTrack);

          self._notifyStatus();
          return compositeStream;
        } catch (err) {
          self._logDiagnostic('Error in hooked getUserMedia:', err.message);
          throw err;
        }
      };

      navigator.mediaDevices.getUserMedia = hookedGetUserMedia;
      if (window.MediaDevices && window.MediaDevices.prototype) {
        window.MediaDevices.prototype.getUserMedia = hookedGetUserMedia;
      }

      this._logDiagnostic('navigator.mediaDevices.getUserMedia successfully proxied.');
    }

    /**
     * Intercept RTCPeerConnection to track senders and outgoing WebRTC video tracks
     */
    _interceptPeerConnection() {
      const OriginalRTCPeerConnection = window.RTCPeerConnection;
      if (!OriginalRTCPeerConnection) {
        console.warn('[MeetMorph] RTCPeerConnection not supported in window.');
        return;
      }

      const self = this;

      function HookedRTCPeerConnection(configuration) {
        const pc = new OriginalRTCPeerConnection(configuration);
        self.activePeerConnections.add(pc);
        self._logDiagnostic('New RTCPeerConnection created. Active connections:', self.activePeerConnections.size);

        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            self.activePeerConnections.delete(pc);
            self._cleanupSendersForPc(pc);
            self._notifyStatus();
          }
        });

        // Hook addTrack
        const originalAddTrack = pc.addTrack.bind(pc);
        pc.addTrack = function (track, ...streams) {
          self._logDiagnostic(`pc.addTrack called for track kind: ${track ? track.kind : 'unknown'}`);

          // If adding an audio track, tap it for snap detection if detector is not yet listening
          if (track && track.kind === 'audio' && !self.snapDetector.isListening) {
            try {
              const audioTrackToUse = track.clone ? track.clone() : track;
              const audioStream = new MediaStream([audioTrackToUse]);
              self.capturedAudioStream = audioStream;
              self._initSnapWithStream(audioStream);
            } catch (e) {
              console.warn('[MeetMorph] Failed to init snap detector from pc.addTrack audio track:', e);
            }
          }

          // If adding a video track, ensure it's our processed canvas track
          if (track && track.kind === 'video') {
            const processedTrack = self.videoEngine.getProcessedTrack();
            const trackToUse = processedTrack || track;
            const sender = originalAddTrack(trackToUse, ...streams);
            self.activeVideoSenders.set(sender, { pc, originalTrack: track, processedTrack: trackToUse });
            self._logDiagnostic('Video sender registered with track:', trackToUse.id);
            self._notifyStatus();
            return sender;
          }

          return originalAddTrack(track, ...streams);
        };

        // Hook removeTrack
        const originalRemoveTrack = pc.removeTrack ? pc.removeTrack.bind(pc) : null;
        if (originalRemoveTrack) {
          pc.removeTrack = function (sender) {
            self._logDiagnostic('pc.removeTrack called');
            self.activeVideoSenders.delete(sender);
            self._notifyStatus();
            return originalRemoveTrack(sender);
          };
        }

        return pc;
      }

      // Preserve prototype AND static methods (e.g. RTCPeerConnection.generateCertificate)
      HookedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
      Object.setPrototypeOf(HookedRTCPeerConnection, OriginalRTCPeerConnection);
      window.RTCPeerConnection = HookedRTCPeerConnection;
      this._logDiagnostic('RTCPeerConnection successfully proxied (static methods preserved).');
    }

    _cleanupSendersForPc(pc) {
      for (const [sender, info] of this.activeVideoSenders.entries()) {
        if (info.pc === pc) {
          this.activeVideoSenders.delete(sender);
        }
      }
    }

    _replaceTracksOnActiveSenders(newTrack) {
      if (!newTrack) return;
      for (const [sender, info] of this.activeVideoSenders.entries()) {
        try {
          if (sender.track && sender.track.id !== newTrack.id) {
            sender.replaceTrack(newTrack).then(() => {
              this._logDiagnostic('RTCRtpSender.replaceTrack succeeded for sender.');
            }).catch(e => {
              console.warn('[MeetMorph] replaceTrack failed:', e);
            });
            info.processedTrack = newTrack;
          }
        } catch (e) {
          console.warn('[MeetMorph] Error replacing track on sender:', e);
        }
      }
    }

    _setupMessageBridge() {
      window.addEventListener('message', async (event) => {
        if (!event.data || event.data.source !== MESSAGE_SOURCE_CONTENT) {
          return;
        }

        const { type, payload } = event.data;

        switch (type) {
          case 'GET_STATUS':
            this._notifyStatus();
            break;

          case 'CAPTURE_BACKGROUND':
            try {
              const seconds = payload && payload.seconds ? payload.seconds : 3;
              await this.videoEngine.captureEmptyBackground(seconds);
            } catch (err) {
              this._postToContent('ERROR', { message: err.message });
            }
            break;

          case 'CANCEL_COUNTDOWN':
            this.videoEngine.cancelCountdown();
            this._notifyStatus();
            break;

          case 'LOAD_BACKGROUND':
            if (payload && payload.dataUrl) {
              await this.videoEngine.loadBackgroundFromDataUrl(payload.dataUrl);
              this._notifyStatus();
            }
            break;

          case 'SET_MODE':
            if (payload && payload.mode === 'VANISHED') {
              this.vanish();
            } else {
              this.return();
            }
            break;

          case 'TOGGLE':
            this.toggle();
            break;

          case 'SET_SNAP_CONFIG':
            if (payload) {
              if (payload.enabled !== undefined) {
                this.snapDetector.setEnabled(payload.enabled);
                if (payload.enabled) {
                  this._ensureAudioListening();
                }
              }
              if (payload.sensitivity !== undefined) {
                this.snapDetector.setSensitivity(payload.sensitivity);
              }
              this._notifyStatus();
            }
            break;

          case 'STOP':
            this.stop();
            break;
        }
      });
    }

    vanish() {
      try {
        this.videoEngine.vanish();
        this._logDiagnostic('Switched to VANISHED mode.');
        this._notifyStatus();
      } catch (err) {
        this._logDiagnostic('Failed to vanish:', err.message);
        this._postToContent('ERROR', { message: err.message });
      }
    }

    return() {
      this.videoEngine.return();
      this._logDiagnostic('Switched to VISIBLE mode.');
      this._notifyStatus();
    }

    toggle() {
      if (this.videoEngine.isVanished) {
        this.return();
      } else {
        this.vanish();
      }
      return this.videoEngine.isVanished;
    }

    stop() {
      this.videoEngine.stop();
      this.snapDetector.stop();
      this._notifyStatus();
    }

    _postToContent(type, payload = {}) {
      window.postMessage({
        source: MESSAGE_SOURCE_PAGE,
        type,
        payload
      }, '*');
    }

    _notifyStatus() {
      const diag = this.videoEngine.getDiagnosticInfo();
      const status = {
        isHooked: this.isHooked,
        state: diag.state,
        isVanished: diag.isVanished,
        fps: diag.fps,
        resolution: diag.resolution,
        hasBackground: diag.hasBackground,
        backgroundMetadata: diag.backgroundMetadata,
        backgroundDataUrl: this.videoEngine.backgroundDataUrl,
        hasRawStream: diag.hasRawStream,
        hasProcessedTrack: diag.hasProcessedTrack,
        trackId: diag.trackId,
        activePeerConnectionsCount: this.activePeerConnections.size,
        activeVideoSendersCount: this.activeVideoSenders.size,
        snapEnabled: this.snapDetector.enabled,
        snapSensitivity: this.snapDetector.sensitivity,
        snapListening: this.snapDetector.isListening,
        lastError: diag.lastError,
        diagnostics: this.diagnosticHistory.slice(-5)
      };

      this._postToContent('STATUS_UPDATE', status);
    }
  }

  // Instantiate and mount
  const bridgeInstance = new PageBridge();
  window.__meetmorphBridge = bridgeInstance;
  window.__ometvVanishBridge = bridgeInstance; // backwards compatibility alias
})();
