import os
import re

frontend_pages = r'C:\AcadMix\frontend\src\pages'

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract the title based on the filename or component name
    filename = os.path.basename(path)
    title = filename.replace('Dashboard.tsx', '').replace('.tsx', '') + " Dashboard"
    if title == "Principal_v1 Dashboard": title = "Principal Dashboard"

    # Regex to find the <header> block
    header_pattern = re.compile(r'<header className="glass-header.*?</header>', re.DOTALL)
    
    if header_pattern.search(content):
        # Determine what states/props are used
        has_show_profile = 'setShowProfile' in content
        
        replacement = f'''<DashboardHeader 
        user={{user}} 
        title="{title}" 
        onLogout={{onLogout}} 
        setShowProfile={{{'setShowProfile' if has_show_profile else '() => {}'}}} 
      />'''
        
        new_content = header_pattern.sub(replacement, content)
        
        # Add import for DashboardHeader if missing
        if 'DashboardHeader' not in content:
            # Add after the last import
            imports_end = new_content.rfind('import')
            imports_end_newline = new_content.find('\n', imports_end)
            if imports_end_newline != -1:
                new_content = new_content[:imports_end_newline] + "\nimport DashboardHeader from '../components/DashboardHeader';" + new_content[imports_end_newline:]

        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Refactored {filename}")

for f in os.listdir(frontend_pages):
    if f.endswith('Dashboard.tsx') or f.endswith('Dashboard_v1.tsx'):
        process_file(os.path.join(frontend_pages, f))
