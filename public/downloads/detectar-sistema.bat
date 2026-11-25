@echo off
chcp 65001 >nul
title Detector de sistema - Valladolid.mx
set "OUT=%USERPROFILE%\Desktop\detector-valladolidmx.txt"
echo Revisando esta computadora (solo lectura, no modifica nada)...
> "%OUT%" (
echo ===== Detector Valladolid.mx =====
echo Fecha: %date% %time%
echo Equipo: %COMPUTERNAME%
ver
echo.
echo ===== Motores de base de datos instalados / corriendo =====
sc query state= all | findstr /i "SERVICE_NAME DISPLAY_NAME" | findstr /i "SQL MySQL Maria Firebird Interbase Postgre Sybase Advantage Pervasive Btrieve Access"
echo.
echo ===== Programas en ejecucion relacionados =====
tasklist | findstr /i "sqlservr mysqld mariadbd fbserver fbguard ibserver postgres dbsrv ads smart ayb"
echo.
echo ===== Puertos de base de datos escuchando =====
netstat -an | findstr /i "LISTENING" | findstr ":1433 :1434 :3306 :3050 :5432 :2638 :6262"
echo.
echo ===== Carpetas SmartNet encontradas =====
for %%D in ("C:\SmartNet*" "C:\Smart*" "C:\AyB*" "C:\Program Files\Smart*" "C:\Program Files (x86)\Smart*" "C:\ProgramData\Smart*") do dir /b /ad "%%~D" 2^>nul
echo.
echo ===== Archivos de configuracion y datos (nombres solamente) =====
for %%D in ("C:\SmartNet*" "C:\Smart*" "C:\AyB*" "C:\Program Files\Smart*" "C:\Program Files (x86)\Smart*") do (
  for /d %%E in (%%D) do dir /s /b "%%~E\*.ini" "%%~E\*.config" "%%~E\*.udl" "%%~E\*.mdf" "%%~E\*.fdb" "%%~E\*.gdb" "%%~E\*.db" "%%~E\*.mdb" "%%~E\*.accdb" "%%~E\*.sqlite" 2^>nul
)
echo.
echo ===== Fin =====
)
type "%OUT%"
echo.
echo Listo. Se guardo el reporte en tu Escritorio: detector-valladolidmx.txt
echo Envialo por WhatsApp o tomale foto a esta ventana.
pause
