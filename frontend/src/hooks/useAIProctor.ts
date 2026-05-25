import { useState, useEffect, useRef, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════
//  useAIProctor — Advanced AI Proctoring Engine
//
//  7 detection modules, all client-side:
//  1. Face Detection + Count        (MediaPipe FaceLandmarker)
//  2. Head Pose / Gaze Tracking     (FaceLandmarker landmarks)
//  3. Identity Verification         (landmark embedding compare)
//  4. Object Detection              (MediaPipe ObjectDetector)
//  5. Audio Monitoring              (Web Audio API)
//  6. Evidence Snapshots            (Canvas API)
//  7. Browser Extension Check       (API probing)
//
//  Typing Cadence Analysis is exposed as onKeyDown callback.
// ════════════════════════════════════════════════════════════════

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  // Intervals
  FACE_INTERVAL_MS: 2000,        // Face + gaze every 2s
  OBJECT_INTERVAL_MS: 10000,     // Object detection every 10s
  SNAPSHOT_INTERVAL_MS: 30000,   // Evidence snapshot every 30s
  IDENTITY_CHECK_INTERVAL: 7,    // Every Nth face detection (~14s)
  GRACE_PERIOD_MS: 10000,        // 10s grace at start

  // Thresholds
  NO_FACE_CONSECUTIVE: 3,        // 3 frames (~6s) = violation
  MULTI_FACE_CONSECUTIVE: 2,     // 2 frames (~4s) = violation
  MIN_FACE_SIZE_RATIO: 0.04,     // Face < 4% of frame = too far
  GAZE_YAW_THRESHOLD: 0.35,     // Looking sideways
  GAZE_PITCH_THRESHOLD: 0.30,    // Looking down
  GAZE_CONSECUTIVE: 3,           // Sustained look-away
  IDENTITY_DISTANCE_THRESHOLD: 0.35,  // Landmark distance for impersonation
  AUDIO_VOICE_THRESHOLD: 15,     // dB above ambient for voice
  AUDIO_CONSECUTIVE_MS: 3000,    // 3s sustained voice
  TYPING_BURST_CHARS: 8,         // Characters in burst
  TYPING_BURST_WINDOW_MS: 100,   // Time window for burst

  // Suspicious objects (COCO class names — include common variations)
  SUSPICIOUS_OBJECTS: ['cell phone', 'book', 'laptop', 'remote', 'tablet', 'monitor', 'tv', 'mouse', 'keyboard'],
};

// ── FaceLandmarker key landmark indices ──────────────────────
const LANDMARKS = {
  NOSE_TIP: 1,
  CHIN: 152,
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,
  FOREHEAD: 10,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
};

// ── Utility: compute head pose from landmarks ────────────────
function computeHeadPose(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;
  const nose = landmarks[LANDMARKS.NOSE_TIP];
  const leftEye = landmarks[LANDMARKS.LEFT_EYE_OUTER];
  const rightEye = landmarks[LANDMARKS.RIGHT_EYE_OUTER];
  const chin = landmarks[LANDMARKS.CHIN];
  const forehead = landmarks[LANDMARKS.FOREHEAD];

  // Face center and dimensions
  const centerX = (leftEye.x + rightEye.x) / 2;
  const centerY = (forehead.y + chin.y) / 2;
  const faceWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(chin.y - forehead.y);

  if (faceWidth < 0.01 || faceHeight < 0.01) return null;

  // Yaw: nose offset from center (normalized)
  const yaw = (nose.x - centerX) / faceWidth;
  // Pitch: nose vertical offset (normalized)
  const pitch = (nose.y - centerY) / faceHeight;

  return { yaw, pitch };
}

