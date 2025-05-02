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

var builder = WebApplication.CreateBuilder(args);

// Clear existing configuration sources to ensure proper order
builder.Configuration.Sources.Clear();

// Add configuration sources in order of precedence (lowest to highest)
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddUserSecrets<Program>(optional: true);

// Log the configuration sources and environment
var logger = LoggerFactory.Create(config => 
{
    config.AddConsole();
}).CreateLogger("Program");

logger.LogInformation("Current environment: {Environment}", builder.Environment.EnvironmentName);

foreach (var provider in ((IConfigurationRoot)builder.Configuration).Providers)
{
    logger.LogInformation("Configuration provider: {Provider}", provider.GetType().Name);
}

builder.Services.AddOptions<GoogleAnalyticsOptions>()
    .Bind(builder.Configuration.GetSection("GoogleAnalytics"))
    .ValidateDataAnnotations();

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add services from Core
builder.Services.AddCoreServices(builder.Configuration);

// Add Google Analytics services with configuration
builder.Services.AddGoogleAnalyticsServices(builder.Configuration);

// Add Email services
builder.Services.AddEmailServices(builder.Configuration);

// Add JWT authentication
builder.Services.AddJwtAuthentication(builder.Configuration);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services to allow requests from our React client
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add controllers and API behavior options
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use CORS middleware
app.UseCors("AllowLocalhost");

app.UseHttpsRedirection();

// Add token extraction middleware BEFORE authentication
app.UseTokenExtraction();

// Add authentication middleware
app.UseAuthentication();
app.UseAuthorization();

// Map controller routes
app.MapControllers();

// Authentication endpoints
app.MapPost("/api/auth/google", async (
    [FromBody] GoogleAuthRequest request,
    [FromServices] IGoogleAuthService googleAuthService,
    [FromServices] IJwtService jwtService,
    [FromServices] ILogger<Program> logger,
    HttpContext httpContext) =>
{
    try
    {
        logger.LogInformation("Processing Google authentication request");
        
        // Process the google login
        var user = await googleAuthService.ProcessGoogleLoginAsync(
            request.AccessToken, 
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
            logger.LogInformation("Retrieved ID token from user claims for response");
            
            // Add the ID token to the response headers for subsequent requests
            httpContext.Response.Headers.Append("X-Id-Token", idToken);
        }
        else
        {
            logger.LogWarning("No ID token found in user claims after Google login");
        }
        
        // Log token details for debugging
        logger.LogInformation("Access token length: {Length}, ID token length: {IdTokenLength}", 
            accessToken?.Length ?? 0, 
            idToken?.Length ?? 0);
        
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
        logger.LogError(ex, "Error processing Google authentication");
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
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        await jwtService.RevokeTokenAsync(request.Token, ipAddress);
        
        return Results.Ok(new { Success = true });
    }
    catch (Exception ex)
    {
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
        // Get user ID from claims
        var userId = httpContext.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Results.Unauthorized();
        }
        
        // Get user from repository
        var user = await userRepository.GetByIdAsync(userGuid);
        if (user == null)
        {
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
    return Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow });
})
.WithName("HealthCheck")
.WithOpenApi();

app.Run();

// Request and response models
public record GoogleAuthRequest(string AccessToken);
public record RefreshTokenRequest(string RefreshToken);
public record RevokeTokenRequest(string Token);
