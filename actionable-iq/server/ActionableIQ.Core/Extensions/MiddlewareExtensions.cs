using Microsoft.AspNetCore.Builder;
using ActionableIQ.Core.Middleware;

namespace ActionableIQ.Core.Extensions
{
    /// <summary>
    /// Extension methods for registering custom middleware
    /// </summary>
    public static class MiddlewareExtensions
    {
        /// <summary>
        /// Adds middleware to extract tokens from headers and add them to user claims
        /// </summary>
        public static IApplicationBuilder UseTokenExtraction(this IApplicationBuilder app)
        {
            return app.UseMiddleware<TokenExtractionMiddleware>();
        }
    }
} 