using System;

namespace ActionableIQ.Core.Models
{
    /// <summary>
    /// Represents a refresh token for JSON Web Token authentication
    /// </summary>
    public class RefreshToken : BaseEntity
    {
        /// <summary>
        /// The ID of the user this refresh token belongs to
        /// </summary>
        public Guid UserId { get; set; }

        /// <summary>
        /// The refresh token value (hashed for storage)
        /// </summary>
        public string Token { get; set; }

        /// <summary>
        /// When this token expires
        /// </summary>
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// IP address that created this token
        /// </summary>
        public string CreatedByIp { get; set; }

        /// <summary>
        /// When this token was revoked, if applicable
        /// </summary>
        public DateTime? RevokedAt { get; set; }

        /// <summary>
        /// IP address that revoked this token
        /// </summary>
        public string RevokedByIp { get; set; }

        /// <summary>
        /// The token that replaced this one when it was refreshed
        /// </summary>
        public string ReplacedByToken { get; set; }

        /// <summary>
        /// Reason this token was revoked
        /// </summary>
        public string ReasonRevoked { get; set; }

        /// <summary>
        /// Whether this token is active
        /// </summary>
        public bool IsActive => RevokedAt == null && !IsExpired;

        /// <summary>
        /// Whether this token has expired
        /// </summary>
        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

        /// <summary>
        /// Navigation property to the user
        /// </summary>
        public virtual User User { get; set; }
    }
} 