namespace ActionableIQ.Core.Auth
{
    /// <summary>
    /// Settings for JWT token generation and validation
    /// </summary>
    public class JwtSettings
    {
        /// <summary>
        /// Secret key used to sign tokens
        /// </summary>
        public string Secret { get; set; }

        /// <summary>
        /// Issuer of the token (typically your API)
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// Audience of the token (typically your client application)
        /// </summary>
        public string Audience { get; set; }

        /// <summary>
        /// Token expiry time in minutes
        /// </summary>
        public int ExpiryMinutes { get; set; } = 60;

        /// <summary>
        /// Refresh token expiry time in days
        /// </summary>
        public int RefreshTokenExpiryDays { get; set; } = 7;
    }
} 