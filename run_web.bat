@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "PY_EXE="

if exist "%SCRIPT_DIR%tools\python312\python.exe" (
  set "PY_EXE=%SCRIPT_DIR%tools\python312\python.exe"
  goto :run_server
)

for %%P in (py.exe python.exe python3.exe) do (
  for /f "delims=" %%I in ('where %%P 2^>nul') do (
    set "PY_EXE=%%I"
    goto :run_server
  )
)

for /f "delims=" %%I in ('dir /b /s "%LocalAppData%\Programs\Python\Python*\python.exe" 2^>nul') do (
  set "PY_EXE=%%I"
  goto :run_server
)

echo Python is not installed or not available in PATH.
echo.
echo Install Python (recommended):
echo   winget install -e --id Python.Python.3.12
echo Or use the bundled portable runtime at tools\python312\python.exe
echo.
echo After installing, close and reopen VS Code, then run this file again.
exit /b 1

:run_server
echo Using Python: %PY_EXE%
set "SITE_PORT=8000"

echo Closing existing local servers...
taskkill /FI "WINDOWTITLE eq Draw Flow Server" /T /F >nul 2>&1
call :kill_port 8000
call :kill_port 8010
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -match 'python|py' -and $_.CommandLine -match 'scripts\\run_server.py|run_server.py' } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

netstat -ano | findstr /r /c:":8000 .*LISTENING" >nul
if %errorlevel%==0 (
  echo Port 8000 is still in use by another process.
  echo Close that process manually, then run this file again.
  exit /b 1
)

set "SITE_URL=http://127.0.0.1:%SITE_PORT%"
echo Starting Draw Flow server at %SITE_URL%
start "Draw Flow Server" cmd /c "set DRAW_FLOW_PORT=%SITE_PORT% && "%PY_EXE%" scripts\run_server.py"
timeout /t 2 /nobreak >nul
start "" "%SITE_URL%/?v=3"
exit /b 0

:kill_port
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
  taskkill /PID %%A /F >nul 2>&1
)
exit /b 0
