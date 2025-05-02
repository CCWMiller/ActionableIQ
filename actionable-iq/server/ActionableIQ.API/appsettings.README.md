# appsettings.json Configuration Guide

This document provides guidance on configuring the `appsettings.json` file for using real Google Analytics data.

## GoogleAnalytics Section

```json
"GoogleAnalytics": {
  "ApplicationName": "ActionableIQ Analytics",
  "DefaultPropertyId": "",
  "UseMockData": true
}
```

- **ApplicationName**: The name of your application in Google Analytics
- **DefaultPropertyId**: Can be left empty as property IDs are provided by users in queries
- **UseMockData**: 
  - Set to `true` for development/testing to use generated mock data
  - Set to `false` in production to use real Google Analytics data

## Steps to Configure for Real Data

1. Install Google Cloud SDK and run the setup helper tool
2. Set up Application Default Credentials with `gcloud auth application-default login`
3. Set `UseMockData` to `false`
4. Restart the application 