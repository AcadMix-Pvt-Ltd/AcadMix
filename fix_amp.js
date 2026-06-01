const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const originalAmp = `      // Amplitude setup
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
        
        // Filter out ambient noise floor (most laptop mics sit around 15-20 when silent)
        const noiseFloor = 15;
        const normalizedVolume = Math.max(0, average - noiseFloor);
        
        if (normalizedVolume > 0) setHasMicSignal(true);
        if (amplitudeBarRef.current) {
           // Smooth the visual representation and make it less twitchy at the bottom
           const visualWidth = normalizedVolume > 0 ? Math.min(100, normalizedVolume * 3) : 0;
           amplitudeBarRef.current.style.width = \`\${visualWidth}%\`;
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();`;

const newAmp = `      // Amplitude setup
      try {
        if (stream.getAudioTracks().length === 0) {
          console.warn("No audio tracks available for amplitude meter");
        } else {
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
        }
      } catch (ampErr) {
        console.warn("Could not setup audio amplitude meter:", ampErr);
        setHasMicSignal(true);
      }`;

if (content.includes(originalAmp)) {
  content = content.replace(originalAmp, newAmp);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Could not find block");
}
