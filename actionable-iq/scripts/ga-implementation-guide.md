# Google Analytics Integration Guide for ActionableIQ

This guide outlines the steps needed to implement and test the Google Analytics integration using Application Default Credentials (ADC) as the primary method and Workload Identity Federation as a fallback.

## Backend Implementation (Already Completed)

The backend implementation is properly set up with:

1. Google Analytics service classes in `ActionableIQ.Core.Services`:
   - `GoogleAnalyticsService` - Handles interaction with Google Analytics Data API
   - `GoogleAnalyticsAdminService` - Handles interaction with Google Analytics Admin API
   - `GoogleAnalyticsDataService` - Processes and formats GA4 data for the application
   - `WorkloadIdentityService` - Manages authentication using ADC and Workload Identity Federation

2. Service extensions in `ServiceExtensions.cs`:
   - `AddGoogleAnalyticsServices()` - Registers all Google Analytics services
   - Properly configures authentication options for ADC first and Workload Identity Federation as fallback

3. Controllers in `AnalyticsController.cs`:
   - Endpoints for querying Google Analytics data
   - Properly extracts and utilizes auth tokens

## Frontend Implementation (Already Complete)

The frontend implementation includes:

1. API client for Google Analytics in `analyticsApi.ts`:
   - Methods to fetch properties, property details, and run queries
   - Properly passes the ID token for Google authentication

2. Redux state management in `analyticsQuerySlice.ts`:
   - Handles properties, queries, and results states

3. React components for displaying analytics data:
   - `QueryForm` - Form for building analytics queries
   - `QueryResults` - Table and visualization of query results
   - `PropertySelect` - Dropdown for selecting Google Analytics properties

## Configuration Steps

### 1. Google Cloud Project Setup

1. Create or select a Google Cloud project:
   ```powershell
   gcloud projects create [PROJECT_ID] --name="ActionableIQ Analytics"
   # or select existing
   gcloud config set project [PROJECT_ID]
   ```

2. Enable required APIs:
   ```powershell
   gcloud services enable analyticsadmin.googleapis.com
   gcloud services enable analyticsdata.googleapis.com
   ```

### 2. Configure Application Default Credentials

1. Install Google Cloud CLI (if not already installed):
   - Download from: https://cloud.google.com/sdk/docs/install

2. Configure Application Default Credentials:
   ```powershell
   gcloud auth application-default login
   ```

3. Verify ADC configuration:
   ```powershell
   Test-Path "$env:APPDATA\gcloud\application_default_credentials.json"
   ```

### 3. Configure appsettings.json

The `appsettings.json` file (in `server/ActionableIQ.API/`) has these important sections:

```json
{
  "GoogleAnalytics": {
    "ApplicationName": "ActionableIQ Analytics",
    "DefaultPropertyId": "",
    "UseMockData": true
  },
  "GoogleWorkloadIdentity": {
    "ProjectNumber": "",
    "PoolId": "actionableiq-workload-pool",
    "ProviderId": "actionableiq-provider",
    "ServiceAccountEmail": "",
    "UseApplicationDefault": true,
    "FallbackToApplicationDefault": true
  }
}
```

Configuration options:
- Set `UseMockData` to `true` for testing without real GA4 data
- Set `UseApplicationDefault` to `true` to use ADC as primary authentication method
- Set `FallbackToApplicationDefault` to `true` to use ADC as fallback if token-based auth fails

### 4. Testing The Integration

1. Run the verification script:
   ```powershell
   cd scripts
   .\test-ga-setup.ps1
   ```

2. For initial testing, keep `UseMockData: true` in appsettings.json to test the UI without real GA4 data.

3. Start the API:
   ```powershell
   cd server/ActionableIQ.API
   dotnet run
   ```

4. Start the frontend:
   ```powershell
   cd client
   npm start
   ```

5. Navigate to the Query page in the UI and test creating and running queries.

### 5. Switch to Real Google Analytics Data

Once ready to use real data:

1. Update `appsettings.json`:
   ```json
   "GoogleAnalytics": {
     "UseMockData": false
   }
   ```

2. Ensure your Google account has access to the GA4 properties you want to query.

3. Restart the API to apply the changes.

## Troubleshooting

### Authentication Issues

1. Verify ADC is configured correctly:
   ```powershell
   cat "$env:APPDATA\gcloud\application_default_credentials.json"
   ```

2. Check token handling in the browser console - the ID token should be passed in requests.

3. Look for authentication errors in the API logs.

### Missing Data

1. Ensure the GA4 property ID is correct.

2. Check the date range being queried.

3. Verify you have access permissions to the GA4 property.

### API Errors

1. Check browser console for errors in the network requests.

2. Check API logs for detailed error information.

3. If using ADC, verify it has access to the requested GA4 properties.

## Production Deployment

For production deployment:

1. Set up a service account with access to GA4 properties.

2. Configure ADC appropriately in your hosting environment.

3. Set `UseMockData: false` in production settings.

4. Consider setting up Workload Identity Federation for more secure token-based authentication.

## Resources

- [Google Analytics Data API Documentation](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Google Cloud Authentication](https://cloud.google.com/docs/authentication) 