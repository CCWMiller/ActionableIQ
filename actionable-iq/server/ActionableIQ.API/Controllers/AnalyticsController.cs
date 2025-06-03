using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models.Analytics.Metrics;
using ActionableIQ.Core.Models.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace ActionableIQ.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IGoogleAnalyticsAdminService _adminService;
        private readonly IGoogleAnalyticsDataService _dataService;
        private readonly IGoogleAnalyticsService _analyticsService;
        private readonly IGoogleAnalyticsReportService _googleAnalyticsReportService;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(
            IGoogleAnalyticsAdminService adminService,
            IGoogleAnalyticsDataService dataService,
            IGoogleAnalyticsService analyticsService,
            IGoogleAnalyticsReportService googleAnalyticsReportService,
            ILogger<AnalyticsController> logger)
        {
            _adminService = adminService;
            _dataService = dataService;
            _analyticsService = analyticsService;
            _googleAnalyticsReportService = googleAnalyticsReportService;
            _logger = logger;
        }

        [HttpGet("properties")]
        public async Task<IActionResult> GetProperties()
        {
            try
            {
                var properties = await _adminService.GetAllPropertiesAsync();
                return Ok(properties);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting properties");
                return StatusCode(500, "Error retrieving properties");
            }
        }

        [HttpGet("properties/{propertyId}/pageviews")]
        public async Task<IActionResult> GetPageViewMetrics(
            string propertyId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                var metrics = await _dataService.GetPageViewMetricsAsync(propertyId, startDate, endDate);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting page view metrics for property {PropertyId}", propertyId);
                return StatusCode(500, "Error retrieving page view metrics");
            }
        }

        [HttpGet("properties/{propertyId}/users")]
        public async Task<IActionResult> GetUserMetrics(
            string propertyId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                var metrics = await _dataService.GetUserMetricsAsync(propertyId, startDate, endDate);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user metrics for property {PropertyId}", propertyId);
                return StatusCode(500, "Error retrieving user metrics");
            }
        }

        [HttpGet("properties/{propertyId}/conversions")]
        public async Task<IActionResult> GetConversionMetrics(
            string propertyId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                var metrics = await _dataService.GetConversionMetricsAsync(propertyId, startDate, endDate);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting conversion metrics for property {PropertyId}", propertyId);
                return StatusCode(500, "Error retrieving conversion metrics");
            }
        }

        [HttpGet("properties/{propertyId}/custom")]
        public async Task<IActionResult> GetCustomMetrics(
            string propertyId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string[] metricNames)
        {
            try
            {
                var metrics = await _dataService.GetCustomMetricsAsync(propertyId, startDate, endDate, metricNames);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting custom metrics for property {PropertyId}", propertyId);
                return StatusCode(500, "Error retrieving custom metrics");
            }
        }

        [HttpPost("query")]
        public async Task<IActionResult> Query([FromBody] AnalyticsQueryRequest clientRequest)
        {
            try
            {
                if (clientRequest == null)
                {
                    return BadRequest("Query request cannot be null");
                }

                // Validate PropertyIds
                if (clientRequest.PropertyIds == null || !clientRequest.PropertyIds.Any())
                {
                    _logger.LogWarning("Query request received with no Property IDs.");
                    return BadRequest("PropertyIds list cannot be null or empty.");
                }
                if (clientRequest.PropertyIds.Count > 50)
                {
                    _logger.LogWarning("Query request received with {Count} property IDs, exceeding the limit of 50.", clientRequest.PropertyIds.Count);
                    return BadRequest("Cannot query more than 50 properties at once.");
                }

                // Basic validation for other required fields
                if (string.IsNullOrEmpty(clientRequest.SourceMediumFilter) ||
                    string.IsNullOrEmpty(clientRequest.StartDate) || string.IsNullOrEmpty(clientRequest.EndDate))
                {
                    // Consider making TopStatesCount required if it's essential for ReportGenerationRequest
                    return BadRequest("Missing required parameters (SourceMediumFilter, StartDate, EndDate).");
                }
                 if (!DateTime.TryParse(clientRequest.StartDate, out var startDate) || !DateTime.TryParse(clientRequest.EndDate, out var endDate))
                {
                    return BadRequest("Invalid date format for StartDate or EndDate. Use YYYY-MM-DD.");
                }

                _logger.LogInformation("Executing analytics report generation for {Count} properties.", clientRequest.PropertyIds.Count);

                var reportGenerationRequest = new ReportGenerationRequest
                {
                    PropertyIds = clientRequest.PropertyIds,
                    StartDate = startDate,
                    EndDate = endDate,
                    SourceMediumFilter = clientRequest.SourceMediumFilter,
                    TopStatesCount = (clientRequest.TopStatesCount > 0 ? clientRequest.TopStatesCount : 10),
                    Dimensions = clientRequest.Dimensions ?? new List<string>()
                };

                IDictionary<string, PropertyReport> propertyReportsDictionary = await _googleAnalyticsReportService.GenerateReportsAsync(reportGenerationRequest);

                var clientResults = new List<ActionableIQ.Core.Models.Analytics.AnalyticsQueryResponse>();
                var clientErrors = new List<ActionableIQ.Core.Models.Analytics.AnalyticsQueryError>();

                foreach (var kvp in propertyReportsDictionary)
                {
                    var propertyId = kvp.Key;
                    var report = kvp.Value;

                    if (report != null)
                    {
                        var clientQueryResponse = new ActionableIQ.Core.Models.Analytics.AnalyticsQueryResponse
                        {
                            PropertyId = report.PropertyId,
                            PropertyName = report.PropertyName,
                            DateRange = $"{report.DateRange.StartDate} - {report.DateRange.EndDate}",
                            TotalUsers = report.TotalUsers,
                            TotalNewUsers = report.TotalNewUsers,
                            TotalActiveUsers = report.TotalActiveUsers,
                            TotalAverageSessionDurationPerUser = report.TotalAverageSessionDurationPerUser,
                            TotalPercentageOfNewUsers = report.TotalPercentageOfNewUsers,

                            DimensionHeaders = report.DimensionHeaders ?? new List<ActionableIQ.Core.Models.Analytics.DimensionHeader>(),
                            MetricHeaders = new List<ActionableIQ.Core.Models.Analytics.MetricHeader>
                            {
                                new ActionableIQ.Core.Models.Analytics.MetricHeader { Name = "totalUsers", Type = "INTEGER" },
                                new ActionableIQ.Core.Models.Analytics.MetricHeader { Name = "newUsers", Type = "INTEGER" },
                                new ActionableIQ.Core.Models.Analytics.MetricHeader { Name = "activeUsers", Type = "INTEGER" },
                                new ActionableIQ.Core.Models.Analytics.MetricHeader { Name = "averageSessionDurationPerUser", Type = "DECIMAL" },
                            },
                            Rows = report.Regions?.Select(region => new ActionableIQ.Core.Models.Analytics.AnalyticsRow
                            {
                                DimensionValues = region.DimensionValues ?? new List<ActionableIQ.Core.Models.Analytics.AnalyticsDimensionValue>(),
                                MetricValues = new List<ActionableIQ.Core.Models.Analytics.AnalyticsMetricValue>
                                {
                                    new ActionableIQ.Core.Models.Analytics.AnalyticsMetricValue { Value = region.Users.ToString() },
                                    new ActionableIQ.Core.Models.Analytics.AnalyticsMetricValue { Value = region.NewUsers.ToString() },
                                    new ActionableIQ.Core.Models.Analytics.AnalyticsMetricValue { Value = region.ActiveUsers.ToString() },
                                    new ActionableIQ.Core.Models.Analytics.AnalyticsMetricValue { Value = region.AverageSessionDurationPerUser.ToString("F2", System.Globalization.CultureInfo.InvariantCulture) },
                                }
                            }).ToList() ?? new List<ActionableIQ.Core.Models.Analytics.AnalyticsRow>(),
                            RowCount = report.Regions?.Count ?? 0,
                            Metadata = new ActionableIQ.Core.Models.Analytics.QueryMetadata
                            {
                                DataLastRefreshed = DateTime.UtcNow,
                                QueryTime = DateTime.UtcNow
                            }
                        };
                        clientResults.Add(clientQueryResponse);
                    }
                    else
                    {
                        // Handle case where a report for a propertyId might be null (e.g., an error occurred for that specific property)
                        // The IGoogleAnalyticsReportService might handle this internally by not adding to dictionary or returning a specific error structure.
                        // For now, we'll assume GenerateReportsAsync filters out errored properties or we handle errors if the service returns them.
                         _logger.LogWarning("No report data returned from service for property ID {PropertyId}. It might have failed.", propertyId);
                        clientErrors.Add(new ActionableIQ.Core.Models.Analytics.AnalyticsQueryError { PropertyId = propertyId, ErrorMessage = "Failed to generate report for this property." });
                    }
                }
                
                var multiQueryResponse = new AnalyticsMultiQueryResponse
                {
                    Results = clientResults,
                    Errors = clientErrors
                };

                _logger.LogInformation("Analytics report generation completed. Successes: {SuccessCount}, Failures: {FailureCount}", 
                    multiQueryResponse.Results?.Count ?? 0, 
                    multiQueryResponse.Errors?.Count ?? 0);
                
                return Ok(multiQueryResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing analytics report generation for properties [{PropertyIds}]", 
                    string.Join(", ", clientRequest?.PropertyIds ?? new List<string>()));
                // Return a generic error or a more structured one if desired
                var errorResponse = new AnalyticsMultiQueryResponse {
                    Results = new List<ActionableIQ.Core.Models.Analytics.AnalyticsQueryResponse>(),
                    Errors = clientRequest?.PropertyIds.Select(pid => new ActionableIQ.Core.Models.Analytics.AnalyticsQueryError { PropertyId = pid, ErrorMessage = ex.Message }).ToList() 
                             ?? new List<ActionableIQ.Core.Models.Analytics.AnalyticsQueryError>{ new ActionableIQ.Core.Models.Analytics.AnalyticsQueryError { PropertyId = "N/A", ErrorMessage = ex.Message } }
                };
                return StatusCode(500, errorResponse);
            }
        }

        [HttpPost("batch-query")]
        public async Task<IActionResult> BatchQuery([FromBody] IEnumerable<AnalyticsQueryRequest> requests)
        {
            try
            {
                if (requests == null)
                {
                    return BadRequest("Batch query requests cannot be null");
                }

                _logger.LogInformation("Executing batch analytics query with {Count} requests", requests.Count());
                var results = await _analyticsService.RunBatchQueryAsync(requests);
                
                // Log summary of batch query results
                _logger.LogInformation("Batch query completed with {Count} result sets", results.Count());
                
                // Log details of each result
                int queryIndex = 0;
                foreach (var result in results)
                {
                    _logger.LogInformation("Result {Index} - RowCount: {RowCount}", queryIndex, result.RowCount);
                    
                    // Log headers
                    _logger.LogInformation("Result {Index} dimension headers: {Headers}", 
                        queryIndex, string.Join(", ", result.DimensionHeaders?.Select(h => h.Name) ?? Array.Empty<string>()));
                    _logger.LogInformation("Result {Index} metric headers: {Headers}", 
                        queryIndex, string.Join(", ", result.MetricHeaders?.Select(h => h.Name) ?? Array.Empty<string>()));
                    
                    // Log sample data (first row only for batch queries to avoid too much logging)
                    if (result.Rows != null && result.Rows.Any())
                    {
                        var firstRow = result.Rows.First();
                        var dimValues = string.Join(", ", firstRow.DimensionValues.Select(d => d.Value));
                        var metValues = string.Join(", ", firstRow.MetricValues.Select(m => m.Value));
                        _logger.LogInformation("Result {Index} first row: Dimensions [{Dimensions}], Metrics [{Metrics}]", 
                            queryIndex, dimValues, metValues);
                    }
                    else
                    {
                        _logger.LogWarning("Result {Index} returned zero rows of data", queryIndex);
                    }
                    
                    queryIndex++;
                }
                
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing batch analytics query");
                return StatusCode(500, "Error executing batch analytics query");
            }
        }
    }
} 