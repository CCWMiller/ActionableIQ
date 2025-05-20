using ActionableIQ.Core.Auth;
using ActionableIQ.Core.Extensions;
using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using ActionableIQ.Core.Models.Analytics;
using ActionableIQ.Core.Services;
using ActionableIQ.Core.Data;
using ActionableIQ.Core.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using Npgsql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

Console.WriteLine("AIQ Log: Console - Program.cs execution started."); // Earliest possible log

var builder = WebApplication.CreateBuilder(args);
Console.WriteLine("AIQ Log: Console - WebApplication.CreateBuilder completed.");

// Add this section to configure Kestrel to listen on the PORT environment variable
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080"; // Default to 8080 if PORT not set
builder.WebHost.UseUrls($"http://*:{port}");
Console.WriteLine($"AIQ Log: Console - Kestrel configured to attempt listening on port: {port}");

// Clear existing configuration sources to ensure proper order
Console.WriteLine("AIQ Log: Console - Clearing configuration sources.");
builder.Configuration.Sources.Clear();

// Add configuration sources in order of precedence (lowest to highest)
Console.WriteLine("AIQ Log: Console - Setting up configuration sources.");
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true) // Loads appsettings.Development.json locally
    .AddEnvironmentVariables(); // Highest precedence for this setup.
Console.WriteLine("AIQ Log: Console - Configuration sources set.");

// Log the configuration sources and environment
var logger = LoggerFactory.Create(config =>
{
    config.AddConsole(); // Ensure console logging is enabled
}).CreateLogger("Program");
Console.WriteLine("AIQ Log: Console - Logger created.");

