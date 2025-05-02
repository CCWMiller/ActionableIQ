using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Google.Analytics.Data.V1Beta;
using Microsoft.Extensions.Options;
using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models.Analytics;
using ActionableIQ.Core.Models.Analytics.Metrics;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Google.Apis.Auth.OAuth2;
using System.Text.Json;
using System.Text;
using ActionableIQ.Core.Extensions;
using CoreDateRange = ActionableIQ.Core.Models.Analytics.DateRange;
using GoogleDateRange = Google.Analytics.Data.V1Beta.DateRange;

namespace ActionableIQ.Core.Services
{
    public class GoogleAnalyticsDataService : IGoogleAnalyticsDataService
    {
        private readonly ILogger<GoogleAnalyticsDataService> _logger;
        private readonly GoogleAnalyticsOptions _options;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private BetaAnalyticsDataClient _client;
        private DateTime _tokenExpiry = DateTime.MinValue;

        public GoogleAnalyticsDataService(
            ILogger<GoogleAnalyticsDataService> logger,
            IOptions<GoogleAnalyticsOptions> options,
            IHttpContextAccessor httpContextAccessor)
        {
            _logger = logger;
            _options = options.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Gets or creates an authenticated client
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

                // Create a new client with the OAuth2 token
                var credential = GoogleCredential.FromAccessToken(accessToken);
                var builder = new BetaAnalyticsDataClientBuilder
                {
                    Credential = credential
                };

                _client = await builder.BuildAsync();

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

        public async Task<IEnumerable<PageViewMetric>> GetPageViewMetricsAsync(string propertyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                if (_options.UseMockData)
                {
                    return GenerateMockPageViewMetrics(startDate, endDate);
                }

                var client = await GetClientAsync();
                var request = new RunReportRequest
                {
                    Property = $"properties/{propertyId}",
                    DateRanges = { new GoogleDateRange { StartDate = startDate.ToString("yyyy-MM-dd"), EndDate = endDate.ToString("yyyy-MM-dd") } },
                    Dimensions = { new Dimension { Name = "date" }, new Dimension { Name = "pagePath" } }
                };
                request.Metrics.Add(new Metric { Name = "screenPageViews" });
                request.Metrics.Add(new Metric { Name = "averageSessionDuration" });

                var response = await client.RunReportAsync(request);
                var metrics = new List<PageViewMetric>();

                foreach (var row in response.Rows)
                {
                    metrics.Add(new PageViewMetric
                    {
                        Date = DateTime.ParseExact(row.DimensionValues[0].Value, "yyyyMMdd", null),
                        PagePath = row.DimensionValues[1].Value,
                        PageViews = int.Parse(row.MetricValues[0].Value),
                        AverageTimeOnPage = double.Parse(row.MetricValues[1].Value)
                    });
                }

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting page view metrics for property {PropertyId}", propertyId);
                throw;
            }
        }

        public async Task<IEnumerable<UserMetric>> GetUserMetricsAsync(string propertyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                if (_options.UseMockData)
                {
                    return GenerateMockUserMetrics(startDate, endDate);
                }

                var client = await GetClientAsync();
                var request = new RunReportRequest
                {
                    Property = $"properties/{propertyId}",
                    DateRanges = { new GoogleDateRange { StartDate = startDate.ToString("yyyy-MM-dd"), EndDate = endDate.ToString("yyyy-MM-dd") } },
                    Dimensions = { new Dimension { Name = "date" } }
                };
                request.Metrics.Add(new Metric { Name = "totalUsers" });
                request.Metrics.Add(new Metric { Name = "newUsers" });
                request.Metrics.Add(new Metric { Name = "averageSessionDuration" });
                request.Metrics.Add(new Metric { Name = "sessionsPerUser" });

                var response = await client.RunReportAsync(request);
                var metrics = new List<UserMetric>();

                foreach (var row in response.Rows)
                {
                    var totalUsers = int.Parse(row.MetricValues[0].Value);
                    var newUsers = int.Parse(row.MetricValues[1].Value);

                    metrics.Add(new UserMetric
                    {
                        Date = DateTime.ParseExact(row.DimensionValues[0].Value, "yyyyMMdd", null),
                        TotalUsers = totalUsers,
                        NewUsers = newUsers,
                        ReturningUsers = totalUsers - newUsers,
                        AverageSessionDuration = double.Parse(row.MetricValues[2].Value),
                        SessionsPerUser = double.Parse(row.MetricValues[3].Value)
                    });
                }

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user metrics for property {PropertyId}", propertyId);
                throw;
            }
        }

