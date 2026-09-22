@echo off
title Hikvision Cloud Bridge
color 0b
echo =========================================================
echo       Hikvision Cloud Bridge - Office Terminal Sync
echo =========================================================
echo.
echo Connecting to local Hikvision terminal (192.168.18.229)...
echo Syncing web app (https://hik-vision-q5gw.vercel.app) with physical hardware...
echo.
cd /d "%~dp0backend"
npx tsx src/scripts/syncAgent.ts
pause
