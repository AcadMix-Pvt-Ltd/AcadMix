const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add state variable
if (!content.includes('hardwareError')) {
    content = content.replace("const [permissionsGranted, setPermissionsGranted] = useState(false);", "const [permissionsGranted, setPermissionsGranted] = useState(false);\n  const [hardwareError, setHardwareError] = useState('');");
}

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
      
      let allDevices = [];
      try {
        allDevices = await navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        console.warn("Initial enumerate failed", e);
      }
      const hasVideoHardware = allDevices.some(d => d.kind === 'videoinput');
      const hasAudioHardware = allDevices.some(d => d.kind === 'audioinput');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: hasVideoHardware ? (selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : true) : false,
        audio: hasAudioHardware ? (selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true) : false,
      };
      
      let stream;
      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia(constraints),
          new Promise((_, reject) => setTimeout(() => {
             const err = new Error("Hardware timeout");
             err.name = "TimeoutError";
             reject(err);
          }, 5000))
        ]);
      } catch (err) {
        console.warn("Failed with ideal constraints, trying fallback", err);
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ video: hasVideoHardware, audio: hasAudioHardware }),
          new Promise((_, reject) => setTimeout(() => {
             const err = new Error("Hardware timeout");
             err.name = "TimeoutError";
             reject(err);
          }, 5000))
        ]);
      }
      
      if (!isMountedRef.current) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      streamRef.current = stream;
      setPermissionsGranted(true);
      setHardwareError('');
      
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }

      // Re-enumerate safely now that permissions are granted
      try {
         const updatedDevices = await navigator.mediaDevices.enumerateDevices();
         const videoDevices = updatedDevices.filter(d => d.kind === 'videoinput');
         const audioDevices = updatedDevices.filter(d => d.kind === 'audioinput');
         setDevices({ video: videoDevices, audio: audioDevices });
      } catch(e) {}

      if (hasAudioHardware) {
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
      } else {
        setHasMicSignal(true);
      }

    } catch (err: any) {
      console.error("Camera/Mic access denied:", err);
      if (err.name === "NotReadableError") {
         setHardwareError("Camera or mic is in use by another application. Close other apps and refresh.");
         toast.error("Camera or mic is currently in use by another application.");
         // Do not bypass, if we can't read it we can't use it
         setPermissionsGranted(false);
      } else if (err.name === "NotFoundError") {
         setHardwareError("No camera or microphone found!");
         toast.error("No camera or microphone found!");
         setPermissionsGranted(true);
      } else if (err.name === "TimeoutError") {
         setHardwareError("Hardware deadlocked. Chrome's camera driver crashed. You MUST restart your browser.");
         toast.error("Hardware took too long to respond. Please restart your browser completely.");
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
  }, [selectedVideoId, selectedAudioId]);

  `;
  
  content = content.substring(0, startIdx) + newFunc + content.substring(endIdx);
  
  // Also inject the banner using the real state variable
  content = content.replace(
      /\{\(window as any\)\.webRtcErrorMsg && <div.*?<\/div>\}/g, 
      "{hardwareError && <div className=\"text-red-600 font-bold mb-4 p-4 bg-red-50 rounded-xl text-sm max-w-[90%] text-center border border-red-200 shadow-sm\">{hardwareError}</div>}"
  );
  // Just in case it wasn't there
  if (!content.includes('hardwareError && <div')) {
      content = content.replace(
          '<span className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Awaiting Permissions</span>',
          '<span className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Awaiting Permissions</span>\n                       {hardwareError && <div className="text-red-600 font-bold mb-4 p-4 bg-red-50 rounded-xl text-sm max-w-[90%] text-center border border-red-200 shadow-sm">{hardwareError}</div>}'
      );
  }
  
  fs.writeFileSync(file, content);
  console.log("Successfully rewrote function with React State!");
} else {
  console.log("Failed to find bounds");
}
