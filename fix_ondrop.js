const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/  const onDrop = \(e: React\.DragEvent\) => \{\r?\n    const onDrop = \(e: React\.DragEvent\) => \{\r?\n    e\.preventDefault\(\);\r?\n    const file = e\.dataTransfer\.files\?\.\[0\];\r?\n    if \(file\) handleResumeUpload\(file\);\r?\n  \};\r?\n/g,
\  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeUpload(file);
  };\n\);

fs.writeFileSync(file, content);
