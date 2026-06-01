const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the entire requestPermissionsAndEnumerate function
const startText = 'const requestPermissionsAndEnumerate = async () => {';
const startIndex = content.indexOf(startText);

// Instead of trying to parse it properly, let's just use regex on the file
let replaced = content.replace(/const requestPermissionsAndEnumerate = async \(\) => \{[\s\S]*?checkVolume\(\);\r?\n\r?\n      \} catch \(err: any\) \{[\s\S]*?setPermissionsGranted\(false\);\r?\n      \}\r?\n    \};/,
`const requestPermissionsAndEnumerate = async () => {
      let stream = null;
      try {
        if (streamRef.current) {
          const currentVideoTrack = streamRef.current.getVideoTracks()[0];
          const currentAudioTrack = streamRef.current.getAudioTracks()[0];
          const currentVid = currentVideoTrack ? currentVideoTrack.getSettings().deviceId : null;
          const currentAud = currentAudioTrack ? currentAudioTrack.getSettings().deviceId : null;
          
          if (currentVid === selectedVideoId && currentAud === selectedAudioId) {
             return; // Skip restart
          }

          streamRef.current.getTracks().forEach((t: any) => t.stop());
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const constraints = {
          video: selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : true,
          audio: selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true,
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("Failed with ideal constraints, trying default true", err);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
        
        if (!isMountedRef.current) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPermissionsGranted(true);
        
        if (videoRef.current && videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }

        // Amplitude setup
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
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

      } catch (err: any) {
        console.error("Camera/Mic error:", err);
        if (err.name === "NotReadableError") {
           toast.error("Camera or mic is currently in use by another application.");
           setPermissionsGranted(true);
        } else if (err.name === "NotFoundError") {
           toast.error("No camera or microphone found!");
           setPermissionsGranted(true);
        } else {
           toast.error("Please grant camera and microphone permissions to proceed.");
           setPermissionsGranted(false);
        }
      }

      // Always enumerate devices so dropdowns work even if stream failed
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        const audioDevices = allDevices.filter(d => d.kind === 'audioinput');
        
        setDevices({ video: videoDevices, audio: audioDevices });
        
        if (!selectedVideoId && videoDevices.length > 0 && stream) {
          const activeVideo = stream.getVideoTracks()[0];
          const matched = videoDevices.find(d => d.label === activeVideo?.label);
          setSelectedVideoId(matched?.deviceId || videoDevices[0].deviceId);
        }
        if (!selectedAudioId && audioDevices.length > 0 && stream) {
          const activeAudio = stream.getAudioTracks()[0];
          const matched = audioDevices.find(d => d.label === activeAudio?.label);
          setSelectedAudioId(matched?.deviceId || audioDevices[0].deviceId);
        }
      } catch (e) {
        console.error("Enumerate failed", e);
      }
    };`);

fs.writeFileSync(file, replaced);
