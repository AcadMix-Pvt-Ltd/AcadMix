const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('const requestPermissionsAndEnumerate = async () => {');
const endIndex = content.indexOf('useEffect(() => {', startIndex);

if (startIndex > -1 && endIndex > -1) {
  const newFunc = `const requestPermissionsAndEnumerate = async () => {
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    try {
      if (!navigator.mediaDevices) {
        toast.error('Hardware access blocked. Use HTTPS or localhost.');
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
      (window as any).webRtcErrorMsg = "";
      
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }

      // Re-enumerate safely now that permissions are granted (to get real labels)
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
         (window as any).webRtcErrorMsg = "Camera or mic is in use by another application";
         toast.error("Camera or mic is currently in use by another application.");
         setPermissionsGranted(true);
      } else if (err.name === "NotFoundError") {
         (window as any).webRtcErrorMsg = "No camera or microphone found!";
         toast.error("No camera or microphone found!");
         setPermissionsGranted(true);
      } else if (err.name === "TimeoutError") {
         (window as any).webRtcErrorMsg = "Hardware didn't respond (Timeout). Check privacy settings.";
         toast.error("Hardware took too long to respond. Check Windows privacy settings.");
         setPermissionsGranted(false);
      } else {
         (window as any).webRtcErrorMsg = \`\${err.name}: \${err.message}\`;
         toast.error(\`Permissions failed: \${err.name || err.message || 'Unknown Error'}\`);
         setPermissionsGranted(false);
      }
    } finally {
      requestInProgressRef.current = false;
    }
  };

  `;
  
  content = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Successfully replaced function with timeout safeguards!");
} else {
  console.log("Could not find start/end bounds!");
}
