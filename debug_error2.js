const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Awaiting Permissions<\/h3>/g;
content = content.replace(regex, '<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Awaiting Permissions</h3>\n                 {window.webRtcErrorMsg && <p className="text-red-500 font-bold mb-2 p-2 bg-red-100 rounded-lg">{window.webRtcErrorMsg}</p>}');

const catchRegex = / toast\.error\(`Permissions failed: \$\{err\.name \|\| err\.message \|\| 'Unknown Error'\}`\);/g;
content = content.replace(catchRegex, ' window.webRtcErrorMsg = `${err.name}: ${err.message}`;\n           toast.error(`Permissions failed: ${err.name || err.message || "Unknown Error"}`);');

fs.writeFileSync(file, content);
console.log("Success");
