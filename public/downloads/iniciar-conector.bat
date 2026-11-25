@echo off
title Conector Soft Restaurant - Valladolid.mx
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0conector-softrestaurant.ps1"
pause
