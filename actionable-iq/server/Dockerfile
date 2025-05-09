# Stage 1: Build and Publish the .NET Application
# Use the official .NET SDK image.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy project/solution files and restore dependencies
COPY *.sln .
COPY ActionableIQ.API/ActionableIQ.API.csproj ./ActionableIQ.API/
COPY ActionableIQ.Core/ActionableIQ.Core.csproj ./ActionableIQ.Core/
COPY ActionableIQ.Tests/ActionableIQ.Tests.csproj ./ActionableIQ.Tests/

# Restore dependencies for the entire solution
RUN dotnet restore "ActionableIQ.sln"

# Copy the rest of the source code
COPY . .

# Set the working directory to the main project
WORKDIR "/source/ActionableIQ.API"
# Publish the application in Release configuration
RUN dotnet publish "ActionableIQ.API.csproj" -c Release -o /app/publish --no-restore

# Stage 2: Serve the Application
# Use the official ASP.NET runtime image, matching the SDK version used above.
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

# Port is exposed; ASPNETCORE_URLS will be set by Cloud Run environment or Program.cs
EXPOSE 8080

# New Temporary Diagnostic ENTRYPOINT
# This script attempts to run various commands and logs their output and exit codes.
# Output is redirected to stdout (>&1) and stderr is redirected to stdout (2>&1)
# to maximize chances of log capture.
ENTRYPOINT ["/bin/sh", "-c", \
  "echo 'DIAG_ENTRYPOINT: Shell script started.' >&1; \
  echo 'DIAG_ENTRYPOINT: Current directory:' >&1; \
  pwd >&1; \
  echo 'DIAG_ENTRYPOINT: Listing /app directory contents:' >&1; \
  ls -lR /app >&1; \
  echo 'DIAG_ENTRYPOINT: Attempting dotnet --version' >&1; \
  dotnet --version >&1 2>&1; \
  echo \"DIAG_ENTRYPOINT: Exit code from dotnet --version: $?\" >&1; \
  echo 'DIAG_ENTRYPOINT: Attempting dotnet --info' >&1; \
  dotnet --info >&1 2>&1; \
  echo \"DIAG_ENTRYPOINT: Exit code from dotnet --info: $?\" >&1; \
  echo 'DIAG_ENTRYPOINT: Attempting to execute ActionableIQ.API.dll --help (or just run if --help fails)' >&1; \
  (dotnet ActionableIQ.API.dll --help || dotnet ActionableIQ.API.dll) >&1 2>&1; \
  echo \"DIAG_ENTRYPOINT: Exit code from dotnet ActionableIQ.API.dll attempt: $?\" >&1; \
  echo 'DIAG_ENTRYPOINT: Shell script finished. Sleeping for 300 seconds to allow log capture.' >&1; \
  sleep 300"]