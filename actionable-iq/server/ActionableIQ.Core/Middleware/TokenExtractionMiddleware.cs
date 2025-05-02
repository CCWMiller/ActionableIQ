using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Middleware
{
    /// <summary>
    /// Middleware that extracts tokens from headers and adds them to user claims
    /// </summary>
    public class TokenExtractionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<TokenExtractionMiddleware> _logger;

        public TokenExtractionMiddleware(RequestDelegate next, ILogger<TokenExtractionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            string idToken = null;

            // First check if we already have an ID token in the claims
            idToken = context.User?.FindFirst("id_token")?.Value;
            if (!string.IsNullOrEmpty(idToken))
            {
                _logger.LogDebug("Found ID token in existing claims");
            }
            // Then try to get from dedicated X-Id-Token header
            else if (context.Request.Headers.TryGetValue("X-Id-Token", out var idTokenHeader) && !string.IsNullOrEmpty(idTokenHeader))
            {
                idToken = idTokenHeader;
                _logger.LogDebug("Found ID token in X-Id-Token header");
            }
            // Only use Authorization header if we haven't found an ID token elsewhere
            else if (context.Request.Headers.TryGetValue("Authorization", out var authHeader) && !string.IsNullOrEmpty(authHeader))
            {
                var authHeaderVal = authHeader.ToString();
                if (authHeaderVal.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeaderVal.Substring("Bearer ".Length).Trim();
                    // Only use bearer token if it looks like an ID token (JWT format)
                    if (token.Count(c => c == '.') == 2)
                    {
                        idToken = token;
                        _logger.LogDebug("Using JWT token from Authorization header as ID token");
                    }
                    else
                    {
                        _logger.LogDebug("Bearer token is not in JWT format, skipping");
                    }
                }
            }

            if (!string.IsNullOrEmpty(idToken))
            {
                try
                {
                    // Create a new claims identity if one doesn't exist
                    var identity = context.User?.Identity as ClaimsIdentity ?? new ClaimsIdentity("Bearer");

                    // Remove any existing id_token claim
                    var existingClaim = identity.FindFirst("id_token");
                    if (existingClaim != null)
                    {
                        identity.RemoveClaim(existingClaim);
                        _logger.LogDebug("Removed existing ID token claim");
                    }

                    // Add the new id_token claim
                    identity.AddClaim(new Claim("id_token", idToken));
                    _logger.LogDebug("Added ID token to claims");

                    // If we created a new identity, create a new ClaimsPrincipal
                    if (context.User == null)
                    {
                        context.User = new ClaimsPrincipal(identity);
                        _logger.LogDebug("Created new ClaimsPrincipal with ID token");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing token extraction");
                }
            }
            else
            {
                _logger.LogWarning("No valid ID token found in request. Path: {Path}, Method: {Method}", 
                    context.Request.Path, context.Request.Method);
            }

            await _next(context);
        }
    }
} 