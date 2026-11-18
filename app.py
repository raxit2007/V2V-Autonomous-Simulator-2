from flask import Flask, render_template
from pathlib import Path

app = Flask(__name__)
BASE = Path(__file__).resolve().parent

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/project')
def project_code():
    # Read the actual project files and display them in a presentation-friendly code page.
    files = {
        'Backend · app.py': BASE / 'app.py',
        'Frontend · index.html': BASE / 'templates' / 'index.html',
        'Design · style.css': BASE / 'static' / 'style.css',
        'Simulation · sim.js': BASE / 'static' / 'sim.js',
    }
    snippets = {name: path.read_text(encoding='utf-8') for name, path in files.items()}
    return render_template('project.html', snippets=snippets)

if __name__ == '__main__':
    app.run(debug=True)
