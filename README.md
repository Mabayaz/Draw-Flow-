# Draw Flow Website

## Project Structure

- `index.html` - Home page
- `pages/` - All internal pages (introduction, lesson, quiz, etc.)
- `assets/images/` - Project images
- `scripts/run_server.py` - Python local web server
- `run_web.bat` - One-click launcher on Windows

## Run With Python

### Option 1: Windows batch file

Double-click `run_web.bat`

### Option 2: Terminal

```powershell
py scripts/run_server.py
```

Then open:

- http://127.0.0.1:8000

Press `Ctrl + C` in terminal to stop the server.

## Run From VS Code

1. Open Command Palette
2. Run `Tasks: Run Task`
3. Choose `Run Website (Python)`