// ── Utility: compute face embedding for identity ─────────────
function computeFaceEmbedding(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;
  // Use 20 key landmark positions normalized relative to bounding box
  const keyIndices = [1, 10, 33, 61, 133, 152, 155, 159, 263, 291, 362, 386, 468 > landmarks.length ? 0 : 0];
  const safeIndices = [1, 10, 33, 61, 133, 152, 159, 263, 291, 362, 386, 4, 6, 9, 13, 14, 17, 37, 40, 46];

  const nose = landmarks[LANDMARKS.NOSE_TIP];
  const leftEye = landmarks[LANDMARKS.LEFT_EYE_OUTER];
  const rightEye = landmarks[LANDMARKS.RIGHT_EYE_OUTER];
  const scale = Math.max(0.01, Math.abs(rightEye.x - leftEye.x));

  return safeIndices.map(i => {
    const lm = landmarks[i] || landmarks[0];
    return [(lm.x - nose.x) / scale, (lm.y - nose.y) / scale];
  }).flat();
}

// ── Utility: compare face embeddings ─────────────────────────
function embeddingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum / a.length);
}


// ══════════════════════════════════════════════════════════════
//  Main Hook
// ══════════════════════════════════════════════════════════════
interface UseAIProctorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  audioStream: MediaStream | null;
  onViolation?: (type: string) => void;
  onSnapshot?: (dataUrl: string) => void;
  enabled?: boolean;
}

