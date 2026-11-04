@echo off
rem Doble clic para restaurar "Mis gastos" desde una copia de seguridad
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restaurar.ps1"
