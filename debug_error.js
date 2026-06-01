const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add state variable
content = content.replace(
  "const [permissionsGranted, setPermissionsGranted] = useState(false);",
  "const [permissionsGranted, setPermissionsGranted] = useState(false);\n  const [webRtcError, setWebRtcError] = useState('');"
);

// Update catch block to set the error
const catchRegex = /} catch \(err: any\) \{[\s\S]*?console\.error\("Camera\/Mic access denied:", err\);[\s\S]*?if \(err\.name === "NotReadableError"\) \{[\s\S]*?toast\.error\("Camera or mic is currently in use by another application\."\);[\s\S]*?setPermissionsGranted\(true\);[\s\S]*?\} else if \(err\.name === "NotFoundError"\) \{[\s\S]*?toast\.error\("No camera or microphone found!"\);[\s\S]*?setPermissionsGranted\(true\);[\s\S]*?\} else \{[\s\S]*?toast\.error\(`Permissions failed: \$\{err\.name \|\| err\.message \|\| 'Unknown Error'\}`\);[\s\S]*?setPermissionsGranted\(false\);[\s\S]*?\}[\s\S]*?\}/;

const newCatch = `} catch (err: any) {
        console.error("Camera/Mic access denied:", err);
        if (err.name === "NotReadableError") {
           setWebRtcError("Camera or mic is in use by another application");
           toast.error("Camera or mic is currently in use by another application.");
           setPermissionsGranted(true);
        } else if (err.name === "NotFoundError") {
           setWebRtcError("No camera or microphone found!");
           toast.error("No camera or microphone found!");
           setPermissionsGranted(true);
        } else {
           setWebRtcError(\`\${err.name}: \${err.message}\`);
           toast.error(\`Permissions failed: \${err.name || err.message || 'Unknown Error'}\`);
           setPermissionsGranted(false);
        }
      }`;

if (content.match(catchRegex)) {
  content = content.replace(catchRegex, newCatch);
  
  // Render the error
  content = content.replace(
    '<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Awaiting Permissions</h3>',
    '<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Awaiting Permissions</h3>\n                 {webRtcError && <p className="text-red-500 font-bold mb-2 p-2 bg-red-100 rounded-lg">{webRtcError}</p>}'
  );
  
  fs.writeFileSync(file, content);
  console.log("Injected error rendering successfully!");
} else {
  console.log("Regex match failed for catch block!");
}
