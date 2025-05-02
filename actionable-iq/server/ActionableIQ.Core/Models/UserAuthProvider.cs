using System;

namespace ActionableIQ.Core.Models
{
    /// <summary>
    /// Represents an authentication provider for a user
    /// </summary>
    public class UserAuthProvider : BaseEntity
    {
        /// <summary>
        /// The ID of the user this auth provider is associated with
        /// </summary>
        public Guid UserId { get; set; }

        /// <summary>
        /// The type of provider (e.g., Google, Microsoft)
        /// </summary>
        public string ProviderType { get; set; }

        /// <summary>
        /// The unique identifier for the user from the provider
        /// </summary>
        public string ProviderKey { get; set; }

        /// <summary>
        /// When this provider was last used for authentication
        /// </summary>
        public DateTime? LastUsedAt { get; set; }

        /// <summary>
        /// JSON serialized metadata for the provider (like tokens)
        /// </summary>
        public string? Metadata { get; set; }

        /// <summary>
        /// Navigation property to the associated user
        /// </summary>
        public virtual User User { get; set; }
    }

    /// <summary>
    /// Enum representing authentication provider types
    /// </summary>
    public static class AuthProviderType
    {
        public const string Google = "Google";
        public const string Microsoft = "Microsoft";
    }
} 