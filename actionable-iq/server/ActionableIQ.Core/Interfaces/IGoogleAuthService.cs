using ActionableIQ.Core.Models;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Interface for Google authentication services
    /// </summary>
    public interface IGoogleAuthService
    {
        /// <summary>
        /// Validate a Google ID token
        /// </summary>
        Task<GoogleUserInfo> ValidateGoogleTokenAsync(string accessToken);

        /// <summary>
        /// Process Google login, creating a user if needed
        /// </summary>
        Task<User> ProcessGoogleLoginAsync(string accessToken, string ipAddress);
    }
} 