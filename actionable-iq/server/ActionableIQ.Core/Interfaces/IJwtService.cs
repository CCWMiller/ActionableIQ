using ActionableIQ.Core.Models;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Interface for JWT token generation and validation
    /// </summary>
    public interface IJwtService
    {
        /// <summary>
        /// Generate a JWT token for a user
        /// </summary>
        string GenerateJwtToken(User user);

        /// <summary>
        /// Generate refresh token
        /// </summary>
        string GenerateRefreshToken();

        /// <summary>
        /// Validate a JWT token and return its claims
        /// </summary>
        ClaimsPrincipal ValidateToken(string token);

        /// <summary>
        /// Get user ID from token claims
        /// </summary>
        Guid GetUserIdFromToken(string token);

        /// <summary>
        /// Validate a refresh token
        /// </summary>
        Task<(User user, RefreshToken refreshToken)> ValidateRefreshTokenAsync(string token);

        /// <summary>
        /// Create a refresh token for a user with IP address
        /// </summary>
        Task<(string accessToken, string refreshToken)> CreateTokensAsync(User user, string ipAddress);

        /// <summary>
        /// Refresh access token using a refresh token
        /// </summary>
        Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken, string ipAddress);

        /// <summary>
        /// Revoke a refresh token
        /// </summary>
        Task RevokeTokenAsync(string token, string ipAddress);
    }
} 