try // Wrap early configurations
{
    logger.LogInformation("AIQ Log: Logger - Initializing application...");
    Console.WriteLine("AIQ Log: Console - Initializing application (after logger creation)...");

    logger.LogInformation("AIQ Log: Logger - Current environment: {Environment}", builder.Environment.EnvironmentName);
    Console.WriteLine($"AIQ Log: Console - Current environment: {builder.Environment.EnvironmentName}");

    foreach (var provider in ((IConfigurationRoot)builder.Configuration).Providers)
    {
        logger.LogInformation("AIQ Log: Logger - Configuration provider: {Provider}", provider.GetType().Name);
        Console.WriteLine($"AIQ Log: Console - Configuration provider: {provider.GetType().Name}");
    }

    Console.WriteLine("AIQ Log: Console - Configuring GoogleAnalyticsOptions...");
    builder.Services.AddOptions<GoogleAnalyticsOptions>()
        .Bind(builder.Configuration.GetSection("GoogleAnalytics"))
        .ValidateDataAnnotations();
    Console.WriteLine("AIQ Log: Console - GoogleAnalyticsOptions configured.");

    // Add DbContext
    Console.WriteLine("AIQ Log: Console - Configuring ApplicationDbContext...");
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        try
        {
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
            // Avoid logging the actual connection string to production logs for security.
            Console.WriteLine($"AIQ Log: Console - DefaultConnection is null or empty: {string.IsNullOrEmpty(connectionString)}");
            if (string.IsNullOrEmpty(connectionString))
            {
                Console.WriteLine("AIQ Log: Console - ERROR: DefaultConnection connection string is null or empty. This will likely cause a crash.");
                // This is a critical failure point.
            }
            options.UseNpgsql(connectionString);
            Console.WriteLine("AIQ Log: Console - UseNpgsql configured for ApplicationDbContext.");
        }
        catch (Exception dbEx)
        {
            Console.WriteLine($"AIQ Log: Console - CRITICAL ERROR during AddDbContext configuration: {dbEx.GetType().Name} - {dbEx.Message}");
            logger.LogError(dbEx, "AIQ Log: Logger - CRITICAL ERROR during AddDbContext configuration.");
            throw; // Rethrow to ensure startup failure is visible
        }
    });
    Console.WriteLine("AIQ Log: Console - ApplicationDbContext configured.");

    // Add services from Core
    Console.WriteLine("AIQ Log: Console - Adding CoreServices...");
    builder.Services.AddCoreServices(builder.Configuration);
    Console.WriteLine("AIQ Log: Console - CoreServices added.");

    // Add Google Analytics services with configuration
    Console.WriteLine("AIQ Log: Console - Adding GoogleAnalyticsServices...");
    builder.Services.AddGoogleAnalyticsServices(builder.Configuration);
    Console.WriteLine("AIQ Log: Console - GoogleAnalyticsServices added.");

    // Add Email services
    Console.WriteLine("AIQ Log: Console - Adding EmailServices...");
    builder.Services.AddEmailServices(builder.Configuration);
    Console.WriteLine("AIQ Log: Console - EmailServices added.");

    // Add JWT authentication
    Console.WriteLine("AIQ Log: Console - Adding JwtAuthentication...");
    builder.Services.AddJwtAuthentication(builder.Configuration);
    Console.WriteLine("AIQ Log: Console - JwtAuthentication added.");

    // Add services to the container
    Console.WriteLine("AIQ Log: Console - Adding EndpointsApiExplorer and SwaggerGen...");
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    Console.WriteLine("AIQ Log: Console - EndpointsApiExplorer and SwaggerGen added.");

    // Add CORS services to allow requests from our React client
    Console.WriteLine("AIQ Log: Console - Adding Cors...");
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowLocalhost", policy =>
        {
            policy.WithOrigins(
                "http://localhost:3000",
                "https://frontend-service-788583965739.us-east5.run.app"
                ) // This will only work if Cloud Run is proxied from localhost:3000, adjust for actual frontend URL if needed
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });
    Console.WriteLine("AIQ Log: Console - Cors added.");

    // Add controllers and API behavior options
    Console.WriteLine("AIQ Log: Console - Adding Controllers...");
    builder.Services.AddControllers();
    Console.WriteLine("AIQ Log: Console - Controllers added.");
}
catch (Exception ex)
{
    logger.LogError(ex, "AIQ Log: Logger - CRITICAL ERROR during initial builder services configuration.");
    Console.WriteLine($"AIQ Log: Console - CRITICAL ERROR during initial builder services configuration: {ex.GetType().Name} - {ex.Message} - StackTrace: {ex.StackTrace}");
    throw; // Rethrow to ensure startup failure
}

Console.WriteLine("AIQ Log: Console - Building the application...");
var app = builder.Build();
Console.WriteLine("AIQ Log: Console - Application builder.Build() completed.");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    Console.WriteLine("AIQ Log: Console - Development environment detected. Configuring Swagger.");
    app.UseSwagger();
    app.UseSwaggerUI();
}

Console.WriteLine("AIQ Log: Console - Configuring CORS policy.");
app.UseCors("AllowLocalhost"); // Ensure this policy is appropriate for your Cloud Run setup

Console.WriteLine("AIQ Log: Console - Configuring HttpsRedirection.");
app.UseHttpsRedirection();

// Add token extraction middleware BEFORE authentication
Console.WriteLine("AIQ Log: Console - Configuring TokenExtraction middleware.");
app.UseTokenExtraction();

// Add authentication middleware
Console.WriteLine("AIQ Log: Console - Configuring Authentication middleware.");
app.UseAuthentication();
Console.WriteLine("AIQ Log: Console - Configuring Authorization middleware.");
app.UseAuthorization();

Console.WriteLine("AIQ Log: Console - Mapping controller routes.");
app.MapControllers();