const useAIProctor = ({ videoRef, audioStream, onViolation, onSnapshot, enabled = false }: UseAIProctorProps) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('initializing');
  const [faceCount, setFaceCount] = useState(0);
  const [gazeDirection, setGazeDirection] = useState('center'); // center | left | right | down
  const [audioLevel, setAudioLevel] = useState(0);
  const [aiModules, setAiModules] = useState({
    face: false, objects: false, audio: false, browser: false,
  });

  // Refs
  const landmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const referenceEmbeddingRef = useRef(null);
  const faceDetectionCountRef = useRef(0);
  const startTimeRef = useRef(null);
  const onViolationRef = useRef(onViolation);
  const onSnapshotRef = useRef(onSnapshot);
  const canvasRef = useRef(null);
  const keystrokeTimesRef = useRef([]);

  // Consecutive violation counters
  const noFaceCountRef = useRef(0);
  const multiFaceCountRef = useRef(0);
  const gazeCountRef = useRef(0);
  const audioVoiceStartRef = useRef(null);

  // Interval refs
  const faceIntervalRef = useRef(null);
  const objectIntervalRef = useRef(null);
  const snapshotIntervalRef = useRef(null);

  // Keep callbacks fresh
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);


  // ────────────────────────────────────────────────────────────
  //  MODULE 1 + 2 + 3: Face + Gaze + Identity (FaceLandmarker)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loadFaceModel = async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        );
        const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numFaces: 3,
          minFaceDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (!cancelled) {
          landmarkerRef.current = landmarker;
          startTimeRef.current = Date.now();
          setIsModelLoaded(true);
          setDetectionStatus('grace');
          setAiModules(prev => ({ ...prev, face: true }));
        }
      } catch (err) {
        console.warn('[AI Proctor] FaceLandmarker load failed:', err);
        if (!cancelled) setDetectionStatus('error');
      }
    };

    loadFaceModel();
    return () => { cancelled = true; };
  }, [enabled]);


  // ────────────────────────────────────────────────────────────
  //  MODULE 4: Object Detection — DISABLED
  //  EfficientDet-Lite0 is too weak for reliable phone/book
  //  detection at webcam angles. Re-enable with a better model.
  // ────────────────────────────────────────────────────────────


  // ────────────────────────────────────────────────────────────
  //  MODULE 5: Audio Monitoring (Web Audio API)
  //  Uses audio stream provided by parent (requested with webcam)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isModelLoaded || !audioStream) return;

    try {
      // Extract audio tracks from the provided stream
      const audioTracks = audioStream.getAudioTracks();
      if (!audioTracks.length) return;

      const audioOnlyStream = new MediaStream(audioTracks);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(audioOnlyStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setAiModules(prev => ({ ...prev, audio: true }));
    } catch (err) {
      console.warn('[AI Proctor] Audio setup failed (non-critical):', err);
    }

    return () => {
      // Don't stop the audio tracks — parent owns the stream
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [enabled, isModelLoaded, audioStream]);


  // ────────────────────────────────────────────────────────────
  //  MODULE 7: Browser Extension / Screen Share Check (once)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !isModelLoaded) return;

    const checkBrowser = () => {
      // Check for active screen sharing via RTCPeerConnection
      if (window.__screenShareActive) {
        onViolationRef.current?.('screen_sharing_detected');
      }

      // Detect common remote desktop UA strings
      const ua = navigator.userAgent.toLowerCase();
      const remoteDesktopIndicators = ['anydesk', 'teamviewer', 'rustdesk', 'chrome remote desktop'];
      for (const rd of remoteDesktopIndicators) {
        if (ua.includes(rd)) {
          onViolationRef.current?.('remote_desktop_detected');
          break;
        }
      }

      // Override getDisplayMedia to detect screen sharing attempts
      const origGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia;
      if (origGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = async function (...args) {
          onViolationRef.current?.('screen_sharing_detected');
          return origGetDisplayMedia.apply(this, args);
        };
      }

      // Detect DevTools via debugger timing
      const detectDevTools = () => {
        const start = performance.now();
        // debugger statement causes a pause if DevTools is open — 
        // but we won't use debugger as it's intrusive. Instead check window size.
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
          onViolationRef.current?.('devtools_detected');
        }
      };

      detectDevTools();
      // Re-check periodically
      const devtoolsInterval = setInterval(detectDevTools, 15000);

      setAiModules(prev => ({ ...prev, browser: true }));

      return () => clearInterval(devtoolsInterval);
    };

    const cleanup = checkBrowser();
    return cleanup;
  }, [enabled, isModelLoaded]);


  // ────────────────────────────────────────────────────────────
  //  DETECTION LOOP: Face + Gaze + Identity + Audio
  // ────────────────────────────────────────────────────────────
  const runFaceDetection = useCallback(() => {
    const landmarker = landmarkerRef.current;
    const video = videoRef?.current;
    if (!landmarker || !video || video.readyState < 2) return;

    // Grace period
    if (startTimeRef.current && Date.now() - startTimeRef.current < CONFIG.GRACE_PERIOD_MS) {
      setDetectionStatus('grace');
      return;
    }
    setDetectionStatus('monitoring');

    try {
      const result = landmarker.detect(video);
      const faces = result.faceLandmarks || [];
      setFaceCount(faces.length);
      faceDetectionCountRef.current += 1;

      // ── No face ──
      if (faces.length === 0) {
        noFaceCountRef.current += 1;
        setGazeDirection('away');
        if (noFaceCountRef.current >= CONFIG.NO_FACE_CONSECUTIVE) {
          onViolationRef.current?.('no_face_detected');
          noFaceCountRef.current = 0;
        }
      } else {
        noFaceCountRef.current = 0;
      }

      // ── Multiple faces ──
      if (faces.length > 1) {
        multiFaceCountRef.current += 1;
        if (multiFaceCountRef.current >= CONFIG.MULTI_FACE_CONSECUTIVE) {
          onViolationRef.current?.('multiple_faces');
          multiFaceCountRef.current = 0;
        }
      } else {
        multiFaceCountRef.current = 0;
      }

      // ── Gaze / Head Pose (primary face) ──
      if (faces.length >= 1) {
        const pose = computeHeadPose(faces[0]);
        if (pose) {
          const { yaw, pitch } = pose;
          if (Math.abs(yaw) > CONFIG.GAZE_YAW_THRESHOLD) {
            setGazeDirection(yaw > 0 ? 'right' : 'left');
            gazeCountRef.current += 1;
          } else if (pitch > CONFIG.GAZE_PITCH_THRESHOLD) {
            setGazeDirection('down');
            gazeCountRef.current += 1;
          } else {
            setGazeDirection('center');
            gazeCountRef.current = 0;
          }

          if (gazeCountRef.current >= CONFIG.GAZE_CONSECUTIVE) {
            onViolationRef.current?.('looking_away');
            gazeCountRef.current = 0;
          }
        }
      }

      // ── Identity Verification ──
      if (faces.length === 1) {
        const embedding = computeFaceEmbedding(faces[0]);
        if (embedding) {
          if (!referenceEmbeddingRef.current) {
            // First detection — store as reference
            referenceEmbeddingRef.current = embedding;
          } else if (faceDetectionCountRef.current % CONFIG.IDENTITY_CHECK_INTERVAL === 0) {
            // Periodic identity check
            const dist = embeddingDistance(referenceEmbeddingRef.current, embedding);
            if (dist > CONFIG.IDENTITY_DISTANCE_THRESHOLD) {
              onViolationRef.current?.('identity_mismatch');
            }
          }
        }
      }

      // ── Audio level check (piggyback on face detection loop) ──
      if (analyserRef.current) {
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Compute RMS of voice band (roughly bins 6-40 for 300Hz-3kHz at 48kHz SR)
        const voiceBins = dataArray.slice(6, 40);
        const rms = Math.sqrt(voiceBins.reduce((sum, v) => sum + v * v, 0) / voiceBins.length);
        const dB = Math.max(0, 20 * Math.log10(rms / 255 + 0.0001) + 40); // normalize to 0-40 range
        setAudioLevel(Math.round(dB));

        if (dB > CONFIG.AUDIO_VOICE_THRESHOLD) {
          if (!audioVoiceStartRef.current) {
            audioVoiceStartRef.current = Date.now();
          } else if (Date.now() - audioVoiceStartRef.current > CONFIG.AUDIO_CONSECUTIVE_MS) {
            onViolationRef.current?.('voice_detected');
            audioVoiceStartRef.current = null; // reset after firing
          }
        } else {
          audioVoiceStartRef.current = null;
        }
      }
    } catch (err) {
      // Silently handle detection errors
    }
  }, [videoRef]);




  // ────────────────────────────────────────────────────────────
  //  MODULE 6: Evidence Snapshots
  // ────────────────────────────────────────────────────────────
  const captureSnapshot = useCallback(() => {
    const video = videoRef?.current;
    if (!video || video.readyState < 2) return;
    if (startTimeRef.current && Date.now() - startTimeRef.current < CONFIG.GRACE_PERIOD_MS) return;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.3); // Low quality for size
      onSnapshotRef.current?.(dataUrl);
    } catch (err) {
      // Silently handle
    }
  }, [videoRef]);


  // ────────────────────────────────────────────────────────────
  //  MODULE: Typing Cadence Analysis (exposed callback)
  // ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    // Only track printable characters
    if (e.key.length !== 1) return;

    const now = Date.now();
    const times = keystrokeTimesRef.current;
    times.push(now);

    // Keep only last N keystrokes
    while (times.length > 20) times.shift();

    // Check for burst: N chars within M ms
    if (times.length >= CONFIG.TYPING_BURST_CHARS) {
      const windowStart = times[times.length - CONFIG.TYPING_BURST_CHARS];
      const elapsed = now - windowStart;
      if (elapsed < CONFIG.TYPING_BURST_WINDOW_MS) {
        onViolationRef.current?.('typing_burst_detected');
        keystrokeTimesRef.current = []; // Reset after firing
      }
    }
  }, []);


  // ────────────────────────────────────────────────────────────
  //  Start / Stop all detection intervals
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isModelLoaded || !enabled) return;

    faceIntervalRef.current = setInterval(runFaceDetection, CONFIG.FACE_INTERVAL_MS);
    snapshotIntervalRef.current = setInterval(captureSnapshot, CONFIG.SNAPSHOT_INTERVAL_MS);

    return () => {
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
    };
  }, [isModelLoaded, enabled, runFaceDetection, captureSnapshot]);


  // ────────────────────────────────────────────────────────────
  //  Cleanup on unmount
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const landmarker = landmarkerRef.current;
    const objectDetector = objectDetectorRef.current;
    const audioContext = audioContextRef.current;
    return () => {
      [faceIntervalRef, objectIntervalRef, snapshotIntervalRef].forEach(ref => {
        if (ref.current) clearInterval(ref.current);
      });
      if (landmarker) {
        try { landmarker.close(); } catch {}
      }
      if (objectDetector) {
        try { objectDetector.close(); } catch {}
      }
      // Don't stop audio tracks — parent owns the stream
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, []);


  return {
    isModelLoaded,
    detectionStatus,
    faceCount,
    gazeDirection,
    audioLevel,
    aiModules,
    handleKeyDown,
  };
};

export default useAIProctor;
