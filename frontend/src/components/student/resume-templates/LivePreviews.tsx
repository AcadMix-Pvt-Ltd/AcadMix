import React from 'react';

// --- Shared Components & Helpers ---
const Bullet = ({ children, className = '' }: any) => (
  <p className={`text-[8px] text-black leading-[1.45] pl-[10px] relative before:content-['●'] before:absolute before:left-0 before:text-[6px] before:top-[1px] ${className}`}>
    {children}
  </p>
);

const TechLine = ({ tech }: { tech: string }) => (
  <p className="text-[8px] text-black leading-[1.45] pl-[10px]">
    <span className="font-[700]">Tech Stack: </span>{tech}
  </p>
);

const hasSkills = (skills: any) => 
  skills?.languages?.length || skills?.frameworks?.length || skills?.tools?.length || skills?.databases?.length;


// ============================================================================
// 1. Classic ATS (classic)
// Times New Roman, strictly linear, high contrast black-and-white.
// ============================================================================
const ClassicTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  return (
    <div className="w-full h-full bg-white p-5 overflow-hidden font-serif text-black" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <h1 className="text-center font-bold text-[16px] leading-tight uppercase tracking-wide">
        {p.name || 'Your Name'}
      </h1>
      <p className="text-center text-[8px] mt-1 leading-snug">
        {[p.email, p.phone, p.location].filter(Boolean).join(' | ')}
      </p>
      <p className="text-center text-[8px] mt-[1px] leading-snug mb-3">
        {[p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | ')}
      </p>

      {data.summary?.trim() && (
        <div className="mb-2">
          <h3 className="text-[11px] font-bold border-b border-black pb-[1px] uppercase tracking-wider mb-[3px]">Professional Summary</h3>
          <p className="text-[8px] leading-[1.5] text-justify">{data.summary}</p>
        </div>
      )}

      {/* Education */}
      <div className="mb-2">
        <h3 className="text-[11px] font-bold border-b border-black pb-[1px] uppercase tracking-wider mb-[3px]">Education</h3>
        {p.current_education?.institution && (
          <div className="flex justify-between items-baseline mb-[2px]">
            <p className="text-[9px]">
              <span className="font-bold">{p.current_education.degree || 'B.Tech'}{p.current_education.branch ? ` in ${p.current_education.branch}` : ''}</span>, {p.current_education.institution}
            </p>
            <span className="text-[8px] font-bold">{p.current_education.batch}</span>
          </div>
        )}
        {data.education_history?.map((edu: any, i: number) => (
          <div key={i} className="mb-[2px]">
            <div className="flex justify-between items-baseline">
              <p className="text-[9px]">
                <span className="font-bold">{edu.degree || edu.level}</span>{edu.school ? `, ${edu.school}` : ''}
              </p>
              <span className="text-[8px] font-bold">{edu.gradMonth ? `${edu.gradMonth} ` : ''}{edu.gradYear || edu.year}</span>
            </div>
            <p className="text-[8px] italic">{[edu.field || edu.board, edu.location, edu.percentage].filter(Boolean).join(' | ')}</p>
          </div>
        ))}
      </div>

      {/* Experience */}
      {data.experience?.length > 0 && (
        <div className="mb-2">
          <h3 className="text-[11px] font-bold border-b border-black pb-[1px] uppercase tracking-wider mb-[3px]">Experience</h3>
          {data.experience.slice(0, 3).map((e: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <div className="flex justify-between items-baseline">
                <p className="text-[9px]">
                  <span className="font-bold">{e.role}</span>{e.company ? `, ${e.company}` : ''}
                </p>
                <span className="text-[8px] font-bold">{e.duration}</span>
              </div>
              <p className="text-[8px] italic mb-[1px]">{e.location}</p>
              {e.bullets?.filter((b: string) => b.trim()).slice(0, 4).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects?.length > 0 && (
        <div className="mb-2">
          <h3 className="text-[11px] font-bold border-b border-black pb-[1px] uppercase tracking-wider mb-[3px]">Projects</h3>
          {data.projects.slice(0, 3).map((pr: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <div className="flex justify-between items-baseline">
                <p className="text-[9px] font-bold">{pr.title}</p>
                <span className="text-[8px] font-bold">{pr.duration}</span>
              </div>
              {pr.bullets?.filter((b: string) => b.trim()).slice(0, 4).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
              {pr.tech_stack && <TechLine tech={pr.tech_stack} />}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {hasSkills(data.skills) && (
        <div className="mb-2">
          <h3 className="text-[11px] font-bold border-b border-black pb-[1px] uppercase tracking-wider mb-[3px]">Technical Skills</h3>
          <div className="space-y-[2px]">
            {([['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools & Platforms'], ['databases', 'Databases']] as const).map(([k, label]) => {
              if (!data.skills[k]?.length) return null;
              return <p key={k} className="text-[8px] leading-[1.5]"><span className="font-bold">{label}:</span> {data.skills[k].join(', ')}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. Modern Professional (modern)
// Inter font, accent colors, sleek dividing lines.
// ============================================================================
const ModernTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const accent = '#0284c7'; // Sky blue
  return (
    <div className="w-full h-full bg-white p-5 overflow-hidden font-sans text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex justify-between items-end border-b-2 pb-2 mb-3" style={{ borderColor: accent }}>
        <div>
          <h1 className="text-[18px] font-black tracking-tight" style={{ color: accent }}>{p.name || 'Your Name'}</h1>
          <p className="text-[9px] font-medium text-slate-500">{p.current_education?.degree} {p.current_education?.branch ? `in ${p.current_education.branch}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] leading-tight">{p.email}</p>
          <p className="text-[8px] leading-tight">{p.phone}</p>
          <p className="text-[8px] leading-tight">{p.location}</p>
          <p className="text-[8px] leading-tight font-medium" style={{ color: accent }}>{[p.linkedin, p.github].filter(Boolean).join(' | ')}</p>
        </div>
      </div>

      {data.summary?.trim() && (
        <div className="mb-3">
          <p className="text-[8.5px] leading-relaxed text-slate-600">{data.summary}</p>
        </div>
      )}

      {data.experience?.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: accent }}>Experience</h3>
          {data.experience.slice(0, 3).map((e: any, i: number) => (
            <div key={i} className="mb-[6px]">
              <div className="flex justify-between items-baseline">
                <p className="text-[9.5px] font-bold text-slate-800">{e.role} <span className="font-normal text-slate-500">at {e.company}</span></p>
                <span className="text-[8px] text-slate-400 font-medium">{e.duration}</span>
              </div>
              {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j} className="text-slate-600">{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects?.length > 0 && (
        <div className="mb-3">
          <h3 className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: accent }}>Selected Projects</h3>
          {data.projects.slice(0, 3).map((pr: any, i: number) => (
            <div key={i} className="mb-[6px]">
              <div className="flex justify-between items-baseline">
                <p className="text-[9.5px] font-bold text-slate-800">{pr.title}</p>
                <span className="text-[8px] text-slate-400 font-medium">{pr.duration}</span>
              </div>
              {pr.tech_stack && <p className="text-[7.5px] font-semibold text-slate-500 mb-[2px]">{pr.tech_stack}</p>}
              {pr.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j} className="text-slate-600">{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {/* Education & Skills Split */}
      <div className="flex gap-4">
        <div className="flex-1">
          <h3 className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: accent }}>Education</h3>
          {p.current_education?.institution && (
            <div className="mb-[4px]">
              <p className="text-[9px] font-bold text-slate-800">{p.current_education.institution}</p>
              <p className="text-[8px] text-slate-600">{p.current_education.degree} {p.current_education.branch}</p>
              <p className="text-[8px] text-slate-400">Class of {p.current_education.batch}</p>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: accent }}>Expertise</h3>
          {([['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools']] as const).map(([k, label]) => {
            if (!data.skills[k]?.length) return null;
            return <p key={k} className="text-[8px] leading-[1.4] text-slate-600"><span className="font-semibold text-slate-800">{label}:</span> {data.skills[k].join(', ')}</p>;
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. Compact One Page (compact)
// Dense grid system, tight margins.
// ============================================================================
const CompactTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const H3 = ({ children }: any) => <h3 className="text-[10px] font-bold bg-slate-100 px-1 py-[1px] mb-1 uppercase border-l-2 border-slate-800">{children}</h3>;
  return (
    <div className="w-full h-full bg-white p-3 overflow-hidden font-sans text-slate-900" style={{ fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}>
      <div className="text-center mb-2">
        <h1 className="text-[16px] font-extrabold uppercase">{p.name || 'Your Name'}</h1>
        <p className="text-[7.5px]">{[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).join(' • ')}</p>
      </div>

      <H3>Education</H3>
      <div className="mb-2">
        {p.current_education?.institution && (
          <div className="flex justify-between items-end mb-[2px]">
            <p className="text-[8.5px]"><b>{p.current_education.degree} {p.current_education.branch}</b> - {p.current_education.institution}</p>
            <p className="text-[8px]">Exp. {p.current_education.batch}</p>
          </div>
        )}
        {data.education_history?.map((edu: any, i: number) => (
          <div key={i} className="flex justify-between items-end mb-[1px]">
            <p className="text-[8px]"><b>{edu.degree || edu.level}</b> - {edu.school}</p>
            <p className="text-[7.5px]">{edu.percentage ? `Score: ${edu.percentage} | ` : ''}{edu.gradYear || edu.year}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <H3>Skills</H3>
          <div className="space-y-[1px]">
            {([['languages', 'Lang'], ['frameworks', 'FW'], ['tools', 'Tools']] as const).map(([k, label]) => {
              if (!data.skills[k]?.length) return null;
              return <p key={k} className="text-[7.5px] leading-tight"><b>{label}:</b> {data.skills[k].join(', ')}</p>;
            })}
          </div>
        </div>
        <div>
          <H3>Certifications & Achievements</H3>
          <ul className="pl-3 list-disc text-[7.5px] leading-tight marker:text-[6px]">
            {data.certifications?.slice(0, 2).map((c: any, i: number) => <li key={i}>{c.name} {c.issuer && `(${c.issuer})`}</li>)}
            {data.achievements?.slice(0, 2).map((a: any, i: number) => <li key={`a${i}`}>{typeof a === 'string' ? a : a.title}</li>)}
          </ul>
        </div>
      </div>

      <H3>Experience</H3>
      <div className="mb-2">
        {data.experience?.slice(0, 2).map((e: any, i: number) => (
          <div key={i} className="mb-[3px]">
            <div className="flex justify-between">
              <p className="text-[8.5px]"><b>{e.role}</b> @ {e.company}</p>
              <p className="text-[7.5px]">{e.duration}</p>
            </div>
            {e.bullets?.slice(0, 2).map((b: string, j: number) => <p key={j} className="text-[7.5px] leading-tight pl-2 relative before:content-['-'] before:absolute before:left-0">{b}</p>)}
          </div>
        ))}
      </div>

      <H3>Projects</H3>
      <div>
        {data.projects?.slice(0, 3).map((pr: any, i: number) => (
          <div key={i} className="mb-[3px]">
            <div className="flex justify-between">
              <p className="text-[8.5px]"><b>{pr.title}</b> {pr.tech_stack && <span className="text-[7px] text-slate-500 font-normal">[{pr.tech_stack}]</span>}</p>
              <p className="text-[7.5px]">{pr.duration}</p>
            </div>
            {pr.bullets?.slice(0, 2).map((b: string, j: number) => <p key={j} className="text-[7.5px] leading-tight pl-2 relative before:content-['-'] before:absolute before:left-0">{b}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. Campus Placement (campus)
// Highly scannable, bold degree/CGPA focus.
// ============================================================================
const CampusTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const H3 = ({ children }: any) => <h3 className="text-[11px] font-black border-b-2 border-slate-800 pb-[1px] mb-1 mt-2 uppercase">{children}</h3>;
  return (
    <div className="w-full h-full bg-white p-5 overflow-hidden font-sans text-slate-900" style={{ fontFamily: "'Arial', sans-serif" }}>
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-[18px] font-black uppercase tracking-tighter">{p.name || 'Your Name'}</h1>
        <div className="text-right">
          <p className="text-[8px] font-bold">{p.email}</p>
          <p className="text-[8px] font-bold">{p.phone}</p>
        </div>
      </div>

      <div className="bg-slate-100 p-2 rounded-sm mb-3 flex justify-between items-center border border-slate-200">
        <div>
          <p className="text-[10px] font-black">{p.current_education?.degree} {p.current_education?.branch}</p>
          <p className="text-[8px] font-semibold">{p.current_education?.institution}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold">Batch: {p.current_education?.batch}</p>
          {data.education_history?.find((e: any) => e.level?.includes('12'))?.percentage && (
            <p className="text-[8px]">Class 12: <span className="font-bold">{data.education_history.find((e: any) => e.level?.includes('12')).percentage}</span></p>
          )}
        </div>
      </div>

      {hasSkills(data.skills) && (
        <div>
          <H3>Technical Proficiencies</H3>
          <p className="text-[8.5px] leading-[1.5]">
            <span className="font-bold">Languages:</span> {data.skills.languages?.join(', ')} <br/>
            <span className="font-bold">Frameworks/Tools:</span> {[...(data.skills.frameworks || []), ...(data.skills.tools || [])].join(', ')}
          </p>
        </div>
      )}

      {data.projects?.length > 0 && (
        <div>
          <H3>Key Academic Projects</H3>
          {data.projects.slice(0, 3).map((pr: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <p className="text-[9.5px]"><b>{pr.title}</b> | <i className="text-[8px]">{pr.tech_stack}</i></p>
              {pr.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {data.experience?.length > 0 && (
        <div>
          <H3>Internships & Experience</H3>
          {data.experience.slice(0, 2).map((e: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <div className="flex justify-between items-baseline">
                <p className="text-[9.5px]"><b>{e.role}</b>, {e.company}</p>
                <span className="text-[8px] font-semibold">{e.duration}</span>
              </div>
              {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {data.certifications?.length > 0 && (
        <div>
          <H3>Certifications</H3>
          <ul className="list-disc pl-4 text-[8.5px] marker:text-[6px]">
            {data.certifications.slice(0, 3).map((c: any, i: number) => <li key={i}>{c.name} ({c.issuer})</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. Developer (developer)
// Tech-stack focused, blue accents, monospace touches.
// ============================================================================
const DeveloperTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const accent = '#2563eb';
  const H3 = ({ children }: any) => <h3 className="text-[11px] font-bold border-b pb-[2px] mb-2 uppercase tracking-wide flex items-center gap-1" style={{ borderColor: accent, color: accent }}><span className="text-[12px]">{'/>'}</span> {children}</h3>;
  
  return (
    <div className="w-full h-full bg-white p-5 overflow-hidden font-sans text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center mb-4">
        <h1 className="text-[20px] font-black tracking-tight">{p.name || 'Your Name'}</h1>
        <p className="text-[9px] font-mono mt-1 text-slate-500">
          {[p.email, p.linkedin, p.github, p.portfolio].filter(Boolean).join(' | ')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <H3>Stack</H3>
          <div className="space-y-2">
            {([['languages', 'Lang'], ['frameworks', 'Frameworks'], ['tools', 'Tools'], ['databases', 'DBs']] as const).map(([k, label]) => {
              if (!data.skills[k]?.length) return null;
              return (
                <div key={k}>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                  <div className="flex flex-wrap gap-1">
                    {data.skills[k].map((skill: string, i: number) => (
                      <span key={i} className="px-[4px] py-[2px] bg-slate-100 text-slate-600 text-[7px] font-mono rounded-sm border border-slate-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <H3>Education</H3>
            {p.current_education?.institution && (
              <div className="mb-[4px]">
                <p className="text-[8.5px] font-bold">{p.current_education.degree} {p.current_education.branch}</p>
                <p className="text-[8px] text-slate-600">{p.current_education.institution}</p>
                <p className="text-[7.5px] text-slate-400">{p.current_education.batch}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2">
          {data.projects?.length > 0 && (
            <div className="mb-4">
              <H3>Builds & Projects</H3>
              {data.projects.slice(0, 3).map((pr: any, i: number) => (
                <div key={i} className="mb-[6px]">
                  <div className="flex justify-between items-baseline mb-[2px]">
                    <p className="text-[10px] font-bold">{pr.title}</p>
                    {pr.tech_stack && <span className="text-[7.5px] font-mono text-blue-600 bg-blue-50 px-1 py-[1px] rounded">{pr.tech_stack}</span>}
                  </div>
                  {pr.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
                </div>
              ))}
            </div>
          )}

          {data.experience?.length > 0 && (
            <div>
              <H3>Experience</H3>
              {data.experience.slice(0, 3).map((e: any, i: number) => (
                <div key={i} className="mb-[6px]">
                  <p className="text-[10px]"><b>{e.role}</b> <span className="text-slate-400 mx-1">|</span> {e.company}</p>
                  <p className="text-[7.5px] text-slate-500 font-mono mb-[2px]">{e.duration}</p>
                  {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. Core Engineering (core-engineering)
// Utilitarian, structural, teal accents.
// ============================================================================
const CoreEnggTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const accent = '#0f766e'; // Teal
  const H3 = ({ children }: any) => <h3 className="text-[11px] font-bold border-b-[1.5px] pb-[1px] mb-[3px] uppercase tracking-wide mt-2" style={{ borderColor: accent, color: accent }}>{children}</h3>;
  
  return (
    <div className="w-full h-full bg-white p-5 overflow-hidden font-serif text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>
      <h1 className="text-[20px] font-bold text-center tracking-wide">{p.name || 'Your Name'}</h1>
      <p className="text-center text-[9px] mb-2">{[p.email, p.phone, p.location].filter(Boolean).join('  |  ')}</p>

      <H3>Academic Background</H3>
      <table className="w-full text-[8.5px] mb-2 border-collapse">
        <tbody>
          {p.current_education?.institution && (
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold">{p.current_education.degree} {p.current_education.branch}</td>
              <td className="py-1">{p.current_education.institution}</td>
              <td className="py-1 text-right">{p.current_education.batch}</td>
            </tr>
          )}
          {data.education_history?.map((edu: any, i: number) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-1 font-bold">{edu.degree || edu.level}</td>
              <td className="py-1">{edu.school}</td>
              <td className="py-1 text-right">{edu.gradYear || edu.year}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.experience?.length > 0 && (
        <div>
          <H3>Professional Experience</H3>
          {data.experience.slice(0, 2).map((e: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <div className="flex justify-between">
                <p className="text-[9.5px]"><b>{e.role}</b>, {e.company}</p>
                <p className="text-[8px] italic">{e.duration}</p>
              </div>
              {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {data.projects?.length > 0 && (
        <div>
          <H3>Core Projects & Lab Work</H3>
          {data.projects.slice(0, 3).map((pr: any, i: number) => (
            <div key={i} className="mb-[4px]">
              <p className="text-[9.5px]"><b>{pr.title}</b></p>
              {pr.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j}>{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      {hasSkills(data.skills) && (
        <div>
          <H3>Technical Competencies</H3>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {([['languages', 'Programming'], ['tools', 'Software & Tools']] as const).map(([k, label]) => {
              if (!data.skills[k]?.length) return null;
              return <p key={k} className="text-[8.5px]"><b>{label}:</b> {data.skills[k].join(', ')}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 7. Management (management)
// Executive style, serif headers, sans-serif body.
// ============================================================================
const ManagementTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  const accent = '#4c1d95'; // Deep violet
  const H3 = ({ children }: any) => <h3 className="text-[12px] font-bold border-b border-slate-300 pb-[2px] mb-[4px] mt-3 uppercase tracking-widest font-serif" style={{ color: accent }}>{children}</h3>;
  
  return (
    <div className="w-full h-full bg-[#fafafa] p-6 overflow-hidden font-sans text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center">
        <h1 className="text-[22px] font-bold font-serif tracking-wide" style={{ color: accent }}>{p.name || 'Your Name'}</h1>
        <p className="text-[8.5px] uppercase tracking-widest text-slate-500 mt-1 mb-2">
          {[p.email, p.phone, p.linkedin].filter(Boolean).join(' • ')}
        </p>
      </div>

      {data.summary?.trim() && (
        <div>
          <H3>Executive Summary</H3>
          <p className="text-[8.5px] leading-relaxed text-justify">{data.summary}</p>
        </div>
      )}

      {data.experience?.length > 0 && (
        <div>
          <H3>Professional Experience</H3>
          {data.experience.slice(0, 3).map((e: any, i: number) => (
            <div key={i} className="mb-[6px]">
              <div className="flex justify-between items-baseline mb-[1px]">
                <p className="text-[10px] font-bold font-serif">{e.company}</p>
                <p className="text-[8px] font-semibold tracking-wide">{e.duration}</p>
              </div>
              <p className="text-[9px] italic text-slate-600 mb-[2px]">{e.role}</p>
              {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <Bullet key={j} className="text-slate-700">{b}</Bullet>)}
            </div>
          ))}
        </div>
      )}

      <div>
        <H3>Education</H3>
        {p.current_education?.institution && (
          <div className="flex justify-between items-baseline mb-[2px]">
            <p className="text-[9px]"><b>{p.current_education.institution}</b> <span className="text-slate-500 mx-1">|</span> {p.current_education.degree} {p.current_education.branch}</p>
            <p className="text-[8px] font-semibold">{p.current_education.batch}</p>
          </div>
        )}
      </div>

      {(data.certifications?.length > 0 || data.achievements?.length > 0) && (
        <div>
          <H3>Leadership & Distinctions</H3>
          <ul className="list-disc pl-4 text-[8.5px] marker:text-[6px] space-y-[2px]">
            {data.certifications?.slice(0, 2).map((c: any, i: number) => <li key={`c${i}`}>{c.name} {c.issuer && `(${c.issuer})`}</li>)}
            {data.achievements?.slice(0, 2).map((a: any, i: number) => <li key={`a${i}`}>{typeof a === 'string' ? a : a.title}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 8. ATS Strict (ats-strict)
// Completely unstyled, purely semantic and linear for maximum parseability.
// ============================================================================
const AtsStrictTemplate = ({ data }: { data: any }) => {
  const p = data.personal;
  return (
    <div className="w-full h-full bg-white p-6 overflow-hidden font-sans text-black" style={{ fontFamily: "Arial, sans-serif" }}>
      <h1 className="text-[16px] font-bold mb-1">{p.name || 'Your Name'}</h1>
      <p className="text-[10px] mb-4">{[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join(' | ')}</p>

      {data.summary?.trim() && (
        <div className="mb-4">
          <h2 className="text-[12px] font-bold uppercase mb-1">Summary</h2>
          <p className="text-[10px] leading-normal">{data.summary}</p>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-[12px] font-bold uppercase mb-1">Education</h2>
        {p.current_education?.institution && (
          <p className="text-[10px] mb-1">
            <b>{p.current_education.degree} in {p.current_education.branch}</b>, {p.current_education.institution} (Expected: {p.current_education.batch})
          </p>
        )}
        {data.education_history?.map((edu: any, i: number) => (
          <p key={i} className="text-[10px] mb-1">
            <b>{edu.degree || edu.level}</b>, {edu.school} ({edu.gradYear || edu.year})
          </p>
        ))}
      </div>

      {data.experience?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[12px] font-bold uppercase mb-1">Experience</h2>
          {data.experience.slice(0, 3).map((e: any, i: number) => (
            <div key={i} className="mb-2">
              <p className="text-[10px]"><b>{e.role}</b>, {e.company} ({e.duration})</p>
              <ul className="list-disc pl-4 text-[10px] mt-1">
                {e.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {data.projects?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[12px] font-bold uppercase mb-1">Projects</h2>
          {data.projects.slice(0, 3).map((pr: any, i: number) => (
            <div key={i} className="mb-2">
              <p className="text-[10px]"><b>{pr.title}</b> ({pr.duration})</p>
              <ul className="list-disc pl-4 text-[10px] mt-1">
                {pr.bullets?.filter((b: string) => b.trim()).slice(0, 3).map((b: string, j: number) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {hasSkills(data.skills) && (
        <div className="mb-4">
          <h2 className="text-[12px] font-bold uppercase mb-1">Skills</h2>
          {([['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools']] as const).map(([k, label]) => {
            if (!data.skills[k]?.length) return null;
            return <p key={k} className="text-[10px] mb-[2px]"><b>{label}:</b> {data.skills[k].join(', ')}</p>;
          })}
        </div>
      )}
    </div>
  );
};


// ============================================================================
// Main Exported Component
// ============================================================================
export const RenderTemplatePreview = ({ data, template }: { data: any; template: string }) => {
  switch (template) {
    case 'classic': return <ClassicTemplate data={data} />;
    case 'modern': return <ModernTemplate data={data} />;
    case 'compact': return <CompactTemplate data={data} />;
    case 'campus': return <CampusTemplate data={data} />;
    case 'developer': return <DeveloperTemplate data={data} />;
    case 'core-engineering': return <CoreEnggTemplate data={data} />;
    case 'management': return <ManagementTemplate data={data} />;
    case 'ats-strict': return <AtsStrictTemplate data={data} />;
    default: return <ClassicTemplate data={data} />;
  }
};
