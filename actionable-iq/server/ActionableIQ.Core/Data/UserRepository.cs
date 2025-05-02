using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Data
{
    /// <summary>
    /// Implementation of user repository using Entity Framework Core
    /// </summary>
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get a user by their unique identifier
        /// </summary>
        public async Task<User> GetByIdAsync(Guid id)
        {
            return await _context.Users
                .Include(u => u.AuthProviders)
                .Include(u => u.RefreshTokens)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        /// <summary>
        /// Get a user by their email address
        /// </summary>
        public async Task<User> GetByEmailAsync(string email)
        {
            return await _context.Users
                .Include(u => u.AuthProviders)
                .Include(u => u.RefreshTokens)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
        }

        /// <summary>
        /// Get a user by their external provider identifier
        /// </summary>
        public async Task<User> GetByProviderAsync(string providerType, string providerKey)
        {
            var authProvider = await _context.UserAuthProviders
                .Include(p => p.User)
                .ThenInclude(u => u.AuthProviders)
                .Include(p => p.User)
                .ThenInclude(u => u.RefreshTokens)
                .FirstOrDefaultAsync(p => 
                    p.ProviderType == providerType && 
                    p.ProviderKey == providerKey);

            return authProvider?.User;
        }

        /// <summary>
        /// Add a new user to the database
        /// </summary>
        public async Task<User> CreateAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            return user;
        }

        /// <summary>
        /// Update an existing user
        /// </summary>
        public async Task<User> UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return user;
        }

        /// <summary>
        /// Get all users in the system
        /// </summary>
        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _context.Users
                .Include(u => u.AuthProviders)
                .ToListAsync();
        }

        /// <summary>
        /// Add a new authentication provider to a user
        /// </summary>
        public async Task AddAuthProviderAsync(UserAuthProvider authProvider)
        {
            await _context.UserAuthProviders.AddAsync(authProvider);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Add a refresh token to a user
        /// </summary>
        public async Task<RefreshToken> AddRefreshTokenAsync(RefreshToken refreshToken)
        {
            // Hash the token for security
            refreshToken.Token = HashToken(refreshToken.Token);
            
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();
            return refreshToken;
        }

        /// <summary>
        /// Get a refresh token by its token value
        /// </summary>
        public async Task<RefreshToken> GetRefreshTokenAsync(string token)
        {
            // Hash the token to match what's stored in the database
            var hashedToken = HashToken(token);
            
            return await _context.RefreshTokens
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Token == hashedToken);
        }

        /// <summary>
        /// Revoke a refresh token
        /// </summary>
        public async Task RevokeRefreshTokenAsync(string token, string ipAddress, string reason = null, string replacedByToken = null)
        {
            var refreshToken = await GetRefreshTokenAsync(token);
            
            if (refreshToken == null)
                throw new Exception("Token not found");

            // Revoke token
            refreshToken.RevokedAt = DateTime.UtcNow;
            refreshToken.RevokedByIp = ipAddress;
            refreshToken.ReasonRevoked = reason;
            refreshToken.ReplacedByToken = HashToken(replacedByToken);
            
            _context.RefreshTokens.Update(refreshToken);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Hash a token for secure storage
        /// </summary>
        private string HashToken(string token)
        {
            if (string.IsNullOrEmpty(token))
                return token;

            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }
} 