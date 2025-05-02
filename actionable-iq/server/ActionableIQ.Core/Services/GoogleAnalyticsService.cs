using Google.Analytics.Data.V1Beta;
using Google.Api.Gax;
using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using ActionableIQ.Core.Models.Analytics;
using ActionableIQ.Core.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Globalization;
using System.Text.Json;
using System.Text;
using CoreDateRange = ActionableIQ.Core.Models.Analytics.DateRange;
using GoogleDateRange = Google.Analytics.Data.V1Beta.DateRange;
using CoreFilterExpression = ActionableIQ.Core.Models.Analytics.FilterExpression;
using GoogleFilterExpression = Google.Analytics.Data.V1Beta.FilterExpression;
using Microsoft.Extensions.Options;
using Google.Apis.Auth.OAuth2;
using System.Collections.Concurrent;
using System.Threading;

namespace ActionableIQ.Core.Services
{
    /// <summary>
    /// Service for interacting with Google Analytics Data API
    /// </summary>
    public class GoogleAnalyticsService : IGoogleAnalyticsService
    {
        private readonly ILogger<GoogleAnalyticsService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGoogleAnalyticsAdminService _adminService;
        private readonly GoogleAnalyticsOptions _options;
        private BetaAnalyticsDataClient _client;
        private DateTime _tokenExpiry = DateTime.MinValue;

        /// <summary>
        /// Constructor with dependencies
        /// </summary>
        public GoogleAnalyticsService(
            ILogger<GoogleAnalyticsService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor,
            IGoogleAnalyticsAdminService adminService,
            IOptions<GoogleAnalyticsOptions> options)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
            _adminService = adminService ?? throw new ArgumentNullException(nameof(adminService));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        }

        /// <summary>
        /// Gets or creates an authenticated Google Analytics Data API client
        /// </summary>
        private async Task<BetaAnalyticsDataClient> GetClientAsync()
        {
            try
            {
                // If we have a valid client and the token hasn't expired, reuse it
                if (_client != null && DateTime.UtcNow < _tokenExpiry)
                {
                    return _client;
                }

                // Get the access token from claims
                var accessToken = _httpContextAccessor.HttpContext?.User?.FindFirst("access_token")?.Value;
                
                if (string.IsNullOrEmpty(accessToken))
                {
                    throw new UnauthorizedAccessException("No OAuth2 access token found in claims");
                }

                _logger.LogInformation("Creating new GA4 client with OAuth2 token");

                // Create client with the OAuth2 access token
                _client = new BetaAnalyticsDataClientBuilder
                {
                    Credential = GoogleCredential.FromAccessToken(accessToken)
                }.Build();

                // Set token expiry to 1 hour from now (typical OAuth2 token lifetime)
                _tokenExpiry = DateTime.UtcNow.AddHours(1);

                return _client;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Google Analytics Data client");
                throw;
            }
        }

