using ActionableIQ.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Interface for accessing and manipulating user data
    /// </summary>
    public interface IUserRepository
    {
        /// <summary>
        /// Get a user by their unique identifier
        /// </summary>
        Task<User> GetByIdAsync(Guid id);

        /// <summary>
        /// Get a user by their email address
        /// </summary>
        Task<User> GetByEmailAsync(string email);

        /// <summary>
        /// Get a user by their external provider identifier
        /// </summary>
        Task<User> GetByProviderAsync(string providerType, string providerKey);

        /// <summary>
        /// Add a new user to the database
        /// </summary>
        Task<User> CreateAsync(User user);

        /// <summary>
        /// Update an existing user
        /// </summary>
        Task<User> UpdateAsync(User user);

        /// <summary>
        /// Get all users in the system
        /// </summary>
        Task<IEnumerable<User>> GetAllAsync();

        /// <summary>
        /// Add a new authentication provider to a user
        /// </summary>
        Task AddAuthProviderAsync(UserAuthProvider authProvider);

        /// <summary>
        /// Add a refresh token to a user
        /// </summary>
        Task<RefreshToken> AddRefreshTokenAsync(RefreshToken refreshToken);

        /// <summary>
        /// Get a refresh token by its token value
        /// </summary>
        Task<RefreshToken> GetRefreshTokenAsync(string token);

        /// <summary>
        /// Revoke a refresh token
        /// </summary>
        Task RevokeRefreshTokenAsync(string token, string ipAddress, string reason = null, string replacedByToken = null);
    }
} 