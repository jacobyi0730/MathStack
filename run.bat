@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo [MathStack] Installing dependencies...
  call npm install
  if errorlevel 1 goto fail
)

echo [MathStack] Building question bank...
call npm run build:bank
if errorlevel 1 goto fail

echo.
echo [MathStack] Starting dev server...
echo Open http://localhost:5173 in your browser.
echo Press Ctrl+C in this window to stop.
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:5173"
call npm run dev
goto end

:fail
echo.
echo [MathStack] Failed. Check the error message above.
pause

:end
endlocal
