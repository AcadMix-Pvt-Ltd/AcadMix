const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/window\.webRtcErrorMsg/g, '(window as any).webRtcErrorMsg');

fs.writeFileSync(file, content);
console.log("Success");