        // Updated to handle multiple properties in parallel
        public async Task<AnalyticsMultiQueryResponse> RunQueryAsync(AnalyticsQueryRequest request)
        {
            var combinedResponse = new AnalyticsMultiQueryResponse();
            var resultsBag = new ConcurrentBag<AnalyticsQueryResponse>();
            var errorsBag = new ConcurrentBag<AnalyticsQueryError>();
            var semaphore = new SemaphoreSlim(2); // Limit concurrency

            _logger.LogInformation("Starting multi-property query for {Count} properties.", request.PropertyIds?.Count ?? 0);

            // Basic validation (Controller should handle count limit)
            if (request.PropertyIds == null || !request.PropertyIds.Any())
            {
                _logger.LogWarning("RunQueryAsync called with no Property IDs.");
                // Optionally add an error to combinedResponse or throw
                combinedResponse.Errors.Add(new AnalyticsQueryError { PropertyId = "N/A", ErrorMessage = "No property IDs provided in the request." });
                return combinedResponse;
            }
            if (string.IsNullOrEmpty(request.SourceMediumFilter) ||
                string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
            {
                 _logger.LogWarning("RunQueryAsync called with missing required parameters (SourceMediumFilter, StartDate, EndDate).");
                 combinedResponse.Errors.Add(new AnalyticsQueryError { PropertyId = "N/A", ErrorMessage = "Missing required parameters (SourceMediumFilter, StartDate, EndDate)." });
                 return combinedResponse;
            }
             if (!DateTime.TryParse(request.StartDate, out var startDate) || !DateTime.TryParse(request.EndDate, out var endDate))
            {
                _logger.LogWarning("RunQueryAsync called with invalid date format.");
                combinedResponse.Errors.Add(new AnalyticsQueryError { PropertyId = "N/A", ErrorMessage = "Invalid date format for StartDate or EndDate. Use YYYY-MM-DD." });
                return combinedResponse;
            }


            // Get client once before the loop
            BetaAnalyticsDataClient client;
            try
            {
                 _logger.LogInformation("Attempting to get authenticated client for multi-property query.");
                 client = await GetClientAsync();
                 _logger.LogInformation("Successfully obtained authenticated client for multi-property query.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get authenticated client for multi-property query. Aborting.");
                combinedResponse.Errors.Add(new AnalyticsQueryError { PropertyId = "N/A", ErrorMessage = $"Failed to obtain authenticated client: {ex.Message}" });
                return combinedResponse; // Cannot proceed without a client
            }


            var tasks = request.PropertyIds.Select(async propertyId =>
            {
                await semaphore.WaitAsync();
                try
                {
                     _logger.LogInformation("Starting query for property: {PropertyId}", propertyId);
                    // Build the request using the helper method
                    var runReportRequest = BuildAnalyticsRequest(
                        propertyId,
                        request.SourceMediumFilter,
                        startDate,
                        endDate,
                        request.TopStatesCount
                    );

                    // Log the complete request details for this property
                    _logger.LogInformation("Sending request to GA4 API for {PropertyId}: {@Request}", propertyId, new
                    {
                        Property = runReportRequest.Property,
                        DateRanges = runReportRequest.DateRanges.Select(d => new { d.StartDate, d.EndDate }),
                        Dimensions = runReportRequest.Dimensions.Select(d => d.Name),
                        Metrics = runReportRequest.Metrics.Select(m => m.Name),
                        Filter = runReportRequest.DimensionFilter,
                        Limit = runReportRequest.Limit
                    });

                    var response = await client.RunReportAsync(runReportRequest);
                    _logger.LogInformation("Successfully received response from GA4 API for {PropertyId} with {RowCount} rows", propertyId, response.RowCount);

                     // Process response and calculate metrics (logic copied from old method)
                    var resultRows = response.Rows.Select(row =>
                    {
                        var metricMap = new Dictionary<string, double>();
                        for (int i = 0; i < response.MetricHeaders.Count; i++)
                        {
                            if (double.TryParse(row.MetricValues[i].Value, out var metricValue))
                            {
                                metricMap[response.MetricHeaders[i].Name] = metricValue;
                            }
                            else
                            {
                                metricMap[response.MetricHeaders[i].Name] = 0;
                            }
                        }
                        metricMap.TryGetValue("totalUsers", out var totalUsers);
                        metricMap.TryGetValue("newUsers", out var newUsers);
                        metricMap.TryGetValue("activeUsers", out var activeUsers);
                        metricMap.TryGetValue("userEngagementDuration", out var engagementDuration);
                        double percentageNewUsers = (totalUsers > 0) ? (newUsers / totalUsers) * 100 : 0;
                        double avgSessionDuration = (activeUsers > 0) ? engagementDuration / activeUsers : 0;

                        return new AnalyticsRow
                        {
                            DimensionValues = row.DimensionValues.Select(d => AnalyticsDimensionValue.FromGoogleDimensionValue(d)).ToList(),
                            MetricValues = row.MetricValues.Select(m => AnalyticsMetricValue.FromGoogleMetricValue(m)).ToList(),
                            PercentageOfNewUsers = percentageNewUsers,
                            AverageSessionDurationPerUser = avgSessionDuration
                        };
                    }).ToList();

                    // Create result specific to this property
                    var singleResult = new AnalyticsQueryResponse
                    {
                        PropertyId = propertyId, // Set the property ID
                        RowCount = response.RowCount,
                        // Assuming DimensionHeaders and MetricHeaders are consistent across properties for the same request structure
                        // Explicitly qualify our model types to resolve ambiguity
                        DimensionHeaders = response.DimensionHeaders?.Select(h => new ActionableIQ.Core.Models.Analytics.DimensionHeader { Name = h.Name }).ToList() ?? new List<ActionableIQ.Core.Models.Analytics.DimensionHeader>(),
                        MetricHeaders = response.MetricHeaders?.Select(h => new ActionableIQ.Core.Models.Analytics.MetricHeader { Name = h.Name, Type = h.Type.ToString() }).ToList() ?? new List<ActionableIQ.Core.Models.Analytics.MetricHeader>(),
                        Rows = resultRows
                        // TODO: Add metadata if needed
                    };
                    resultsBag.Add(singleResult);
                     _logger.LogInformation("Successfully processed result for property: {PropertyId}", propertyId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error running analytics query for property {PropertyId}. Error details: {Message}", propertyId, ex.Message);
                    errorsBag.Add(new AnalyticsQueryError { PropertyId = propertyId, ErrorMessage = ex.Message });
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);

            combinedResponse.Results = resultsBag.ToList();
            combinedResponse.Errors = errorsBag.ToList();

            _logger.LogInformation("Finished multi-property query. Successes: {SuccessCount}, Failures: {FailureCount}", combinedResponse.Results.Count, combinedResponse.Errors.Count);
            return combinedResponse;
        }

        public async Task<IEnumerable<AnalyticsQueryResponse>> RunBatchQueryAsync(IEnumerable<AnalyticsQueryRequest> requests)
        {
            var results = new List<AnalyticsQueryResponse>();
            foreach (var request in requests)
            {
                // TODO: Re-evaluate RunBatchQueryAsync. RunQueryAsync now handles multiple properties.
                // This line causes a build error because RunQueryAsync returns AnalyticsMultiQueryResponse now.
                // results.Add(await RunQueryAsync(request)); 
                _logger.LogWarning("RunBatchQueryAsync is likely deprecated due to changes in RunQueryAsync handling multiple properties. Skipping request for property {PropertyId}", request.PropertyIds.FirstOrDefault() ?? "N/A");
            }
            return results;
        }

        public async Task<IEnumerable<AnalyticsProperty>> GetPropertiesAsync()
        {
            _logger.LogInformation("Attempting to fetch properties via Admin Service.");
            var properties = await _adminService.GetAllPropertiesAsync();
            _logger.LogInformation("Successfully fetched {Count} properties.", properties?.Count() ?? 0);
            return properties;
        }

        private IEnumerable<AnalyticsProperty> GenerateMockProperties()
        {
            return new List<AnalyticsProperty>
            {
                new AnalyticsProperty
                {
                    PropertyId = "123456789",
                    DisplayName = "Mock Property 1",
                    CreateTime = DateTime.UtcNow.AddDays(-30),
                    UpdateTime = DateTime.UtcNow,
                    TimeZone = "America/New_York",
                    CurrencyCode = "USD"
                },
                new AnalyticsProperty
                {
                    PropertyId = "987654321",
                    DisplayName = "Mock Property 2",
                    CreateTime = DateTime.UtcNow.AddDays(-15),
                    UpdateTime = DateTime.UtcNow,
                    TimeZone = "America/Los_Angeles",
                    CurrencyCode = "USD"
                }
            };
        }

        private AnalyticsQueryResponse GenerateMockResponse(AnalyticsQueryRequest request)
        {
            var random = new Random();
            var rows = new List<AnalyticsRow>();

            for (int i = 0; i < 10; i++)
            {
                var dimensionValues = request.Dimensions.Select(d => new AnalyticsDimensionValue
                {
                    Value = $"Dimension {d} Value {i + 1}"
                }).ToList();

                var metricValues = request.Metrics.Select(m => new AnalyticsMetricValue
                {
                    Value = random.Next(1000, 10000).ToString()
                }).ToList();

                rows.Add(new AnalyticsRow
                {
                    DimensionValues = dimensionValues,
                    MetricValues = metricValues
                });
            }

            return new AnalyticsQueryResponse
            {
                RowCount = rows.Count,
                Rows = rows
            };
        }

        private RunReportRequest BuildAnalyticsRequest(string propertyId, string sourceMedium, DateTime startDate, DateTime endDate, int topStatesCount)
        {
            // Split source/medium
            var parts = sourceMedium.Split(new[] { '/' }, StringSplitOptions.TrimEntries);
            if (parts.Length != 2) // Add validation for source/medium format
            {
                throw new ArgumentException("Invalid SourceMediumFilter format. Expected 'source / medium'.");
            }
            var source = parts[0];
            var medium = parts[1];

            var request = new RunReportRequest
            {
                Property = $"properties/{propertyId}",
                DateRanges =
                {
                    new GoogleDateRange // Using alias from top of file
                    {
                        StartDate = startDate.ToString("yyyy-MM-dd"),
                        EndDate = endDate.ToString("yyyy-MM-dd")
                    }
                },
                Dimensions =
                {
                    new Dimension { Name = "region" },  // For state/region info
                    new Dimension { Name = "firstUserSourceMedium" }  // Using first user source/medium
                },
                Metrics =
                {
                    new Metric { Name = "activeUsers" },
                    new Metric { Name = "newUsers" },
                    new Metric { Name = "totalUsers" },
                    new Metric { Name = "userEngagementDuration" },
                },
                DimensionFilter = new Google.Analytics.Data.V1Beta.FilterExpression
                {
                    AndGroup = new Google.Analytics.Data.V1Beta.FilterExpressionList
                    {
                        Expressions =
                        {
                            new Google.Analytics.Data.V1Beta.FilterExpression
                            {
                                Filter = new Google.Analytics.Data.V1Beta.Filter
                                {
                                    FieldName = "firstUserSourceMedium",
                                    StringFilter = new Google.Analytics.Data.V1Beta.Filter.Types.StringFilter 
                                    {
                                        MatchType = Google.Analytics.Data.V1Beta.Filter.Types.StringFilter.Types.MatchType.Exact,
                                        Value = $"{source} / {medium}"
                                    }
                                }
                            }
                        }
                    }
                },
                OrderBys =
                {
                    new OrderBy
                    {
                        Metric = new OrderBy.Types.MetricOrderBy { MetricName = "totalUsers" },
                        Desc = true  // Highest to lowest
                    }
                },
                Limit = topStatesCount
            };

            return request;
        }
    }
} 