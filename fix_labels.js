const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/if \(allDevices\.some\(d => d\.label !== ''\)\) \{/, 'if (true) {');

fs.writeFileSync(file, content);
console.log('Removed hasLabels check');
