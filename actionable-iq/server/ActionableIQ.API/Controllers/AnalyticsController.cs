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
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(
            IGoogleAnalyticsAdminService adminService,
            IGoogleAnalyticsDataService dataService,
            IGoogleAnalyticsService analyticsService,
            ILogger<AnalyticsController> logger)
        {
            _adminService = adminService;
            _dataService = dataService;
            _analyticsService = analyticsService;
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
        public async Task<IActionResult> Query([FromBody] AnalyticsQueryRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Query request cannot be null");
                }

                // Validate PropertyIds
                if (request.PropertyIds == null || !request.PropertyIds.Any())
                {
                    _logger.LogWarning("Query request received with no Property IDs.");
                    return BadRequest("PropertyIds list cannot be null or empty.");
                }
                if (request.PropertyIds.Count > 50)
                {
                    _logger.LogWarning("Query request received with {Count} property IDs, exceeding the limit of 50.", request.PropertyIds.Count);
                    return BadRequest("Cannot query more than 50 properties at once.");
                }

                // Basic validation for other required fields (Service layer also validates, but good practice here too)
                if (string.IsNullOrEmpty(request.SourceMediumFilter) ||
                    string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
                {
                    return BadRequest("Missing required parameters (SourceMediumFilter, StartDate, EndDate).");
                }

                _logger.LogInformation("Executing multi-property analytics query for {Count} properties.", request.PropertyIds.Count);
                
                // Call the updated service method
                var result = await _analyticsService.RunQueryAsync(request);

                // Log summary of results
                _logger.LogInformation("Multi-property query completed. Successes: {SuccessCount}, Failures: {FailureCount}", 
                    result.Results?.Count ?? 0, 
                    result.Errors?.Count ?? 0);

                // Optionally log details about errors
                if (result.Errors != null && result.Errors.Any())
                {
                    foreach (var error in result.Errors)
                    {
                        _logger.LogWarning("Query failed for Property ID {PropertyId}: {ErrorMessage}", error.PropertyId, error.ErrorMessage);
                    }
                }
                
                // Return the combined results and errors
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log the error with potentially multiple property IDs
                _logger.LogError(ex, "Error executing multi-property analytics query for properties [{PropertyIds}]", 
                    string.Join(", ", request?.PropertyIds ?? new List<string>()));
                return StatusCode(500, "Error executing analytics query");
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