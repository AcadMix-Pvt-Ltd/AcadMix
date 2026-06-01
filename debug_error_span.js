const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<span className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Awaiting Permissions<\/span>/g;
content = content.replace(regex, '<span className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Awaiting Permissions</span>\n                       {(window as any).webRtcErrorMsg && <div className="text-red-500 font-bold mb-4 p-3 bg-red-100 rounded-lg text-xs max-w-[80%] text-center border border-red-200 shadow-sm">ERROR: {(window as any).webRtcErrorMsg}</div>}');

fs.writeFileSync(file, content);
console.log(content.includes('ERROR: {(window as any).webRtcErrorMsg}') ? "Success" : "Failed");