        public async Task<IEnumerable<ConversionMetric>> GetConversionMetricsAsync(string propertyId, DateTime startDate, DateTime endDate)
        {
            try
            {
                if (_options.UseMockData)
                {
                    return GenerateMockConversionMetrics(startDate, endDate);
                }

                var client = await GetClientAsync();
                var request = new RunReportRequest
                {
                    Property = $"properties/{propertyId}",
                    DateRanges = { new GoogleDateRange { StartDate = startDate.ToString("yyyy-MM-dd"), EndDate = endDate.ToString("yyyy-MM-dd") } },
                    Dimensions = { new Dimension { Name = "date" }, new Dimension { Name = "eventName" } }
                };
                request.Metrics.Add(new Metric { Name = "conversions" });
                request.Metrics.Add(new Metric { Name = "eventValue" });

                var response = await client.RunReportAsync(request);
                var metrics = new List<ConversionMetric>();

                foreach (var row in response.Rows)
                {
                    metrics.Add(new ConversionMetric
                    {
                        Date = DateTime.ParseExact(row.DimensionValues[0].Value, "yyyyMMdd", null),
                        ConversionName = row.DimensionValues[1].Value,
                        Conversions = int.Parse(row.MetricValues[0].Value),
                        Value = double.Parse(row.MetricValues[1].Value)
                    });
                }

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversion metrics for property {PropertyId}", propertyId);
                throw;
            }
        }

        public async Task<IEnumerable<CustomMetric>> GetCustomMetricsAsync(string propertyId, DateTime startDate, DateTime endDate, IEnumerable<string> metricNames)
        {
            try
            {
                if (_options.UseMockData)
                {
                    return GenerateMockCustomMetrics(startDate, endDate, metricNames.ToList());
                }

                var client = await GetClientAsync();
                var request = new RunReportRequest
                {
                    Property = $"properties/{propertyId}",
                    DateRanges = { new GoogleDateRange { StartDate = startDate.ToString("yyyy-MM-dd"), EndDate = endDate.ToString("yyyy-MM-dd") } },
                    Dimensions = { new Dimension { Name = "date" } }
                };

                foreach (var metricName in metricNames)
                {
                    request.Metrics.Add(new Metric { Name = metricName });
                }

                var response = await client.RunReportAsync(request);
                var metrics = new List<CustomMetric>();

                foreach (var row in response.Rows)
                {
                    var metric = new CustomMetric
                    {
                        Date = DateTime.ParseExact(row.DimensionValues[0].Value, "yyyyMMdd", null),
                        MetricName = metricNames.First(),
                        Value = double.Parse(row.MetricValues[0].Value),
                        Dimension = "date"
                    };

                    metrics.Add(metric);
                }

                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting custom metrics for property {PropertyId}", propertyId);
                throw;
            }
        }

        private List<PageViewMetric> GenerateMockPageViewMetrics(DateTime startDate, DateTime endDate)
        {
            var metrics = new List<PageViewMetric>();
            var random = new Random();
            var currentDate = startDate;

            while (currentDate <= endDate)
            {
                metrics.Add(new PageViewMetric
                {
                    Date = currentDate,
                    PagePath = $"/page-{random.Next(1, 10)}",
                    PageViews = random.Next(100, 1000),
                    AverageTimeOnPage = random.NextDouble() * 300
                });

                currentDate = currentDate.AddDays(1);
            }

            return metrics;
        }

        private List<UserMetric> GenerateMockUserMetrics(DateTime startDate, DateTime endDate)
        {
            var metrics = new List<UserMetric>();
            var random = new Random();
            var currentDate = startDate;

            while (currentDate <= endDate)
            {
                var totalUsers = random.Next(500, 2000);
                var newUsers = random.Next(100, totalUsers);

                metrics.Add(new UserMetric
                {
                    Date = currentDate,
                    TotalUsers = totalUsers,
                    NewUsers = newUsers,
                    ReturningUsers = totalUsers - newUsers,
                    AverageSessionDuration = random.NextDouble() * 600, // 0-600 seconds
                    SessionsPerUser = 1 + random.NextDouble() * 3 // 1-4 sessions
                });

                currentDate = currentDate.AddDays(1);
            }

            return metrics;
        }

        private List<ConversionMetric> GenerateMockConversionMetrics(DateTime startDate, DateTime endDate)
        {
            var metrics = new List<ConversionMetric>();
            var random = new Random();
            var currentDate = startDate;

            while (currentDate <= endDate)
            {
                metrics.Add(new ConversionMetric
                {
                    Date = currentDate,
                    ConversionName = $"Conversion-{random.Next(1, 10)}",
                    Conversions = random.Next(10, 100),
                    ConversionRate = random.NextDouble() * 0.5, // 0-50% conversion rate
                    Value = random.NextDouble() * 1000 // 0-1000 value
                });

                currentDate = currentDate.AddDays(1);
            }

            return metrics;
        }

        private List<CustomMetric> GenerateMockCustomMetrics(DateTime startDate, DateTime endDate, List<string> metricNames)
        {
            var metrics = new List<CustomMetric>();
            var random = new Random();
            var currentDate = startDate;

            while (currentDate <= endDate)
            {
                var metric = new CustomMetric
                {
                    Date = currentDate,
                    MetricName = metricNames.First(),
                    Value = random.NextDouble() * 1000,
                    Dimension = "date"
                };

                metrics.Add(metric);
                currentDate = currentDate.AddDays(1);
            }

            return metrics;
        }
    }
} 