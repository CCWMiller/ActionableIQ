using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using Google.Analytics.Data.V1Beta;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models.Analytics;
using ActionableIQ.Core.Extensions;
using CoreDateRange = ActionableIQ.Core.Models.Analytics.DateRange;
using GoogleDateRange = Google.Analytics.Data.V1Beta.DateRange;
using CoreFilterExpression = ActionableIQ.Core.Models.Analytics.FilterExpression;
using GoogleFilterExpression = Google.Analytics.Data.V1Beta.FilterExpression;
using AnalyticsOptions = ActionableIQ.Core.Models.Analytics.GoogleAnalyticsOptions;
using System.Text;

namespace ActionableIQ.Core.Services
{
    /// <summary>
    /// Service for generating Google Analytics reports with regional data
    /// </summary>
    public class GoogleAnalyticsReportService : IGoogleAnalyticsReportService, IDisposable
    {
        private readonly ILogger<GoogleAnalyticsReportService> _logger;
        private readonly BetaAnalyticsDataClient _client;
        private readonly IGoogleAnalyticsAdminService _adminService;
        private readonly int _maxConcurrentRequests;
        private readonly System.Threading.SemaphoreSlim _semaphore;

        public GoogleAnalyticsReportService(
            ILogger<GoogleAnalyticsReportService> logger,
            BetaAnalyticsDataClient client,
            IGoogleAnalyticsAdminService adminService,
            IOptions<AnalyticsOptions> options)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _client = client ?? throw new ArgumentNullException(nameof(client));
            _adminService = adminService ?? throw new ArgumentNullException(nameof(adminService));
            _maxConcurrentRequests = options?.Value?.MaxConcurrentRequests ?? 5;
            _semaphore = new System.Threading.SemaphoreSlim(_maxConcurrentRequests);
        }

        /// <summary>
        /// Generates a complete analytics report for the given property IDs
        /// </summary>
        public async Task<IDictionary<string, PropertyReport>> GenerateReportsAsync(ReportGenerationRequest request)
        {
            try
            {
                _logger.LogInformation("Starting report generation for {Count} properties", request.PropertyIds.Count);

                // Get property details first
                var propertyDetails = await _adminService.GetPropertiesDetailsAsync(request.PropertyIds);
                
                // Generate reports in parallel
                var reports = new Dictionary<string, PropertyReport>();
                var tasks = new List<Task>();

                foreach (var propertyId in request.PropertyIds)
                {
                    if (!propertyDetails.ContainsKey(propertyId))
                    {
                        _logger.LogWarning("Skipping property {PropertyId} as details could not be retrieved", propertyId);
                        continue;
                    }

                    tasks.Add(ProcessPropertyReportAsync(propertyId, propertyDetails[propertyId], request, reports));
                }

                await Task.WhenAll(tasks);

                _logger.LogInformation("Completed report generation for {Count} properties", reports.Count);
                return reports;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating reports for {Count} properties", request.PropertyIds.Count);
                throw;
            }
        }

