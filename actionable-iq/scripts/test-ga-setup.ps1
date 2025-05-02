# Test-GA-Setup.ps1
# Script to verify Google Analytics integration setup

# Print a header
Write-Host "ActionableIQ Google Analytics Integration Test" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host

# Check if Google Cloud CLI is installed
Write-Host "1. Checking Google Cloud CLI installation..." -ForegroundColor Yellow
$gcloudExists = Get-Command gcloud -ErrorAction SilentlyContinue
if ($gcloudExists) {
    Write-Host "✓ Google Cloud CLI is installed." -ForegroundColor Green
} else {
    Write-Host "✗ Google Cloud CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install Google Cloud CLI from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    Write-Host
}

# Check if Application Default Credentials are configured
Write-Host "2. Checking Application Default Credentials..." -ForegroundColor Yellow
$adcPath = "$env:APPDATA\gcloud\application_default_credentials.json"
if (Test-Path $adcPath) {
    Write-Host "✓ Application Default Credentials are configured." -ForegroundColor Green
    $adcContent = Get-Content $adcPath -Raw | ConvertFrom-Json
    Write-Host "  Credentials for client: $($adcContent.client_id)" -ForegroundColor Green
} else {
    Write-Host "✗ Application Default Credentials are not set up!" -ForegroundColor Red
    Write-Host "Run the following command to configure ADC: gcloud auth application-default login" -ForegroundColor Red
    Write-Host
}

# Check current Google Cloud project
Write-Host "3. Checking current Google Cloud project..." -ForegroundColor Yellow
try {
    $projectInfo = gcloud config get-value project
    Write-Host "✓ Current Google Cloud project: $projectInfo" -ForegroundColor Green
} catch {
    Write-Host "✗ Unable to determine current Google Cloud project." -ForegroundColor Red
    Write-Host "Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
}

# Check API availability
Write-Host "4. Checking required API enablement..." -ForegroundColor Yellow
try {
    $analyticsAdmin = gcloud services list --filter="name:analyticsadmin.googleapis.com" --format="value(name)"
    $analyticsData = gcloud services list --filter="name:analyticsdata.googleapis.com" --format="value(name)"
    
    if ($analyticsAdmin) {
        Write-Host "✓ Google Analytics Admin API is enabled." -ForegroundColor Green
    } else {
        Write-Host "✗ Google Analytics Admin API is not enabled!" -ForegroundColor Red
        Write-Host "Run: gcloud services enable analyticsadmin.googleapis.com" -ForegroundColor Red
    }
    
    if ($analyticsData) {
        Write-Host "✓ Google Analytics Data API is enabled." -ForegroundColor Green
    } else {
        Write-Host "✗ Google Analytics Data API is not enabled!" -ForegroundColor Red
        Write-Host "Run: gcloud services enable analyticsdata.googleapis.com" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Unable to check API enablement status." -ForegroundColor Red
}

# Check appsettings configuration
Write-Host "5. Checking appsettings.json configuration..." -ForegroundColor Yellow
$appsettingsPath = "..\server\ActionableIQ.API\appsettings.json"
if (Test-Path $appsettingsPath) {
    $appsettings = Get-Content $appsettingsPath -Raw | ConvertFrom-Json
    
    # Check Google Analytics configuration
    if ($appsettings.GoogleAnalytics) {
        Write-Host "✓ GoogleAnalytics section found in appsettings.json" -ForegroundColor Green
        
        if ($appsettings.GoogleAnalytics.UseMockData) {
            Write-Host "  UseMockData is set to TRUE - Using mock data for testing" -ForegroundColor Yellow
        } else {
            Write-Host "  UseMockData is set to FALSE - Using real Google Analytics API" -ForegroundColor Green
        }
    } else {
        Write-Host "✗ GoogleAnalytics section missing from appsettings.json!" -ForegroundColor Red
    }
    
    # Check Google Workload Identity configuration
    if ($appsettings.GoogleWorkloadIdentity) {
        Write-Host "✓ GoogleWorkloadIdentity section found in appsettings.json" -ForegroundColor Green
        
        if ($appsettings.GoogleWorkloadIdentity.UseApplicationDefault) {
            Write-Host "  UseApplicationDefault is set to TRUE - Using ADC as primary auth method" -ForegroundColor Green
        } else {
            Write-Host "  UseApplicationDefault is set to FALSE - ADC not used as primary" -ForegroundColor Yellow
        }
        
        if ($appsettings.GoogleWorkloadIdentity.FallbackToApplicationDefault) {
            Write-Host "  FallbackToApplicationDefault is TRUE - ADC used as fallback" -ForegroundColor Green
        } else {
            Write-Host "  FallbackToApplicationDefault is FALSE - ADC not used as fallback" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ GoogleWorkloadIdentity section missing from appsettings.json!" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Unable to find appsettings.json file." -ForegroundColor Red
}

# Provide summary of setup status
Write-Host
Write-Host "Google Analytics Integration Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if any ADC is configured
$adcConfigured = Test-Path $adcPath
# Check if appsettings has correctly configured Google Analytics
$correctAppsettings = $false
if (Test-Path $appsettingsPath) {
    $correctAppsettings = ($null -ne $appsettings.GoogleAnalytics) -and ($null -ne $appsettings.GoogleWorkloadIdentity)
}

if ($adcConfigured -and $correctAppsettings) {
    Write-Host "✓ Your Google Analytics integration is properly configured." -ForegroundColor Green
    Write-Host "  You can run the application with:" -ForegroundColor Green
    Write-Host "  cd ..\server\ActionableIQ.API" -ForegroundColor Yellow
    Write-Host "  dotnet run" -ForegroundColor Yellow
} else {
    Write-Host "✗ Your Google Analytics integration is not fully configured." -ForegroundColor Red
    Write-Host "  Please address the issues highlighted above." -ForegroundColor Red
}

# Reminder about mock data
Write-Host
Write-Host "IMPORTANT: For testing, you can set UseMockData=true in appsettings.json" -ForegroundColor Cyan
Write-Host "This allows you to test the UI without needing actual Google Analytics access." -ForegroundColor Cyan
Write-Host "When you're ready to use real data, set UseMockData=false" -ForegroundColor Cyan 