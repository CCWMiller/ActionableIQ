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

# Standard .NET Core Entrypoint for Cloud Run
ENTRYPOINT ["dotnet"]
CMD ["ActionableIQ.API.dll"]