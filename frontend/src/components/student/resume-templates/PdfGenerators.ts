// Helper functions for escaping HTML
const esc = (s: string) => s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '';

const hasSkills = (skills: any) => 
  skills?.languages?.length || skills?.frameworks?.length || skills?.tools?.length || skills?.databases?.length;

// Shared layout wrapper for standard A4
const wrapA4 = (content: string, font: string = "Arial, sans-serif") => `
<div style="font-family:${font};color:#000;padding:48px 56px;width:794px;min-height:1123px;box-sizing:border-box;background:#fff">
  ${content}
</div>
`;

// ============================================================================
// 1. Classic ATS (classic)
// ============================================================================
export const buildClassicPdf = (data: any) => {
  const p = data.personal || {};
  let html = '';
  html += `<h1 style="text-align:center;font-size:24px;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:1px">${esc(p.name || 'Your Name')}</h1>`;
  const contact = [p.email, p.phone, p.location].filter(Boolean).map(esc);
  if (contact.length) html += `<p style="text-align:center;font-size:12px;margin:4px 0 0">${contact.join(' | ')}</p>`;
  const links = [p.linkedin, p.github, p.portfolio].filter(Boolean).map(esc);
  if (links.length) html += `<p style="text-align:center;font-size:12px;margin:2px 0 12px">${links.join(' | ')}</p>`;

  const SectionH3 = (title: string) => `<h3 style="font-size:14px;font-weight:700;border-bottom:1px solid #000;padding-bottom:2px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:0.5px">${title}</h3>`;

  if (data.summary?.trim()) {
    html += SectionH3('Professional Summary');
    html += `<p style="font-size:12px;line-height:1.6;margin:0;text-align:justify">${esc(data.summary)}</p>`;
  }

  html += SectionH3('Education');
  if (p.current_education?.institution) {
    html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:13px"><b>${esc(p.current_education.degree || 'B.Tech')}${p.current_education.branch ? ` in ${esc(p.current_education.branch)}` : ''}</b>, ${esc(p.current_education.institution)}</span>
      <span style="font-size:12px;font-weight:700">${esc(p.current_education.batch)}</span>
    </div>`;
  }
  data.education_history?.forEach((edu: any) => {
    html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
      <span style="font-size:13px"><b>${esc(edu.degree || edu.level)}</b>${edu.school ? `, ${esc(edu.school)}` : ''}</span>
      <span style="font-size:12px;font-weight:700">${esc(edu.gradMonth ? edu.gradMonth + ' ' : '')}${esc(edu.gradYear || edu.year)}</span>
    </div>
    <p style="font-size:11px;font-style:italic;margin:0 0 6px">${[edu.field || edu.board, edu.location, edu.percentage].filter(Boolean).map(esc).join(' | ')}</p>`;
  });

  if (data.experience?.length) {
    html += SectionH3('Experience');
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:13px"><b>${esc(e.role)}</b>${e.company ? `, ${esc(e.company)}` : ''}</span>
          <span style="font-size:12px;font-weight:700">${esc(e.duration)}</span>
        </div>
        <p style="font-size:11px;font-style:italic;margin:0 0 2px">${esc(e.location)}</p>`;
      e.bullets?.filter((b: string) => b.trim()).forEach((b: string) => {
        html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`;
      });
      html += `</div>`;
    });
  }

  if (data.projects?.length) {
    html += SectionH3('Projects');
    data.projects.forEach((pr: any) => {
      html += `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
          <span style="font-size:13px;font-weight:700">${esc(pr.title)}</span>
          <span style="font-size:12px;font-weight:700">${esc(pr.duration)}</span>
        </div>`;
      pr.bullets?.filter((b: string) => b.trim()).forEach((b: string) => {
        html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`;
      });
      if (pr.tech_stack) html += `<div style="font-size:12px;padding-left:14px;line-height:1.5;margin-top:2px"><b>Tech Stack:</b> ${esc(pr.tech_stack)}</div>`;
      html += `</div>`;
    });
  }

  if (hasSkills(data.skills)) {
    html += SectionH3('Technical Skills');
    const skRows = [['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools & Platforms'], ['databases', 'Databases']] as const;
    skRows.forEach(([k, label]) => {
      if (data.skills[k]?.length) html += `<p style="font-size:12px;line-height:1.6;margin:0 0 2px"><b>${label}:</b> ${esc(data.skills[k].join(', '))}</p>`;
    });
  }

  return wrapA4(html, "'Times New Roman', Times, serif");
};

// ============================================================================
// 2. Modern Professional (modern)
// ============================================================================
export const buildModernPdf = (data: any) => {
  const p = data.personal || {};
  const accent = '#0284c7';
  let html = '';

  html += `
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid ${accent};padding-bottom:12px;margin-bottom:16px">
    <div>
      <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.5px;color:${accent};margin:0">${esc(p.name || 'Your Name')}</h1>
      <p style="font-size:13px;font-weight:500;color:#64748b;margin:2px 0 0">${esc(p.current_education?.degree || '')} ${esc(p.current_education?.branch ? `in ${p.current_education.branch}` : '')}</p>
    </div>
    <div style="text-align:right;font-size:11px;line-height:1.4">
      <p style="margin:0">${esc(p.email)}</p>
      <p style="margin:0">${esc(p.phone)}</p>
      <p style="margin:0">${esc(p.location)}</p>
      <p style="margin:0;font-weight:500;color:${accent}">${[p.linkedin, p.github].filter(Boolean).map(esc).join(' | ')}</p>
    </div>
  </div>`;

  const SectionH3 = (title: string) => `<h3 style="font-size:14px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;color:${accent}">${title}</h3>`;

  if (data.summary?.trim()) {
    html += `<div style="margin-bottom:16px"><p style="font-size:12px;line-height:1.6;color:#475569;margin:0">${esc(data.summary)}</p></div>`;
  }

  if (data.experience?.length) {
    html += `<div style="margin-bottom:16px">`;
    html += SectionH3('Experience');
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
          <span style="font-size:14px;font-weight:700;color:#1e293b">${esc(e.role)} <span style="font-weight:400;color:#64748b">at ${esc(e.company)}</span></span>
          <span style="font-size:11px;color:#94a3b8;font-weight:500">${esc(e.duration)}</span>
        </div>`;
      e.bullets?.filter((b: string) => b.trim()).forEach((b: string) => {
        html += `<div style="font-size:12px;line-height:1.5;color:#475569;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  }

  if (data.projects?.length) {
    html += `<div style="margin-bottom:16px">`;
    html += SectionH3('Selected Projects');
    data.projects.forEach((pr: any) => {
      html += `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
          <span style="font-size:14px;font-weight:700;color:#1e293b">${esc(pr.title)}</span>
          <span style="font-size:11px;color:#94a3b8;font-weight:500">${esc(pr.duration)}</span>
        </div>`;
      if (pr.tech_stack) html += `<p style="font-size:10px;font-weight:600;color:#64748b;margin:0 0 4px">${esc(pr.tech_stack)}</p>`;
      pr.bullets?.filter((b: string) => b.trim()).forEach((b: string) => {
        html += `<div style="font-size:12px;line-height:1.5;color:#475569;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  }

  // 2 column bottom
  html += `<div style="display:flex;gap:32px">
    <div style="flex:1">
      ${SectionH3('Education')}`;
      if (p.current_education?.institution) {
        html += `<div style="margin-bottom:6px">
          <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 2px">${esc(p.current_education.institution)}</p>
          <p style="font-size:12px;color:#475569;margin:0 0 2px">${esc(p.current_education.degree)} ${esc(p.current_education.branch)}</p>
          <p style="font-size:11px;color:#94a3b8;margin:0">Class of ${esc(p.current_education.batch)}</p>
        </div>`;
      }
    html += `</div>
    <div style="flex:1">
      ${SectionH3('Expertise')}`;
      const skRows = [['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools']] as const;
      skRows.forEach(([k, label]) => {
        if (data.skills[k]?.length) html += `<p style="font-size:12px;line-height:1.5;color:#475569;margin:0 0 4px"><span style="font-weight:600;color:#1e293b">${label}:</span> ${esc(data.skills[k].join(', '))}</p>`;
      });
    html += `</div>
  </div>`;

  return wrapA4(html, "'Inter', 'Helvetica Neue', sans-serif");
};

// ============================================================================
// 3. Compact One Page (compact)
// ============================================================================
export const buildCompactPdf = (data: any) => {
  const p = data.personal || {};
  let html = '';

  html += `<div style="text-align:center;margin-bottom:12px">
    <h1 style="font-size:20px;font-weight:800;text-transform:uppercase;margin:0 0 4px">${esc(p.name || 'Your Name')}</h1>
    <p style="font-size:10px;margin:0">${[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).map(esc).join(' &bull; ')}</p>
  </div>`;

  const H3 = (t: string) => `<h3 style="font-size:13px;font-weight:700;background:#f1f5f9;padding:2px 4px;margin:0 0 6px;text-transform:uppercase;border-left:3px solid #0f172a">${t}</h3>`;

  html += H3('Education');
  html += `<div style="margin-bottom:8px">`;
  if (p.current_education?.institution) {
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2px">
      <span style="font-size:12px"><b>${esc(p.current_education.degree)} ${esc(p.current_education.branch)}</b> - ${esc(p.current_education.institution)}</span>
      <span style="font-size:11px">Exp. ${esc(p.current_education.batch)}</span>
    </div>`;
  }
  data.education_history?.forEach((edu: any) => {
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2px">
      <span style="font-size:11px"><b>${esc(edu.degree || edu.level)}</b> - ${esc(edu.school)}</span>
      <span style="font-size:10px">${edu.percentage ? `Score: ${esc(edu.percentage)} | ` : ''}${esc(edu.gradYear || edu.year)}</span>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="display:flex;gap:16px;margin-bottom:8px">
    <div style="flex:1">
      ${H3('Skills')}
      <div style="margin-bottom:4px">`;
      const skRows = [['languages', 'Lang'], ['frameworks', 'FW'], ['tools', 'Tools']] as const;
      skRows.forEach(([k, label]) => {
        if (data.skills[k]?.length) html += `<p style="font-size:11px;line-height:1.4;margin:0"><b>${label}:</b> ${esc(data.skills[k].join(', '))}</p>`;
      });
      html += `</div>
    </div>
    <div style="flex:1">
      ${H3('Certifications & Achievements')}
      <ul style="padding-left:16px;font-size:11px;line-height:1.4;margin:0">`;
      data.certifications?.forEach((c: any) => html += `<li>${esc(c.name)} ${c.issuer ? `(${esc(c.issuer)})` : ''}</li>`);
      data.achievements?.forEach((a: any) => html += `<li>${esc(typeof a === 'string' ? a : a.title)}</li>`);
      html += `</ul>
    </div>
  </div>`;

  html += H3('Experience');
  html += `<div style="margin-bottom:8px">`;
  data.experience?.forEach((e: any) => {
    html += `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:12px"><b>${esc(e.role)}</b> @ ${esc(e.company)}</span>
        <span style="font-size:11px">${esc(e.duration)}</span>
      </div>`;
    e.bullets?.forEach((b: string) => html += `<div style="font-size:11px;line-height:1.3;padding-left:10px;position:relative"><span style="position:absolute;left:0;top:0">-</span>${esc(b)}</div>`);
    html += `</div>`;
  });
  html += `</div>`;

  html += H3('Projects');
  html += `<div>`;
  data.projects?.forEach((pr: any) => {
    html += `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:12px"><b>${esc(pr.title)}</b> ${pr.tech_stack ? `<span style="font-size:10px;color:#64748b;font-weight:400">[${esc(pr.tech_stack)}]</span>` : ''}</span>
        <span style="font-size:11px">${esc(pr.duration)}</span>
      </div>`;
    pr.bullets?.forEach((b: string) => html += `<div style="font-size:11px;line-height:1.3;padding-left:10px;position:relative"><span style="position:absolute;left:0;top:0">-</span>${esc(b)}</div>`);
    html += `</div>`;
  });
  html += `</div>`;

  return wrapA4(html, "'Helvetica Neue', Helvetica, sans-serif");
};

// ============================================================================
// 4. Campus Placement (campus)
// ============================================================================
export const buildCampusPdf = (data: any) => {
  const p = data.personal || {};
  let html = '';

  html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <h1 style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin:0">${esc(p.name || 'Your Name')}</h1>
    <div style="text-align:right">
      <p style="font-size:12px;font-weight:700;margin:0 0 2px">${esc(p.email)}</p>
      <p style="font-size:12px;font-weight:700;margin:0">${esc(p.phone)}</p>
    </div>
  </div>`;

  html += `<div style="background:#f1f5f9;padding:12px;border:1px solid #e2e8f0;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;border-radius:4px">
    <div>
      <p style="font-size:14px;font-weight:900;margin:0 0 4px">${esc(p.current_education?.degree)} ${esc(p.current_education?.branch)}</p>
      <p style="font-size:12px;font-weight:600;margin:0">${esc(p.current_education?.institution)}</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:12px;font-weight:700;margin:0 0 4px">Batch: ${esc(p.current_education?.batch)}</p>`;
      const class12 = data.education_history?.find((e: any) => e.level?.includes('12'));
      if (class12?.percentage) html += `<p style="font-size:12px;margin:0">Class 12: <span style="font-weight:700">${esc(class12.percentage)}</span></p>`;
    html += `</div>
  </div>`;

  const H3 = (t: string) => `<h3 style="font-size:14px;font-weight:900;border-bottom:2px solid #0f172a;padding-bottom:2px;margin:16px 0 8px;text-transform:uppercase">${t}</h3>`;

  if (hasSkills(data.skills)) {
    html += H3('Technical Proficiencies');
    html += `<p style="font-size:12px;line-height:1.6;margin:0">
      <b>Languages:</b> ${esc(data.skills.languages?.join(', '))} <br/>
      <b>Frameworks/Tools:</b> ${esc([...(data.skills.frameworks || []), ...(data.skills.tools || [])].join(', '))}
    </p>`;
  }

  if (data.projects?.length) {
    html += H3('Key Academic Projects');
    data.projects.forEach((pr: any) => {
      html += `<div style="margin-bottom:8px">
        <p style="font-size:13px;margin:0 0 4px"><b>${esc(pr.title)}</b> | <i style="font-size:11px">${esc(pr.tech_stack)}</i></p>`;
      pr.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.4;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
      html += `</div>`;
    });
  }

  if (data.experience?.length) {
    html += H3('Internships & Experience');
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
          <span style="font-size:13px"><b>${esc(e.role)}</b>, ${esc(e.company)}</span>
          <span style="font-size:11px;font-weight:600">${esc(e.duration)}</span>
        </div>`;
      e.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.4;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
      html += `</div>`;
    });
  }

  if (data.certifications?.length) {
    html += H3('Certifications');
    html += `<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5">`;
    data.certifications.forEach((c: any) => html += `<li>${esc(c.name)} (${esc(c.issuer)})</li>`);
    html += `</ul>`;
  }

  return wrapA4(html, "'Arial', sans-serif");
};

// ============================================================================
// 5. Developer (developer)
// ============================================================================
export const buildDeveloperPdf = (data: any) => {
  const p = data.personal || {};
  const accent = '#2563eb';
  let html = '';

  html += `<div style="text-align:center;margin-bottom:24px">
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0">${esc(p.name || 'Your Name')}</h1>
    <p style="font-size:12px;font-family:monospace;color:#64748b;margin:6px 0 0">
      ${[p.email, p.linkedin, p.github, p.portfolio].filter(Boolean).map(esc).join(' | ')}
    </p>
  </div>`;

  const H3 = (t: string) => `<h3 style="font-size:14px;font-weight:700;border-bottom:1px solid ${accent};padding-bottom:4px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;color:${accent};display:flex;align-items:center"><span style="font-size:16px;margin-right:6px">/&gt;</span>${t}</h3>`;

  html += `<div style="display:flex;gap:24px">
    <div style="width:30%">
      ${H3('Stack')}
      <div style="margin-bottom:24px">`;
      const skRows = [['languages', 'Lang'], ['frameworks', 'Frameworks'], ['tools', 'Tools'], ['databases', 'DBs']] as const;
      skRows.forEach(([k, label]) => {
        if (data.skills[k]?.length) {
          html += `<p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">${label}</p>`;
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">`;
          data.skills[k].forEach((sk: string) => {
            html += `<span style="background:#f1f5f9;color:#475569;font-size:10px;font-family:monospace;padding:3px 6px;border-radius:2px;border:1px solid #e2e8f0">${esc(sk)}</span>`;
          });
          html += `</div>`;
        }
      });
      html += `</div>
      ${H3('Education')}
      <div>`;
      if (p.current_education?.institution) {
        html += `<p style="font-size:12px;font-weight:700;margin:0 0 2px">${esc(p.current_education.degree)} ${esc(p.current_education.branch)}</p>
        <p style="font-size:11px;color:#475569;margin:0 0 2px">${esc(p.current_education.institution)}</p>
        <p style="font-size:10px;color:#94a3b8;margin:0">${esc(p.current_education.batch)}</p>`;
      }
      html += `</div>
    </div>
    <div style="width:70%">`;
      if (data.projects?.length) {
        html += `<div style="margin-bottom:24px">
          ${H3('Builds & Projects')}`;
          data.projects.forEach((pr: any) => {
            html += `<div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
                <span style="font-size:14px;font-weight:700">${esc(pr.title)}</span>`;
                if (pr.tech_stack) html += `<span style="font-size:10px;font-family:monospace;color:#2563eb;background:#eff6ff;padding:2px 4px;border-radius:2px">${esc(pr.tech_stack)}</span>`;
              html += `</div>`;
            pr.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
            html += `</div>`;
          });
        html += `</div>`;
      }
      if (data.experience?.length) {
        html += `<div>
          ${H3('Experience')}`;
          data.experience.forEach((e: any) => {
            html += `<div style="margin-bottom:12px">
              <p style="font-size:14px;margin:0 0 2px"><b>${esc(e.role)}</b> <span style="color:#94a3b8;margin:0 4px">|</span> ${esc(e.company)}</p>
              <p style="font-size:10px;color:#64748b;font-family:monospace;margin:0 0 4px">${esc(e.duration)}</p>`;
            e.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
            html += `</div>`;
          });
        html += `</div>`;
      }
    html += `</div>
  </div>`;

  return wrapA4(html, "'Inter', sans-serif");
};

// ============================================================================
// 6. Core Engineering (core-engineering)
// ============================================================================
export const buildCoreEnggPdf = (data: any) => {
  const p = data.personal || {};
  const accent = '#0f766e';
  let html = '';

  html += `<h1 style="font-size:28px;font-weight:700;text-align:center;letter-spacing:1px;margin:0">${esc(p.name || 'Your Name')}</h1>
  <p style="text-align:center;font-size:12px;margin:6px 0 16px">${[p.email, p.phone, p.location].filter(Boolean).map(esc).join('  |  ')}</p>`;

  const H3 = (t: string) => `<h3 style="font-size:14px;font-weight:700;border-bottom:2px solid ${accent};padding-bottom:2px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px;color:${accent}">${t}</h3>`;

  html += H3('Academic Background');
  html += `<table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:16px"><tbody>`;
  if (p.current_education?.institution) {
    html += `<tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:6px 0;font-weight:700">${esc(p.current_education.degree)} ${esc(p.current_education.branch)}</td>
      <td style="padding:6px 0">${esc(p.current_education.institution)}</td>
      <td style="padding:6px 0;text-align:right">${esc(p.current_education.batch)}</td>
    </tr>`;
  }
  data.education_history?.forEach((edu: any) => {
    html += `<tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:6px 0;font-weight:700">${esc(edu.degree || edu.level)}</td>
      <td style="padding:6px 0">${esc(edu.school)}</td>
      <td style="padding:6px 0;text-align:right">${esc(edu.gradYear || edu.year)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;

  if (data.experience?.length) {
    html += H3('Professional Experience');
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
          <span style="font-size:13px"><b>${esc(e.role)}</b>, ${esc(e.company)}</span>
          <span style="font-size:11px;font-style:italic">${esc(e.duration)}</span>
        </div>`;
      e.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
      html += `</div>`;
    });
  }

  if (data.projects?.length) {
    html += H3('Core Projects & Lab Work');
    data.projects.forEach((pr: any) => {
      html += `<div style="margin-bottom:10px">
        <p style="font-size:13px;margin:0 0 2px"><b>${esc(pr.title)}</b></p>`;
      pr.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.5;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
      html += `</div>`;
    });
  }

  if (hasSkills(data.skills)) {
    html += H3('Technical Competencies');
    html += `<div style="display:flex;gap:16px;margin-top:8px">`;
    const skRows = [['languages', 'Programming'], ['tools', 'Software & Tools']] as const;
    skRows.forEach(([k, label]) => {
      if (data.skills[k]?.length) html += `<div style="flex:1"><p style="font-size:12px;margin:0"><b>${label}:</b> ${esc(data.skills[k].join(', '))}</p></div>`;
    });
    html += `</div>`;
  }

  return wrapA4(html, "'Georgia', serif");
};

// ============================================================================
// 7. Management (management)
// ============================================================================
export const buildManagementPdf = (data: any) => {
  const p = data.personal || {};
  const accent = '#4c1d95';
  let html = '';

  html += `<div style="text-align:center;margin-bottom:20px">
    <h1 style="font-size:32px;font-weight:700;font-family:'Georgia',serif;letter-spacing:1px;color:${accent};margin:0">${esc(p.name || 'Your Name')}</h1>
    <p style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#64748b;margin:6px 0 0">
      ${[p.email, p.phone, p.linkedin].filter(Boolean).map(esc).join(' &bull; ')}
    </p>
  </div>`;

  const H3 = (t: string) => `<h3 style="font-size:16px;font-weight:700;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:20px 0 10px;text-transform:uppercase;letter-spacing:2px;font-family:'Georgia',serif;color:${accent}">${t}</h3>`;

  if (data.summary?.trim()) {
    html += H3('Executive Summary');
    html += `<p style="font-size:12px;line-height:1.7;text-align:justify;margin:0">${esc(data.summary)}</p>`;
  }

  if (data.experience?.length) {
    html += H3('Professional Experience');
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
          <span style="font-size:14px;font-weight:700;font-family:'Georgia',serif">${esc(e.company)}</span>
          <span style="font-size:11px;font-weight:600;letter-spacing:0.5px">${esc(e.duration)}</span>
        </div>
        <p style="font-size:12px;font-style:italic;color:#475569;margin:0 0 4px">${esc(e.role)}</p>`;
      e.bullets?.forEach((b: string) => html += `<div style="font-size:12px;line-height:1.6;color:#334155;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0">&#9679;</span>${esc(b)}</div>`);
      html += `</div>`;
    });
  }

  html += H3('Education');
  if (p.current_education?.institution) {
    html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:13px"><b>${esc(p.current_education.institution)}</b> <span style="color:#94a3b8;margin:0 6px">|</span> ${esc(p.current_education.degree)} ${esc(p.current_education.branch)}</span>
      <span style="font-size:11px;font-weight:600">${esc(p.current_education.batch)}</span>
    </div>`;
  }

  if (data.certifications?.length || data.achievements?.length) {
    html += H3('Leadership & Distinctions');
    html += `<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.6;color:#334155">`;
    data.certifications?.forEach((c: any) => html += `<li>${esc(c.name)} ${c.issuer ? `(${esc(c.issuer)})` : ''}</li>`);
    data.achievements?.forEach((a: any) => html += `<li>${esc(typeof a === 'string' ? a : a.title)}</li>`);
    html += `</ul>`;
  }

  return wrapA4(html, "'Inter', sans-serif");
};

// ============================================================================
// 8. ATS Strict (ats-strict)
// ============================================================================
export const buildAtsStrictPdf = (data: any) => {
  const p = data.personal || {};
  let html = '';

  html += `<h1 style="font-size:20px;font-weight:700;margin:0 0 4px">${esc(p.name || 'Your Name')}</h1>
  <p style="font-size:14px;margin:0 0 16px">${[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map(esc).join(' | ')}</p>`;

  const H2 = (t: string) => `<h2 style="font-size:16px;font-weight:700;text-transform:uppercase;margin:0 0 8px">${t}</h2>`;

  if (data.summary?.trim()) {
    html += `<div style="margin-bottom:16px">${H2('Summary')}<p style="font-size:14px;line-height:1.5;margin:0">${esc(data.summary)}</p></div>`;
  }

  html += `<div style="margin-bottom:16px">${H2('Education')}`;
  if (p.current_education?.institution) {
    html += `<p style="font-size:14px;margin:0 0 4px"><b>${esc(p.current_education.degree)} in ${esc(p.current_education.branch)}</b>, ${esc(p.current_education.institution)} (Expected: ${esc(p.current_education.batch)})</p>`;
  }
  data.education_history?.forEach((edu: any) => {
    html += `<p style="font-size:14px;margin:0 0 4px"><b>${esc(edu.degree || edu.level)}</b>, ${esc(edu.school)} (${esc(edu.gradYear || edu.year)})</p>`;
  });
  html += `</div>`;

  if (data.experience?.length) {
    html += `<div style="margin-bottom:16px">${H2('Experience')}`;
    data.experience.forEach((e: any) => {
      html += `<div style="margin-bottom:12px">
        <p style="font-size:14px;margin:0 0 4px"><b>${esc(e.role)}</b>, ${esc(e.company)} (${esc(e.duration)})</p>
        <ul style="margin:0;padding-left:24px;font-size:14px;line-height:1.5">`;
        e.bullets?.forEach((b: string) => html += `<li>${esc(b)}</li>`);
      html += `</ul></div>`;
    });
    html += `</div>`;
  }

  if (data.projects?.length) {
    html += `<div style="margin-bottom:16px">${H2('Projects')}`;
    data.projects.forEach((pr: any) => {
      html += `<div style="margin-bottom:12px">
        <p style="font-size:14px;margin:0 0 4px"><b>${esc(pr.title)}</b> (${esc(pr.duration)})</p>
        <ul style="margin:0;padding-left:24px;font-size:14px;line-height:1.5">`;
        pr.bullets?.forEach((b: string) => html += `<li>${esc(b)}</li>`);
      html += `</ul></div>`;
    });
    html += `</div>`;
  }

  if (hasSkills(data.skills)) {
    html += `<div style="margin-bottom:16px">${H2('Skills')}`;
    const skRows = [['languages', 'Languages'], ['frameworks', 'Frameworks'], ['tools', 'Tools']] as const;
    skRows.forEach(([k, label]) => {
      if (data.skills[k]?.length) html += `<p style="font-size:14px;margin:0 0 4px"><b>${label}:</b> ${esc(data.skills[k].join(', '))}</p>`;
    });
    html += `</div>`;
  }

  return wrapA4(html, "Arial, sans-serif");
};

// Export generator router
export const generateHtmlForPdf = (templateId: string, data: any) => {
  switch (templateId) {
    case 'classic': return buildClassicPdf(data);
    case 'modern': return buildModernPdf(data);
    case 'compact': return buildCompactPdf(data);
    case 'campus': return buildCampusPdf(data);
    case 'developer': return buildDeveloperPdf(data);
    case 'core-engineering': return buildCoreEnggPdf(data);
    case 'management': return buildManagementPdf(data);
    case 'ats-strict': return buildAtsStrictPdf(data);
    default: return buildClassicPdf(data);
  }
};
