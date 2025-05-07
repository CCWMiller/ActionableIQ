# Stage 1: Build and Publish the .NET Application
# Use the official .NET SDK image. Adjust the version (e.g., 6.0, 8.0) if needed.
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /source

# --- Copy project/solution files and restore dependencies ---
# Copy the solution file first (if you have one)
COPY *.sln .
# Copy the main project file for your API/backend
COPY ActionableIQ.API/ActionableIQ.API.csproj ./ActionableIQ.API/
COPY ActionableIQ.Core/ActionableIQ.Core.csproj ./ActionableIQ.Core/
COPY ActionableIQ.Tests/ActionableIQ.Tests.csproj ./ActionableIQ.Tests/
# --- !!! IMPORTANT !!! ---
# Add 'COPY' lines here for *all other* .csproj files in your solution
# Example: COPY tests/YourTestsProject/YourTestsProject.csproj ./tests/YourTestsProject/
# ------------------------

# Restore dependencies for the entire solution (or specific project)
RUN dotnet restore "ActionableIQ.sln"
# Alternative if no solution file or specific project needed:
# RUN dotnet restore "src/YourProjectName/YourProjectName.csproj"

# Copy the rest of the source code
COPY . .

# Set the working directory to the main project
WORKDIR "/source/ActionableIQ.API"
# Publish the application in Release configuration
# --no-restore is used because we already restored dependencies
RUN dotnet publish "ActionableIQ.API.csproj" -c Release -o /app/publish --no-restore

# Stage 2: Serve the Application
# Use the official ASP.NET runtime image, matching the SDK version used above.
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app/publish .

# Configure ASP.NET Core to listen on port 8080 (expected by Cloud Run)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Specify the entry point for the container.
# This runs your application's main DLL.
# --- !!! IMPORTANT !!! ---
# Replace 'YourProjectName.dll' with the actual name of your application's DLL file.
ENTRYPOINT ["dotnet", "ActionableIQ.API.dll"]