// Authentication endpoints
app.MapPost("/api/auth/google", async (
    [FromBody] GoogleCodeRequest request,
    [FromServices] IGoogleAuthService googleAuthService,
    [FromServices] IJwtService jwtService,
    [FromServices] ILogger<Program> routeLogger,
    HttpContext httpContext) =>
{
    try
    {
        routeLogger.LogInformation("AIQ Log: Logger - Processing Google authentication request for /api/auth/google");
        Console.WriteLine("AIQ Log: Console - Processing Google authentication request for /api/auth/google");
        
        // Process the google login
        var user = await googleAuthService.ProcessGoogleLoginAsync(
            request.Code,
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        
        // Generate JWT tokens
        var (accessToken, refreshToken) = await jwtService.CreateTokensAsync(
            user, 
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        
        // Get the ID token from user claims
        string? idToken = null;
        if (user.Claims != null && user.Claims.TryGetValue("id_token", out var token))
        {
            idToken = token;
            routeLogger.LogInformation("AIQ Log: Logger - Retrieved ID token from user claims for response");
            Console.WriteLine("AIQ Log: Console - Retrieved ID token from user claims for response");
            
            // Add the ID token to the response headers for subsequent requests
            httpContext.Response.Headers.Append("X-Id-Token", idToken);
        }
        else
        {
            routeLogger.LogWarning("AIQ Log: Logger - No ID token found in user claims after Google login");
            Console.WriteLine("AIQ Log: Console - Warning: No ID token found in user claims after Google login");
        }
        
        // Log token details for debugging
        routeLogger.LogInformation("AIQ Log: Logger - Access token length: {Length}, ID token length: {IdTokenLength}", 
            accessToken?.Length ?? 0, 
            idToken?.Length ?? 0);
        Console.WriteLine($"AIQ Log: Console - Access token length: {accessToken?.Length ?? 0}, ID token length: {idToken?.Length ?? 0}");
        
        // Return the tokens and user info
        return Results.Ok(new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            IdToken = idToken, // Pass the ID token to the frontend
            User = new
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                ProfileImageUrl = user.ProfileImageUrl
            }
        });
    }
    catch (Exception ex)
    {
        routeLogger.LogError(ex, "AIQ Log: Logger - Error processing Google authentication");
        Console.WriteLine($"AIQ Log: Console - Error processing Google authentication: {ex.Message}");
        return Results.Problem(
            detail: ex.Message,
            statusCode: (int)HttpStatusCode.BadRequest);
    }
})
.WithName("AuthenticateWithGoogle")
.WithOpenApi();

app.MapPost("/api/auth/refresh-token", async (
    [FromBody] RefreshTokenRequest request,
    [FromServices] IJwtService jwtService,
    HttpContext httpContext) =>
{
    try
    {
        Console.WriteLine("AIQ Log: Console - Processing /api/auth/refresh-token request.");
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var (accessToken, refreshToken) = await jwtService.RefreshTokenAsync(request.RefreshToken, ipAddress);
        
        return Results.Ok(new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"AIQ Log: Console - Error processing /api/auth/refresh-token: {ex.Message}");
        return Results.Problem(
            detail: ex.Message,
            statusCode: (int)HttpStatusCode.BadRequest);
    }
})
.WithName("RefreshToken")
.WithOpenApi();

app.MapPost("/api/auth/revoke-token", async (
    [FromBody] RevokeTokenRequest request,
    [FromServices] IJwtService jwtService,
    HttpContext httpContext) =>
{
    try
    {
        Console.WriteLine("AIQ Log: Console - Processing /api/auth/revoke-token request.");
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        await jwtService.RevokeTokenAsync(request.Token, ipAddress);
        
        return Results.Ok(new { Success = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"AIQ Log: Console - Error processing /api/auth/revoke-token: {ex.Message}");
        return Results.Problem(
            detail: ex.Message,
            statusCode: (int)HttpStatusCode.BadRequest);
    }
})
.WithName("RevokeToken")
.WithOpenApi();

// Protected user endpoint
app.MapGet("/api/users/me", async (
    [FromServices] IUserRepository userRepository,
    HttpContext httpContext) =>
{
    try
    {
        Console.WriteLine("AIQ Log: Console - Processing /api/users/me request.");
        // Get user ID from claims
        var userId = httpContext.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            Console.WriteLine("AIQ Log: Console - /api/users/me - Unauthorized, User ID not found in claims.");
            return Results.Unauthorized();
        }
        
        // Get user from repository
        var user = await userRepository.GetByIdAsync(userGuid);
        if (user == null)
        {
            Console.WriteLine("AIQ Log: Console - /api/users/me - User not found in repository.");
            return Results.NotFound(new { Message = "User not found" });
        }
        
        // Return user info
        return Results.Ok(new
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            ProfileImageUrl = user.ProfileImageUrl
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"AIQ Log: Console - Error processing /api/users/me: {ex.Message}");
        return Results.Problem(
            detail: ex.Message,
            statusCode: (int)HttpStatusCode.InternalServerError);
    }
})
.RequireAuthorization()
.WithName("GetCurrentUser")
.WithOpenApi();

