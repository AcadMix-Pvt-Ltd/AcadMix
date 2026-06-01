const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/{sessionConfig\?\.interview_type\?\.charAt\(0\)\.toUpperCase\(\) \+ sessionConfig\?\.interview_type\?\.slice\(1\)} Interview/g,
\{sessionConfig?.interview_type ? sessionConfig.interview_type.charAt(0).toUpperCase() + sessionConfig.interview_type.slice(1) : 'Mock'} Interview\);

fs.writeFileSync(file, content);
