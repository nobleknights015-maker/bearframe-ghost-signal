@echo off
title Bearframe Character Generator
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 launch_studio.py
  goto :done
)
where python >nul 2>nul
if not errorlevel 1 (
  python launch_studio.py
  goto :done
)
where node >nul 2>nul
if not errorlevel 1 (
  node launch_studio_node.cjs
  goto :done
)
echo.
echo Python 3 or Node.js is required to run this local browser app.
echo Install Python from https://www.python.org/downloads/
echo Then double-click this launcher again.
:done
echo.
pause
