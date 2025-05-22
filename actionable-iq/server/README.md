# ActionableIQ Server

The backend application for ActionableIQ, a powerful analytics tool that allows users to query Google Analytics data and generate actionable reports.

## Project Structure

- **ActionableIQ.API**: ASP.NET Core Web API project containing controllers and API endpoints
- **ActionableIQ.Core**: Core business logic, services, and domain models
- **ActionableIQ.Tests**: Unit and integration tests for the application

## Tech Stack

- C# 11
- .NET 8.0
- ASP.NET Core
- JWT Authentication
- Google Analytics Data API v1Beta
- Google Analytics Admin API v1Beta
- Google.Apis.Auth for OAuth integration

## Prerequisites

- .NET 8.0 SDK or later
- Visual Studio 2022 or Visual Studio Code with C# extension
- Google Cloud Platform account with Google Analytics API access
- Google Cloud OAuth credentials

## Getting Started

### Setting Up Development Environment

1. Clone the repository
2. Navigate to the server directory:
   ```bash
   cd actionable-iq/server
   ```
3. Restore dependencies:
   ```bash
   dotnet restore
   ```

### Configuration

Create `appsettings.Development.json` in the ActionableIQ.API directory with the following structure:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "your-database-connection-string"
  },
  "JwtSettings": {
    "Secret": "your-jwt-secret-key",
    "Issuer": "your-issuer",
    "Audience": "your-audience",
    "ExpiryMinutes": 60
  },
  "GoogleAnalytics": {
    "ClientId": "your-google-client-id",
    "ClientSecret": "your-google-client-secret",
    "RedirectUri": "http://localhost:5000/api/auth/google"
  },
  "Email": {
    "SmtpServer": "smtp.example.com",
    "Port": 587,
    "Username": "your-email-username",
    "Password": "your-email-password",
    "FromEmail": "noreply@example.com",
    "FromName": "ActionableIQ"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

For production, sensitive values should be stored in environment variables or a secret management service.

### Running the Application

From the server directory:

```bash
cd ActionableIQ.API
dotnet run
```

By default, the API will be available at:
- http://localhost:5000
- https://localhost:5001

### Building

```bash
dotnet build
```

### Running Tests

```bash
dotnet test
```

## API Endpoints

### Authentication

- `POST /api/auth/google`: Google OAuth authentication
- `POST /api/auth/refresh-token`: Refresh JWT token
- `POST /api/auth/revoke-token`: Revoke JWT token

### User

- `GET /api/users/me`: Get current user information

### Analytics

- `GET /api/analytics/properties`: Get Google Analytics properties accessible by the user
- `GET /api/analytics/property/{propertyId}`: Get specific property details
- `POST /api/analytics/query`: Run a Google Analytics query
- `POST /api/analytics/query/batch`: Run multiple queries in batch

### Reports

- `POST /api/report/email`: Send a report via email

## Deployment

The application is configured to deploy to Google Cloud Run using the following steps:

1. Build the Docker image from the Dockerfile in the server directory
2. Push the image to Google Container Registry
3. Deploy the image to Google Cloud Run

The `service-backend-staging.yaml` and `service-backend-prod.yaml` files contain the Cloud Run service configurations for staging and production environments.

## Authentication Flow

1. Users authenticate with Google OAuth 2.0
2. The backend validates the authentication token with Google
3. On successful validation, the backend issues a JWT token
4. The JWT token is used for subsequent API requests

## Docker Support

The included Dockerfile builds the application in two stages:
1. Build stage: Compiles the application
2. Runtime stage: Creates a minimal container to run the application

To build the Docker image locally:

```bash
docker build -t actionableiq-server .
```

To run the container locally:

```bash
docker run -p 8080:8080 actionableiq-server
``` 