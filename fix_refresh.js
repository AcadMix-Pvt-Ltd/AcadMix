const fs = require('fs');
const file = 'frontend/src/pages/AIInterviewSession.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
  // Hardware emergency cleanup on refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
`;

if (!content.includes('handleBeforeUnload')) {
    content = content.replace("const streamRef = useRef<MediaStream | null>(null);", "const streamRef = useRef<MediaStream | null>(null);" + injection);
    fs.writeFileSync(file, content);
    console.log("Success adding beforeunload");
} else {
    console.log("Already added");
}
