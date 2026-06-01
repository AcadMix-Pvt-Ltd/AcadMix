import glob, re

files = glob.glob('frontend/src/pages/*Dashboard*.tsx')
for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    route = 'student-profile' if 'Student' in file_path else 'faculty-profile'

    content = re.sub(r'import\s+UserProfileModal\s+from\s+[\'\"].*?UserProfileModal[\'\"];?\n', '', content)
    content = re.sub(r'\s*const\s+\[showProfile,\s*setShowProfile\]\s*=\s*useState\(false\);?', '', content)
    content = content.replace('setShowProfile={setShowProfile}', f'onProfileClick={{() => navigate(\'{route}\')}}')
    content = re.sub(r'setShowProfile=\{[^}]+\}', f'onProfileClick={{() => navigate(\'{route}\')}}', content)
    content = re.sub(r'\s*\{showProfile\s*&&\s*<UserProfileModal[^>]+>\}\s*', '\n', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f'Patched {len(files)} dashboard files')
