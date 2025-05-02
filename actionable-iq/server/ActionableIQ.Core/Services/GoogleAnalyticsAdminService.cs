using Google.Analytics.Admin.V1Beta;
using Google.Analytics.Data.V1Beta;
using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models.Analytics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using AdminPropertyName = Google.Analytics.Admin.V1Beta.PropertyName;
using Google.Apis.Auth.OAuth2;
using Grpc.Auth;
using System.Text.Json;
using System.Text;

namespace ActionableIQ.Core.Services
{
    /// <summary>
    /// Service for interacting with Google Analytics Admin API
    /// </summary>
    public class GoogleAnalyticsAdminService : IGoogleAnalyticsAdminService
    {
        private readonly ILogger<GoogleAnalyticsAdminService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GoogleAnalyticsOptions _options;
        private AnalyticsAdminServiceClient _client;
        private DateTime _tokenExpiry = DateTime.MinValue;
        private readonly int _maxConcurrentRequests;

        /// <summary>
        /// Constructor with dependencies
        /// </summary>
        public GoogleAnalyticsAdminService(
            ILogger<GoogleAnalyticsAdminService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor,
            IOptions<GoogleAnalyticsOptions> options)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _maxConcurrentRequests = configuration.GetValue<int>("GoogleAnalytics:MaxConcurrentRequests", 10);
        }

