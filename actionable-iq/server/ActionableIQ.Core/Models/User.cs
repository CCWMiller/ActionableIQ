using System;
using System.Collections.Generic;

namespace ActionableIQ.Core.Models
{
    /// <summary>
    /// Represents a user in the system
    /// </summary>
    public class User : BaseEntity
    {
        /// <summary>
        /// User's email address (unique identifier from authentication provider)
        /// </summary>
        public string Email { get; set; }

        /// <summary>
        /// User's display name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// URL to the user's profile image
        /// </summary>
        public string ProfileImageUrl { get; set; }

        /// <summary>
        /// Indicates if the user account is active
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// When the user last logged in
        /// </summary>
        public DateTime? LastLoginAt { get; set; }

        /// <summary>
        /// Navigation property for user's authentication providers
        /// </summary>
        public virtual ICollection<UserAuthProvider> AuthProviders { get; set; } = new List<UserAuthProvider>();

        /// <summary>
        /// Navigation property for user's refresh tokens
        /// </summary>
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
        
        /// <summary>
        /// Additional claims for the user that aren't persisted to the database
        /// </summary>
        public Dictionary<string, string> Claims { get; set; } = new Dictionary<string, string>();
    }
} 