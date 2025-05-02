using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Text.Json;
using System.Linq;
using Google.Apis.Auth;
using Google.Apis.Auth.OAuth2;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace ActionableIQ.Core.Auth
{
    /// <summary>
    /// Service for handling Google authentication
    /// </summary>
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;
        private readonly ILogger<GoogleAuthService> _logger;
        private readonly string _clientId;
        private readonly string _clientSecret;
        private readonly string _redirectUri;

        public GoogleAuthService(
            IHttpClientFactory httpClientFactory,
            IUserRepository userRepository,
            IJwtService jwtService,
            IConfiguration configuration,
            ILogger<GoogleAuthService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _userRepository = userRepository;
            _jwtService = jwtService;
            _logger = logger;
            _clientId = configuration["Authentication:Google:ClientId"];
            _clientSecret = configuration["Authentication:Google:ClientSecret"];
            _redirectUri = configuration["Authentication:Google:RedirectUri"];
        }

        /// <summary>
        /// Exchange authorization code for tokens and retrieve user info
        /// </summary>
        public async Task<GoogleUserInfo> ValidateGoogleTokenAsync(string code)
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                
                // Exchange the authorization code for tokens
                var tokenRequest = new Dictionary<string, string>
                {
                    { "code", code },
                    { "client_id", _clientId },
                    { "client_secret", _clientSecret },
                    { "redirect_uri", _redirectUri },
                    { "grant_type", "authorization_code" }
                };

                var tokenResponse = await httpClient.PostAsync(
                    "https://oauth2.googleapis.com/token",
                    new FormUrlEncodedContent(tokenRequest));

                if (!tokenResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to exchange code for tokens: {StatusCode}", tokenResponse.StatusCode);
                    throw new Exception("Failed to exchange authorization code for tokens");
                }

                var tokens = await tokenResponse.Content.ReadFromJsonAsync<GoogleTokenResponse>();
                
                // Get user info using the ID token
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                    "Bearer", tokens.AccessToken);
                    
                var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
                
                if (!userInfoResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to get user info: {StatusCode}", userInfoResponse.StatusCode);
                    throw new Exception("Failed to get user info");
                }
                
                var googleResponse = await userInfoResponse.Content.ReadFromJsonAsync<GoogleUserInfoResponse>();
                
                _logger.LogInformation("Successfully validated Google token for user: {Email}", googleResponse.Email);
                
                return new GoogleUserInfo
                {
                    Subject = googleResponse.Sub,
                    Email = googleResponse.Email,
                    EmailVerified = googleResponse.EmailVerified,
                    Name = googleResponse.Name ?? googleResponse.Email?.Split('@')[0],
                    Picture = googleResponse.Picture,
                    IdToken = tokens.IdToken,
                    AccessToken = tokens.AccessToken
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Google token");
                throw;
            }
        }

        /// <summary>
        /// Process Google login, creating a user if needed
        /// </summary>
        public async Task<User> ProcessGoogleLoginAsync(string code, string ipAddress)
        {
            var googleUserInfo = await ValidateGoogleTokenAsync(code);
            
            // Check if we have a user with this Google ID
            var user = await _userRepository.GetByProviderAsync(
                AuthProviderType.Google, 
                googleUserInfo.Subject);
                
            if (user == null)
            {
                // Check if we have a user with this email
                user = await _userRepository.GetByEmailAsync(googleUserInfo.Email);
                
                if (user == null)
                {
                    // Create a new user
                    user = new User
                    {
                        Email = googleUserInfo.Email,
                        Name = googleUserInfo.Name,
                        ProfileImageUrl = googleUserInfo.Picture
                    };
                    
                    await _userRepository.CreateAsync(user);
                }
                
                // Add Google as auth provider
                var authProvider = new UserAuthProvider
                {
                    UserId = user.Id,
                    ProviderType = AuthProviderType.Google,
                    ProviderKey = googleUserInfo.Subject,
                    LastUsedAt = DateTime.UtcNow,
                    // Store both tokens in the provider metadata
                    Metadata = JsonSerializer.Serialize(new { 
                        id_token = googleUserInfo.IdToken,
                        access_token = googleUserInfo.AccessToken 
                    })
                };
                
                await _userRepository.AddAuthProviderAsync(authProvider);
            }
            else
            {
                // Update user information and token
                user.Name = googleUserInfo.Name;
                user.ProfileImageUrl = googleUserInfo.Picture;
                user.LastLoginAt = DateTime.UtcNow;

                // Update the auth provider with the new ID token
                var authProvider = user.AuthProviders.FirstOrDefault(ap => 
                    ap.ProviderType == AuthProviderType.Google && ap.ProviderKey == googleUserInfo.Subject);

                if (authProvider != null)
                {
                    authProvider.LastUsedAt = DateTime.UtcNow;
                    authProvider.Metadata = JsonSerializer.Serialize(new { 
                        id_token = googleUserInfo.IdToken,
                        access_token = googleUserInfo.AccessToken 
                    });
                }
                
                await _userRepository.UpdateAsync(user);
            }
            
            // Store both tokens in the user object (not persisted, just for the current request)
            user.Claims = new Dictionary<string, string>
            {
                { "id_token", googleUserInfo.IdToken },
                { "access_token", googleUserInfo.AccessToken }
            };
            
            return user;
        }
    }

    /// <summary>
    /// Internal model for Google user info response
    /// </summary>
    internal class GoogleUserInfoResponse
    {
        public string Sub { get; set; }
        public string Email { get; set; }
        public bool EmailVerified { get; set; }
        public string Name { get; set; }
        public string Picture { get; set; }
    }
    
    /// <summary>
    /// Internal model for Google token response
    /// </summary>
    internal class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }
        
        [JsonPropertyName("id_token")]
        public string IdToken { get; set; }
        
        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; }
        
        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
        
        [JsonPropertyName("token_type")]
        public string TokenType { get; set; }
    }
} 