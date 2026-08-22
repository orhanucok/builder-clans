@echo off
setlocal
set PORT=3002
echo Starting Builder Clans dev server on port %PORT%...
cd /d "C:\Users\Ghost\Desktop\PROJEX\Builder Clans"
node node_modules\next\dist\bin\next dev -p %PORT%
