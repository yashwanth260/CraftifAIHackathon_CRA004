@echo off
echo ============================================================
echo   AI Safety Sentinel 360 - Automated Test Suite
echo ============================================================
echo Running Backend Pytest Suite...
python -m pytest backend/tests -v
if %errorlevel% neq 0 (
    echo [ERROR] Backend tests failed.
    exit /b %errorlevel%
)
echo.
echo Running Frontend Type Checks and Production Build...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b %errorlevel%
)
echo.
echo ============================================================
echo   ALL TESTS AND BUILDS COMPLETED SUCCESSFULLY!
echo ============================================================
pause
