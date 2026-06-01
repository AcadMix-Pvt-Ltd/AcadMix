const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix constraints in requestPermissionsAndEnumerate
content = content.replace(/const constraints = \{\n\s*video: selectedVideoId \? \{ deviceId: \{ exact: selectedVideoId \} \} : true,\n\s*audio: selectedAudioId \? \{ deviceId: \{ exact: selectedAudioId \} \} : true,\n\s*\};\n\s*const stream = await navigator\.mediaDevices\.getUserMedia\(constraints\);/,
\const constraints = {
          video: selectedVideoId ? { deviceId: { ideal: selectedVideoId } } : true,
          audio: selectedAudioId ? { deviceId: { ideal: selectedAudioId } } : true,
        };
        
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("Failed with ideal constraints, trying default true", err);
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }\);

fs.writeFileSync(file, content);
console.log('Fixed constraints');
