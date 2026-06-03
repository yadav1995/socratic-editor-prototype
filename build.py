import os
import shutil
import json
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist')

CSS_FILES = [
    'css/design-tokens.css',
    'css/styles.css',
]

def build():
    print('Building Socratic Editor -> dist/\n')

    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST, exist_ok=True)

    # Bundle CSS
    os.makedirs(os.path.join(DIST, 'css'), exist_ok=True)
    css_content = '/* Socratic Editor - bundled CSS (v9 build) */\n'
    for f in CSS_FILES:
        p = os.path.join(SRC, f)
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as file:
                css_content += file.read() + '\n'
    
    with open(os.path.join(DIST, 'css', 'app.bundle.css'), 'w', encoding='utf-8') as file:
        file.write(css_content)
    print('  [OK] css/app.bundle.css')

    # Copy js and content
    if os.path.exists(os.path.join(SRC, 'js')):
        shutil.copytree(os.path.join(SRC, 'js'), os.path.join(DIST, 'js'))
    print('  [OK] js/')

    if os.path.exists(os.path.join(SRC, 'content')):
        shutil.copytree(os.path.join(SRC, 'content'), os.path.join(DIST, 'content'))
    print('  [OK] content/')

    # Patch and copy index.html
    index_src_path = os.path.join(SRC, 'index.html')
    if os.path.exists(index_src_path):
        with open(index_src_path, 'r', encoding='utf-8') as file:
            html = file.read()
        
        # Replace design tokens & styles link with app.bundle.css
        html = re.sub(
            r'<link\s+rel="stylesheet"\s+href="css/design-tokens\.css">\s*\n\s*<link\s+rel="stylesheet"\s+href="css/styles\.css">',
            '<link rel="stylesheet" href="css/app.bundle.css">',
            html
        )
        
        with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as file:
            file.write(html)
        print('  [OK] index.html')

    # Copy server
    server_src = os.path.join(ROOT, 'server')
    if os.path.exists(server_src):
        shutil.copytree(server_src, os.path.join(DIST, 'server'))
    print('  [OK] server/ (for deployment bundle)')

    # Copy and modify package.json
    pkg_path = os.path.join(ROOT, 'package.json')
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r', encoding='utf-8') as file:
            pkg = json.load(file)
        pkg['scripts'] = { 'start': 'node server/server.js' }
        with open(os.path.join(DIST, 'package.json'), 'w', encoding='utf-8') as file:
            json.dump(pkg, file, indent=2)
        print('  [OK] package.json')

    print('\nBuild complete.\n')

if __name__ == '__main__':
    build()
