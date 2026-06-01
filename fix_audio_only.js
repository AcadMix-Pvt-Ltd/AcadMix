const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = 'const requestPermissionsAndEnumerate = async () => {';
const endStr = 'const handleStartWrapper = () => {';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx > -1 && endIdx > -1) {
  const newFunc = `const requestInProgressRef = useRef(false);
  const requestPermissionsAndEnumerate = async () => {
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    try {
      setHardwareError('');
      if (!navigator.mediaDevices) {
        toast.error('Hardware access blocked. Use HTTPS or localhost.');
        setHardwareError('Hardware access blocked. Ensure you are using HTTPS or localhost.');
        setPermissionsGranted(false);
        return;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      let stream;
      try {
        // We wrap the ENTIRE hardware request in a strict 5-second timeout.
        // We only request AUDIO first. This completely bypasses any Windows Camera deadlocks!
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
          new Promise((_, reject) => setTimeout(() => {
             const err = new Error("Hardware timeout");
             err.name = "TimeoutError";
             reject(err);
          }, 4000))
        ]);
      } catch (err: any) {
        throw err; // cascade down to the main catch block
      }
      
      if (!isMountedRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      streamRef.current = stream;
      setPermissionsGranted(true);
      setHardwareError('');
      
      // Now that we have microphone permission, enumerateDevices is GUARANTEED to not hang
      try {
         const updatedDevices = await navigator.mediaDevices.enumerateDevices();
         const audioDevices = updatedDevices.filter(d => d.kind === 'audioinput');
         setDevices({ video: [], audio: audioDevices });
         if (!selectedAudioId && audioDevices.length > 0) {
            setSelectedAudioId(audioDevices[0].deviceId);
         }
      } catch(e) {}

      // Amplitude setup
      try {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === 'suspended') {
           audioContextRef.current.resume();
        }
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!streamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;
          
          const noiseFloor = 15;
          const normalizedVolume = Math.max(0, average - noiseFloor);
          
          if (normalizedVolume > 0) setHasMicSignal(true);
          if (amplitudeBarRef.current) {
             const visualWidth = normalizedVolume > 0 ? Math.min(100, normalizedVolume * 3) : 0;
             amplitudeBarRef.current.style.width = \`\${visualWidth}%\`;
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (ampErr) {
        console.warn("Could not setup audio amplitude meter:", ampErr);
        setHasMicSignal(true);
      }

    } catch (err: any) {
      console.error("Camera/Mic access denied:", err);
      if (err.name === "NotReadableError") {
         setHardwareError("Microphone is in use by another application (like Zoom or Teams). Close them and refresh.");
         toast.error("Microphone is currently in use by another application.");
         setPermissionsGranted(false);
      } else if (err.name === "NotFoundError") {
         setHardwareError("No microphone found! Please plug in a microphone.");
         toast.error("No microphone found!");
         setPermissionsGranted(true);
      } else if (err.name === "TimeoutError") {
         setHardwareError("Hardware deadlocked. Your Windows audio driver is unresponsive.");
         toast.error("Hardware took too long to respond.");
         setPermissionsGranted(false);
      } else {
         setHardwareError(\`\${err.name}: \${err.message}\`);
         toast.error(\`Permissions failed: \${err.name || err.message || 'Unknown Error'}\`);
         setPermissionsGranted(false);
      }
    } finally {
      requestInProgressRef.current = false;
    }
  };

  useEffect(() => {
    requestPermissionsAndEnumerate();
    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(()=>{});
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioId]); // Removed selectedVideoId dependency to prevent infinite loops if camera is disabled

  `;
  
  content = content.substring(0, startIdx) + newFunc + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Successfully rewrote function for AUDIO ONLY!");
} else {
  console.log("Failed to find bounds");
}
