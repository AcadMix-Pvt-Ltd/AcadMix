const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add requestInProgress ref
if (!content.includes('requestInProgressRef')) {
    content = content.replace(
        "const requestPermissionsAndEnumerate = async () => {",
        "const requestInProgressRef = useRef(false);\n  const requestPermissionsAndEnumerate = async () => {\n      if (requestInProgressRef.current) return;\n      requestInProgressRef.current = true;"
    );
    
    // Add finally block to reset it
    const catchRegex = /(setPermissionsGranted\(false\);\n\s*\}\n\s*\})/g;
    content = content.replace(catchRegex, "$1 finally { requestInProgressRef.current = false; }");
    
    fs.writeFileSync(file, content);
    console.log("Success adding ref");
} else {
    console.log("Already added");
}