        /// <summary>
        /// Gets or creates an authenticated client
        /// </summary>
        private async Task<AnalyticsAdminServiceClient> GetClientAsync()
        {
            try
            {
                // If we have a valid client and the token hasn't expired, reuse it
                if (_client != null && DateTime.UtcNow < _tokenExpiry)
                {
                    _logger.LogDebug("Reusing existing GA4 Admin client.");
                    return _client;
                }

                // Get the access token from claims
                _logger.LogDebug("Attempting to retrieve access token from HttpContext claims.");
                var accessToken = _httpContextAccessor.HttpContext?.User?.FindFirst("access_token")?.Value;
                
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogError("No OAuth2 access token found in claims.");
                    throw new UnauthorizedAccessException("No OAuth2 access token found in claims");
                }

                // Log a portion of the token for verification purposes (avoid logging the full token)
                var tokenSnippet = accessToken.Length > 10 ? accessToken.Substring(0, 5) + "..." + accessToken.Substring(accessToken.Length - 5) : "Token too short";
                _logger.LogInformation("Found access token (snippet: {TokenSnippet}). Creating new GA4 Admin client.", tokenSnippet);

                // Create client with the OAuth2 access token
                _client = new AnalyticsAdminServiceClientBuilder
                {
                    Credential = GoogleCredential.FromAccessToken(accessToken)
                }.Build();

                // Set token expiry to 1 hour from now (typical OAuth2 token lifetime)
                 _tokenExpiry = DateTime.UtcNow.AddHours(1);
                _logger.LogInformation("Successfully created new GA4 Admin client. Token expiry set to {TokenExpiry}.", _tokenExpiry);

                return _client;
            }
            catch (UnauthorizedAccessException ex) // Catch specific exception first
            {
                 _logger.LogError(ex, "UnauthorizedAccessException during GA4 Admin client creation/retrieval.");
                 throw; // Re-throw to preserve original exception type if needed upstream
            }
            catch (Exception ex)
            {
                // Log the full exception details, including the stack trace
                _logger.LogError(ex, "Unexpected error creating Google Analytics Admin client: {ErrorMessage}", ex.Message);
                throw;
            }
        }

        /// <summary>
        /// Gets property details for a specific property ID
        /// </summary>
        public async Task<AnalyticsProperty> GetPropertyDetailsAsync(string propertyId)
        {
            try
            {
                _logger.LogInformation("Retrieving property details for {PropertyId}", propertyId);
                var client = await GetClientAsync();
                _logger.LogDebug("Calling Google API: GetPropertyAsync for {PropertyId}", propertyId);
                var property = await client.GetPropertyAsync(AdminPropertyName.FromProperty(propertyId));
                _logger.LogDebug("Received property details from Google API for {PropertyId}", propertyId);
                
                var analyticsProperty = new AnalyticsProperty
                {
                    PropertyId = property.Name,
                    DisplayName = property.DisplayName,
                    TimeZone = property.TimeZone,
                    CurrencyCode = property.CurrencyCode,
                    CreateTime = property.CreateTime.ToDateTime(),
                    UpdateTime = property.UpdateTime.ToDateTime()
                };

                _logger.LogInformation("Successfully retrieved property details for {PropertyId}", propertyId);
                return analyticsProperty;
            }
            catch (Grpc.Core.RpcException ex) when (ex.Status.StatusCode == Grpc.Core.StatusCode.NotFound)
            {
                _logger.LogWarning(ex, "Property {PropertyId} not found (GRPC NotFound)", propertyId);
                throw new KeyNotFoundException($"Property {propertyId} not found");
            }
            catch (Grpc.Core.RpcException ex) when (ex.Status.StatusCode == Grpc.Core.StatusCode.PermissionDenied)
            {
                _logger.LogError(ex, "Permission denied accessing property {PropertyId} (GRPC PermissionDenied)", propertyId);
                throw new UnauthorizedAccessException($"Permission denied accessing property {propertyId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting property details for {PropertyId}: {ErrorMessage}", propertyId, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// Gets property details for multiple property IDs in parallel
        /// </summary>
        public async Task<IDictionary<string, AnalyticsProperty>> GetPropertiesDetailsAsync(IEnumerable<string> propertyIds)
        {
            if (propertyIds == null)
                throw new ArgumentNullException(nameof(propertyIds));

            var uniquePropertyIds = propertyIds.Distinct().ToList();
            if (!uniquePropertyIds.Any())
                return new Dictionary<string, AnalyticsProperty>();

            _logger.LogInformation("Retrieving property details for {Count} properties", uniquePropertyIds.Count);

            var results = new ConcurrentDictionary<string, AnalyticsProperty>();
            var tasks = new List<Task>();
            var semaphore = new System.Threading.SemaphoreSlim(_maxConcurrentRequests);

            foreach (var propertyId in uniquePropertyIds)
            {
                tasks.Add(ProcessPropertyAsync(propertyId, results, semaphore));
            }

            await Task.WhenAll(tasks);
            
            _logger.LogInformation("Successfully retrieved details for {SuccessCount} out of {TotalCount} properties",
                results.Count, uniquePropertyIds.Count);

            return results;
        }

        private async Task ProcessPropertyAsync(
            string propertyId,
            ConcurrentDictionary<string, AnalyticsProperty> results,
            System.Threading.SemaphoreSlim semaphore)
        {
            try
            {
                await semaphore.WaitAsync();
                _logger.LogDebug("Processing property {PropertyId} in parallel task.", propertyId);
                var property = await GetPropertyDetailsAsync(propertyId);
                if (property != null)
                {
                    results.TryAdd(propertyId, property);
                    _logger.LogDebug("Successfully processed and added details for property {PropertyId}.", propertyId);
                } else {
                     _logger.LogWarning("GetPropertyDetailsAsync returned null for {PropertyId}, skipping addition.", propertyId);
                }
            }
            catch (KeyNotFoundException)
            {
                // Already logged in GetPropertyDetailsAsync
                _logger.LogWarning("Property {PropertyId} not found - skipping addition.", propertyId);
            }
            catch (UnauthorizedAccessException ex)
            {
                 // Already logged in GetPropertyDetailsAsync
                _logger.LogWarning(ex, "No access to property {PropertyId} - skipping addition.", propertyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing property {PropertyId}: {ErrorMessage}", propertyId, ex.Message);
                // Decide if you want to swallow this exception or let it propagate
                // Swallowing allows other properties to potentially succeed.
            }
            finally
            {
                semaphore.Release();
            }
        }

        /// <summary>
        /// Gets all properties available to the authenticated user by listing account summaries.
        /// Note: This method returns basic property info (ID, DisplayName).
        /// Full details like TimeZone require calling GetPropertyDetailsAsync.
        /// </summary>
        public async Task<IEnumerable<AnalyticsProperty>> GetAllPropertiesAsync()
        {
            _logger.LogInformation("Attempting to retrieve all available GA4 properties via ListAccountSummaries.");
            var properties = new List<AnalyticsProperty>();
            int accountCount = 0;
            int propertyCount = 0;
            try
            {
                 var client = await GetClientAsync(); // Ensure client is ready
                _logger.LogInformation("GA4 Admin client obtained successfully. Preparing ListAccountSummariesRequest.");

                // No filter needed for ListAccountSummaries to get all accessible accounts/properties
                var request = new ListAccountSummariesRequest { PageSize = 200 }; // Adjust PageSize as needed

                _logger.LogInformation("Calling Google API: ListAccountSummariesAsync");
                // ListAccountSummaries returns all accessible accounts and their properties
                var responseSummaries = client.ListAccountSummaries(request);

                _logger.LogInformation("Iterating through account summaries returned by ListAccountSummariesAsync...");
                foreach (var accountSummary in responseSummaries)
                {
                    accountCount++;
                    _logger.LogDebug("Processing Account Summary {Count}: {AccountName} ({AccountDisplayName})", accountCount, accountSummary.Account, accountSummary.DisplayName);

                    if (accountSummary.PropertySummaries != null)
                    {
                        foreach (var propertySummary in accountSummary.PropertySummaries)
                        {
                            propertyCount++;
                            _logger.LogDebug("  -> Found Property {Count}: {PropertyName} ({PropertyDisplayName})", propertyCount, propertySummary.Property, propertySummary.DisplayName);
                            properties.Add(new AnalyticsProperty
                            {
                                // propertySummary.Property contains the full name like "properties/12345"
                                PropertyId = propertySummary.Property,
                                DisplayName = propertySummary.DisplayName,
                                // Other fields are not available in the summary
                                TimeZone = null,
                                CurrencyCode = null,
                                // CreateTime = default, // Or handle appropriately
                                // UpdateTime = default,
                            });
                        }
                    } else {
                         _logger.LogDebug("  -> Account {AccountName} has no property summaries.", accountSummary.Account);
                    }
                }

                _logger.LogInformation("Successfully retrieved and processed {PropertyCount} properties across {AccountCount} account summaries.", properties.Count, accountCount);
                return properties;
            }
            catch (Grpc.Core.RpcException ex) when (ex.Status.StatusCode == Grpc.Core.StatusCode.Unauthenticated)
            {
                 // Log full exception details
                _logger.LogError(ex, "Authentication error accessing Google Analytics API (GRPC Unauthenticated) during ListAccountSummaries: {ErrorMessage}", ex.Message);
                throw new UnauthorizedAccessException("Failed to authenticate with Google Analytics API. Check token validity and scopes.", ex);
            }
            catch (Grpc.Core.RpcException ex) when (ex.Status.StatusCode == Grpc.Core.StatusCode.PermissionDenied)
            {
                 // Log full exception details
                _logger.LogError(ex, "Permission denied accessing Google Analytics API (GRPC PermissionDenied) during ListAccountSummaries: {ErrorMessage}", ex.Message);
                throw new UnauthorizedAccessException("Permission denied accessing Google Analytics API. Check user permissions.", ex);
            }
             catch (UnauthorizedAccessException ex) // Catch from GetClientAsync
            {
                 _logger.LogError(ex, "UnauthorizedAccessException occurred, likely during client creation: {ErrorMessage}", ex.Message);
                 throw; // Re-throw
            }
            catch (Exception ex)
            {
                 // Log full exception details for any other errors
                _logger.LogError(ex, "Unexpected error getting all properties via ListAccountSummaries after processing {PropertyCount} properties across {AccountCount} accounts: {ErrorMessage}", propertyCount, accountCount, ex.Message);
                throw; // Re-throw the original exception
            }
        }

        /// <summary>
        /// Gets a property by ID
        /// </summary>
        public async Task<Property> GetPropertyAsync(string propertyId)
        {
            try
            {
                _logger.LogDebug("Getting raw Google Property object for {PropertyId}", propertyId);
                var propertyName = AdminPropertyName.FromProperty(propertyId);
                var client = await GetClientAsync();
                return await client.GetPropertyAsync(propertyName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Google Analytics property {PropertyId}: {ErrorMessage}", propertyId, ex.Message);
                throw;
            }
        }
    }
} 