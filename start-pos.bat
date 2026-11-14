@echo off
title SmartPOS Server
cd /d "%~dp0"
echo ========================================================
echo               Starting SmartPOS System
echo ========================================================
echo.
echo Local URL:   http://localhost:9000
echo Network URL: http://192.168.3.22:9000
echo.
echo Press Ctrl+C to stop the server.
echo ========================================================
echo.
C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=9000
pause

