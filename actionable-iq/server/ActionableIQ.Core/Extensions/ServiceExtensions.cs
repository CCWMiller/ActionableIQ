using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Services;
using ActionableIQ.Core.Models;
using ActionableIQ.Core.Models.Analytics;
using Google.Analytics.Admin.V1Beta;
using Google.Analytics.Data.V1Beta;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using Google.Api.Gax.Grpc;
using Grpc.Core;
using Grpc.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ActionableIQ.Core.Auth;
using ActionableIQ.Core.Data;
using System.Linq;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace ActionableIQ.Core.Extensions
{
    public static class ServiceExtensions
    {
        public static IServiceCollection AddCoreServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Add HTTP context accessor
            services.AddHttpContextAccessor();

            // Add repositories
            services.AddScoped<IUserRepository, UserRepository>();

            // Add auth services
            services.AddScoped<IGoogleAuthService, GoogleAuthService>();
            services.AddScoped<IJwtService, JwtService>();

            // Add HTTP client
            services.AddHttpClient();

            return services;
        }

        public static IServiceCollection AddGoogleAnalyticsServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Configure services with strongly typed options and validate
            services.AddOptions<GoogleAnalyticsOptions>()
                .Bind(configuration.GetSection("GoogleAnalytics"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // Register the Admin and Data clients (using scoped to handle potential OAuth token refreshes per request)
            services.AddScoped<AnalyticsAdminServiceClient>(provider =>
            {
                var httpContextAccessor = provider.GetRequiredService<IHttpContextAccessor>();
                var logger = provider.GetRequiredService<ILogger<AnalyticsAdminServiceClient>>();
                var httpContext = httpContextAccessor.HttpContext;

                if (httpContext == null) {
                    logger.LogError("HttpContext is null, cannot create AnalyticsAdminServiceClient.");
                    throw new InvalidOperationException("HttpContext is not available.");
                }
                
                // Get token from User claims
                var accessToken = httpContext.User?.FindFirst("access_token")?.Value;
                if (string.IsNullOrEmpty(accessToken))
                {
                    logger.LogWarning("OAuth access token not found in user claims.");
                    throw new UnauthorizedAccessException("OAuth access token not found in user claims.");
                }

                try
                {
                    var credential = GoogleCredential.FromAccessToken(accessToken).CreateScoped(AnalyticsAdminServiceClient.DefaultScopes);
                    return new AnalyticsAdminServiceClientBuilder { ChannelCredentials = credential.ToChannelCredentials() }.Build();
                }
                catch(Exception ex)
                {
                    logger.LogError(ex, "Failed to create AnalyticsAdminServiceClient using access token.");
                    // Optionally check for specific token expiry exceptions
                    throw;
                }
            });
            
            services.AddScoped<BetaAnalyticsDataClient>(provider =>
            {
                var httpContextAccessor = provider.GetRequiredService<IHttpContextAccessor>();
                var logger = provider.GetRequiredService<ILogger<BetaAnalyticsDataClient>>();
                var httpContext = httpContextAccessor.HttpContext;

                 if (httpContext == null) {
                    logger.LogError("HttpContext is null, cannot create BetaAnalyticsDataClient.");
                    throw new InvalidOperationException("HttpContext is not available.");
                }

                // Get token from User claims
                var accessToken = httpContext.User?.FindFirst("access_token")?.Value;
                 if (string.IsNullOrEmpty(accessToken))
                 {
                     logger.LogWarning("OAuth access token not found in user claims.");
                     throw new UnauthorizedAccessException("OAuth access token not found in user claims.");
                 }

                 try
                 {
                     var credential = GoogleCredential.FromAccessToken(accessToken).CreateScoped(BetaAnalyticsDataClient.DefaultScopes);
                     return new BetaAnalyticsDataClientBuilder { ChannelCredentials = credential.ToChannelCredentials() }.Build();
                 }
                 catch(Exception ex)
                 {
                    logger.LogError(ex, "Failed to create BetaAnalyticsDataClient using access token.");
                     // Optionally check for specific token expiry exceptions
                    throw;
                 }
            });

            // Register the services that use the clients
            services.AddScoped<IGoogleAnalyticsAdminService, GoogleAnalyticsAdminService>();
            services.AddScoped<IGoogleAnalyticsDataService, GoogleAnalyticsDataService>();
            services.AddScoped<IGoogleAnalyticsService, GoogleAnalyticsService>();
            services.AddScoped<IGoogleAnalyticsReportService, GoogleAnalyticsReportService>();

            return services;
        }

        public static IServiceCollection AddEmailServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Configure services with strongly typed options and validate
            services.AddOptions<MailgunSettings>()
                .Bind(configuration.GetSection("Mailgun"))
                .ValidateDataAnnotations()
                .ValidateOnStart();

            // Register email service
            services.AddScoped<IEmailService, MailgunService>();

            return services;
        }

        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtSection = configuration.GetSection("JwtSettings");
            var jwtSettings = jwtSection.Get<JwtSettings>();
            if (jwtSettings == null)
            {
                throw new InvalidOperationException("JwtSettings configuration section is missing");
            }
            
            // Register JwtSettings with the DI container
            services.Configure<JwtSettings>(jwtSection);

            var key = Encoding.ASCII.GetBytes(jwtSettings.Secret);

            services.AddAuthentication(x =>
            {
                x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(x =>
            {
                x.RequireHttpsMetadata = false;
                x.SaveToken = true;
                x.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

            return services;
        }
    }
} 