        private async Task ProcessPropertyReportAsync(
            string propertyId,
            AnalyticsProperty propertyDetails,
            ReportGenerationRequest request,
            IDictionary<string, PropertyReport> reports)
        {
            try
            {
                await _semaphore.WaitAsync();

                var (source, medium) = request.GetSourceMedium();
                var gaDateRange = CreateDateRange(request);

                var baseRequest = new RunReportRequest
                {
                    Property = $"properties/{propertyId}",
                    DateRanges = { gaDateRange },
                    DimensionFilter = new GoogleFilterExpression
                    {
                        AndGroup = new FilterExpressionList
                        {
                            Expressions =
                            {
                                CreateSourceFilter(source),
                                CreateMediumFilter(medium)
                            }
                        }
                    }
                };

                // Get total metrics
                var totalMetrics = await GetTotalMetricsAsync(baseRequest);

                // Get regional data
                var regionData = await GetRegionalDataAsync(baseRequest, request.TopStatesCount);

                var report = new PropertyReport
                {
                    PropertyId = propertyId,
                    PropertyName = propertyDetails.DisplayName,
                    DateRange = new CoreDateRange 
                    { 
                        StartDate = request.StartDate.ToString("yyyy-MM-dd"),
                        EndDate = request.EndDate.ToString("yyyy-MM-dd")
                    },
                    TotalUsers = totalMetrics.TotalUsers,
                    TotalNewUsers = totalMetrics.NewUsers,
                    TotalActiveUsers = totalMetrics.ActiveUsers,
                    TotalAverageSessionDurationPerUser = totalMetrics.UserEngagementDuration / 1000.0 / (double)totalMetrics.ActiveUsers, // Convert ms to seconds
                    TotalPercentageOfNewUsers = (totalMetrics.NewUsers / (double)totalMetrics.TotalUsers) * 100,
                    Regions = regionData
                };

                lock (reports)
                {
                    reports[propertyId] = report;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing report for property {PropertyId}", propertyId);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        private async Task<(long TotalUsers, long NewUsers, long ActiveUsers, long UserEngagementDuration)> GetTotalMetricsAsync(RunReportRequest baseRequest)
        {
            var request = baseRequest.Clone();
            request.Metrics.AddRange(new[]
            {
                new Metric { Name = "totalUsers" },
                new Metric { Name = "newUsers" },
                new Metric { Name = "activeUsers" },
                new Metric { Name = "userEngagementDuration" }
            });

            _logger.LogInformation(
                "Sending GA4 metrics request for property {PropertyId} with filter: Source={Source}, Medium={Medium}",
                request.Property,
                request.DimensionFilter?.AndGroup?.Expressions?.FirstOrDefault()?.Filter?.StringFilter?.Value ?? "null",
                request.DimensionFilter?.AndGroup?.Expressions?.Skip(1)?.FirstOrDefault()?.Filter?.StringFilter?.Value ?? "null");

            var response = await _client.RunReportAsync(request);
            
            var firstRowMetrics = response.Rows?.FirstOrDefault()?.MetricValues?.Select(m => m.Value).ToList() ?? new List<string>();
            _logger.LogInformation(
                "Received GA4 response: RowCount={RowCount}, HasRows={HasRows}, FirstRowMetrics={Metrics}",
                response.RowCount,
                response.Rows?.Any() ?? false,
                string.Join(", ", firstRowMetrics));

            var row = response.Rows?.FirstOrDefault();
            if (row == null)
            {
                return (0, 0, 0, 0);
            }

            return (
                long.Parse(row.MetricValues[0].Value),
                long.Parse(row.MetricValues[1].Value),
                long.Parse(row.MetricValues[2].Value),
                long.Parse(row.MetricValues[3].Value)
            );
        }

        private async Task<List<RegionData>> GetRegionalDataAsync(RunReportRequest baseRequest, int topStatesCount)
        {
            var request = baseRequest.Clone();
            request.Dimensions.Add(new Dimension { Name = "region" });
            request.Metrics.AddRange(new[]
            {
                new Metric { Name = "totalUsers" },
                new Metric { Name = "newUsers" },
                new Metric { Name = "activeUsers" },
                new Metric { Name = "userEngagementDuration" }
            });
            request.OrderBys.Add(new OrderBy
            {
                Metric = new OrderBy.Types.MetricOrderBy { MetricName = "totalUsers" },
                Desc = true
            });
            request.Limit = topStatesCount;

            _logger.LogInformation("Sending GA4 regional data request for property {PropertyId} with filter: Source={Source}, Medium={Medium}",
                request.Property,
                request.DimensionFilter?.AndGroup?.Expressions?.FirstOrDefault()?.Filter?.StringFilter?.Value,
                request.DimensionFilter?.AndGroup?.Expressions?.Skip(1)?.FirstOrDefault()?.Filter?.StringFilter?.Value);

            var response = await _client.RunReportAsync(request);

            _logger.LogInformation("Received GA4 regional response: RowCount={RowCount}, HasRows={HasRows}, Regions={Regions}",
                response.RowCount,
                response.Rows?.Any() ?? false,
                response.Rows?.Select(r => r.DimensionValues[0].Value)?.ToList() ?? new List<string>());

            var regions = new List<RegionData>();

            foreach (var row in response.Rows)
            {
                var totalUsers = long.Parse(row.MetricValues[0].Value);
                var newUsers = long.Parse(row.MetricValues[1].Value);
                var activeUsers = long.Parse(row.MetricValues[2].Value);
                var userEngagementDuration = long.Parse(row.MetricValues[3].Value);

                regions.Add(new RegionData
                {
                    State = row.DimensionValues[0].Value,
                    Users = totalUsers,
                    NewUsers = newUsers,
                    ActiveUsers = activeUsers,
                    AverageSessionDurationPerUser = userEngagementDuration / 1000.0 / (double)activeUsers, // Convert ms to seconds
                    PercentageOfNewUsers = (newUsers / (double)totalUsers) * 100
                });
            }

            return regions;
        }

        private GoogleDateRange ConvertToGoogleDateRange(CoreDateRange dateRange)
        {
            return new GoogleDateRange
            {
                StartDate = dateRange.StartDate,
                EndDate = dateRange.EndDate
            };
        }

        private GoogleDateRange CreateDateRange(ReportGenerationRequest request)
        {
            return new GoogleDateRange
            {
                StartDate = request.StartDate.ToString("yyyy-MM-dd"),
                EndDate = request.EndDate.ToString("yyyy-MM-dd")
            };
        }

        private GoogleFilterExpression CreateSourceFilter(string source)
        {
            return new GoogleFilterExpression
            {
                Filter = new Filter
                {
                    FieldName = "sessionSource",
                    StringFilter = new Filter.Types.StringFilter
                    {
                        Value = source,
                        MatchType = Filter.Types.StringFilter.Types.MatchType.Exact
                    }
                }
            };
        }

        private GoogleFilterExpression CreateMediumFilter(string medium)
        {
            return new GoogleFilterExpression
            {
                Filter = new Filter
                {
                    FieldName = "sessionMedium",
                    StringFilter = new Filter.Types.StringFilter
                    {
                        Value = medium,
                        MatchType = Filter.Types.StringFilter.Types.MatchType.Exact
                    }
                }
            };
        }

        // Helper function for proper CSV escaping
        private static string CsvEscape(string? value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }
            // If the value contains a comma, double quote, or newline, enclose it in double quotes
            // and escape any existing double quotes by doubling them.
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            {
                // Replace standalone quotes with double quotes, then wrap the whole string in quotes.
                var escapedValue = value.Replace("\"", "\"\""); // Correct: Replace one quote with two quotes
                return $"\"{escapedValue}\""; // Correct: Wrap the result in quotes
            }
            return value;
        }

        /// <summary>
        /// Generates a CSV report based on the provided parameters
        /// </summary>
        /// <param name="parameters">The parameters for the report</param>
        /// <param name="propertyIds">The list of property IDs to query</param>
        /// <returns>CSV data as a string</returns>
        public async Task<string> GenerateReportCsvAsync(ReportParameters parameters, IEnumerable<string> propertyIds)
        {
            if (propertyIds == null || !propertyIds.Any())
            {
                 _logger.LogWarning("GenerateReportCsvAsync called with no property IDs.");
                throw new ArgumentException("Property IDs are required to generate the CSV report.", nameof(propertyIds));
            }

            try
            {
                _logger.LogInformation("Generating CSV report for {PropertyCount} properties with parameters: {Parameters}",
                    propertyIds.Count(),
                    System.Text.Json.JsonSerializer.Serialize(parameters));

                var csvBuilder = new StringBuilder();

                // Define dimensions and metrics based on parameters
                var dimensions = parameters.Dimensions.Select(d => new Dimension { Name = d }).ToList();
                var metrics = parameters.Metrics.Select(m => new Metric { Name = m }).ToList();
                var dateRanges = new List<GoogleDateRange>
                {
                    new GoogleDateRange
                    {
                        StartDate = parameters.StartDate,
                        EndDate = parameters.EndDate
                    }
                };

                // --- Add headers (Including PropertyID and PropertyName) ---
                var headers = new List<string> { "PropertyID", "PropertyName" };
                headers.AddRange(parameters.Dimensions);
                headers.AddRange(parameters.Metrics);
                csvBuilder.AppendLine(string.Join(",", headers.Select(CsvEscape))); // Use CsvEscape

                // --- Fetch data for each property ---
                // Consider parallelizing this similar to GenerateReportsAsync if performance is critical and dependencies allow
                foreach (var propertyIdRaw in propertyIds)
                {
                    // Ensure propertyId is just the number, construct full name later
                    string propertyId = propertyIdRaw.Contains('/') ? propertyIdRaw.Split('/').Last() : propertyIdRaw;
                    string propertyFullName = $"properties/{propertyId}";

                    string propertyName = propertyId; // Default name is the ID
                    try
                    {
                        // Attempt to get the display name (optional, but good for CSV)
                        var details = await _adminService.GetPropertyDetailsAsync(propertyFullName);
                        propertyName = details?.DisplayName ?? propertyId;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not retrieve display name for property {PropertyId}. Using ID instead.", propertyId);
                    }

                    try
                    {
                        var request = new RunReportRequest
                        {
                            Property = propertyFullName, // Use full name for the request
                            Dimensions = { dimensions },
                            Metrics = { metrics },
                            DateRanges = { dateRanges },
                            Limit = parameters.Limit ?? 10000 // Use limit from parameters or a reasonable default
                            // TODO: Add parameters.Filters conversion if needed
                            // Example: if (!string.IsNullOrEmpty(parameters.Filters)) { request.DimensionFilter = ConvertToGoogleFilter(parameters.Filters); }
                        };

                        _logger.LogInformation("Executing RunReportAsync for CSV generation for property {PropertyId}", propertyId);
                        var response = await _client.RunReportAsync(request);
                        _logger.LogInformation("Received {RowCount} rows for property {PropertyId}", response.RowCount, propertyId);

                        // --- Add data rows to CSV ---
                        foreach (var row in response.Rows)
                        {
                            var rowValues = new List<string>
                            {
                                CsvEscape(propertyId),      // Use helper with just the ID
                                CsvEscape(propertyName)     // Use helper
                            };
                            rowValues.AddRange(row.DimensionValues.Select(dv => CsvEscape(dv.Value))); // Use helper
                            rowValues.AddRange(row.MetricValues.Select(mv => CsvEscape(mv.Value)));   // Use helper
                            csvBuilder.AppendLine(string.Join(",", rowValues));
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error fetching or processing data for property {PropertyId} during CSV generation. Skipping property.", propertyId);
                        // Optionally add an error row to the CSV
                        csvBuilder.AppendLine(string.Join(",", new[] { CsvEscape(propertyId), CsvEscape(propertyName), CsvEscape($"ERROR fetching data: {ex.Message}") }.Concat(Enumerable.Repeat("", headers.Count - 3)).Select(CsvEscape)));
                    }
                }

                _logger.LogInformation("Successfully generated CSV report string (Length: {Length})", csvBuilder.Length);
                return csvBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating CSV report wrapper");
                throw; // Re-throw exception to be handled by the controller
            }
        }

        public void Dispose()
        {
            _semaphore?.Dispose();
        }
    }
} 