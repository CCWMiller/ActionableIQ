using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Auth
{
    /// <summary>
    /// Implementation of JWT service for token generation and validation
    /// </summary>
    public class JwtService : IJwtService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IUserRepository _userRepository;

        public JwtService(IOptions<JwtSettings> jwtSettings, IUserRepository userRepository)
        {
            _jwtSettings = jwtSettings.Value;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Generate a JWT token for a user
        /// </summary>
        public string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Secret);
            
            var claims = new List<Claim>
            {
                new Claim("sub", user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("name", user.Name),
                new Claim("jti", Guid.NewGuid().ToString())
            };
            
            // Add tokens if available
            if (user.Claims != null)
            {
                if (user.Claims.TryGetValue("id_token", out var idToken))
                {
                    claims.Add(new Claim("id_token", idToken));
                }
                
                if (user.Claims.TryGetValue("access_token", out var accessToken))
                {
                    claims.Add(new Claim("access_token", accessToken));
                }
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Generate refresh token string
        /// </summary>
        public string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
                return Convert.ToBase64String(randomBytes);
            }
        }

        /// <summary>
        /// Validate a JWT token and return its claims
        /// </summary>
        public ClaimsPrincipal ValidateToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Secret);
            
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = _jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            SecurityToken validatedToken;
            return tokenHandler.ValidateToken(token, validationParameters, out validatedToken);
        }

        /// <summary>
        /// Get user ID from token claims
        /// </summary>
        public Guid GetUserIdFromToken(string token)
        {
            var principal = ValidateToken(token);
            var subClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub);
            
            if (subClaim == null || !Guid.TryParse(subClaim.Value, out var userId))
            {
                throw new Exception("Invalid token: Subject claim not found or invalid");
            }
            
            return userId;
        }

        /// <summary>
        /// Validate a refresh token
        /// </summary>
        public async Task<(User user, RefreshToken refreshToken)> ValidateRefreshTokenAsync(string token)
        {
            var refreshToken = await _userRepository.GetRefreshTokenAsync(token);
            
            if (refreshToken == null)
            {
                throw new Exception("Invalid refresh token");
            }
            
            if (!refreshToken.IsActive)
            {
                throw new Exception("Inactive refresh token");
            }
            
            return (refreshToken.User, refreshToken);
        }

        /// <summary>
        /// Create a refresh token for a user with IP address
        /// </summary>
        public async Task<(string accessToken, string refreshToken)> CreateTokensAsync(User user, string ipAddress)
        {
            var accessToken = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();
            
            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                CreatedByIp = ipAddress
            };
            
            await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);
            
            return (accessToken, refreshToken);
        }

        /// <summary>
        /// Refresh access token using a refresh token
        /// </summary>
        public async Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken, string ipAddress)
        {
            var (user, oldRefreshToken) = await ValidateRefreshTokenAsync(refreshToken);
            
            // Generate new tokens
            var accessToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();
            
            // Save new refresh token
            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays),
                CreatedByIp = ipAddress
            };
            
            await _userRepository.AddRefreshTokenAsync(refreshTokenEntity);
            
            // Revoke old refresh token
            await _userRepository.RevokeRefreshTokenAsync(
                refreshToken, 
                ipAddress,
                "Replaced by new token", 
                newRefreshToken);
            
            return (accessToken, newRefreshToken);
        }

        /// <summary>
        /// Revoke a refresh token
        /// </summary>
        public async Task RevokeTokenAsync(string token, string ipAddress)
        {
            await _userRepository.RevokeRefreshTokenAsync(token, ipAddress, "Revoked without replacement");
        }
    }
} 