// Google Analytics endpoints (These are now handled by AnalyticsController)
/* // Removing duplicate Minimal API definition for /api/analytics/properties
app.MapGet("/api/analytics/properties", async (
    [FromServices] IGoogleAnalyticsService analyticsService,
    [FromServices] ILogger<Program> logger,
    HttpContext httpContext) =>
{
    // ... implementation ...
})
.RequireAuthorization()
.WithName("GetAnalyticsProperties")
.WithOpenApi();
*/

/* // Removing duplicate Minimal API definition for /api/analytics/properties/{propertyId}
// Get property details endpoint
app.MapGet("/api/analytics/properties/{propertyId}", async (
    string propertyId,
    [FromServices] IGoogleAnalyticsAdminService adminService,
    [FromServices] ILogger<Program> logger,
    HttpContext httpContext) =>
{
    // ... implementation ...
})
.RequireAuthorization()
.WithName("GetPropertyDetails")
.WithOpenApi();
*/

/* // Removing duplicate Minimal API definition for /api/analytics/query
app.MapPost("/api/analytics/query", async (
    [FromBody] AnalyticsQueryRequest request,
    [FromServices] IGoogleAnalyticsService analyticsService,
    [FromServices] ILogger<Program> logger,
    HttpContext httpContext) =>
{
     // ... implementation ...
})
.RequireAuthorization()
.WithName("QueryAnalyticsData")
.WithOpenApi();
*/

/* // Removing duplicate Minimal API definition for /api/analytics/batch-query
app.MapPost("/api/analytics/batch-query", async (
    [FromBody] List<AnalyticsQueryRequest> requests,
    [FromServices] IGoogleAnalyticsService analyticsService,
    [FromServices] ILogger<Program> logger,
    HttpContext httpContext) =>
{
    // ... implementation ...
})
.RequireAuthorization()
.WithName("BatchQueryAnalyticsData")
.WithOpenApi();
*/

app.MapGet("/api/health", () =>
{
    Console.WriteLine("AIQ Log: Console - Health check endpoint /api/health was hit."); // Log when health check is called
    logger.LogInformation("AIQ Log: Logger - Health check endpoint /api/health was hit.");
    return Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
})
.WithName("HealthCheck")
.WithOpenApi();

try
{
    Console.WriteLine("AIQ Log: Console - Attempting to app.Run()...");
    logger.LogInformation("AIQ Log: Logger - Application built. Attempting to app.Run()...");
    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"AIQ Log: Console - CRITICAL ERROR - Unhandled exception during app.Run(): {ex.GetType().Name} - {ex.Message} - StackTrace: {ex.StackTrace}");
    logger.LogCritical(ex, "AIQ Log: Logger - CRITICAL ERROR - Unhandled exception during app.Run()");
    // In a container, if app.Run() fails, the container will likely exit.
    // Throwing here ensures the process terminates, which might be desired for Cloud Run to attempt a restart if configured.
    throw;
}

Console.WriteLine("AIQ Log: Console - Program.cs execution finished (should not happen if app.Run() is blocking).");

// Request and response models
public record GoogleCodeRequest(string Code);
public record RefreshTokenRequest(string RefreshToken);
public record RevokeTokenRequest(string Token);