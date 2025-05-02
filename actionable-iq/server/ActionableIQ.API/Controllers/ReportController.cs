using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;

namespace ActionableIQ.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<ReportController> _logger;

        public ReportController(
            IEmailService emailService,
            ILogger<ReportController> logger)
        {
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Sends a pre-generated analytics report CSV to specified email addresses
        /// </summary>
        /// <param name="request">The email report request containing recipients, name, and CSV data</param>
        /// <returns>Success or error response</returns>
        [HttpPost("email")]
        public async Task<IActionResult> EmailReport([FromBody] EmailCsvRequest request)
        {
            _logger.LogInformation("EmailReport action entered for pre-generated CSV.");
            try
            {
                // Log received request details
                _logger.LogInformation("Received EmailCsvRequest for ReportName: {ReportName}, Recipient Count: {RecipientCount}, CsvData Length: {CsvLength}", 
                                     request?.ReportName ?? "N/A", 
                                     request?.Recipients?.Count ?? 0,
                                     request?.CsvData?.Length ?? 0);

                // Validate request using model validation attributes
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("ModelState is invalid: {ModelStateErrors}", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                    return BadRequest(ModelState);
                }

                // Use the request object directly
                var recipients = request.Recipients;
                var reportName = request.ReportName;
                string csvData = request.CsvData; // Get CSV string from request

                // Convert CSV string to bytes
                 _logger.LogInformation("Converting provided CSV data to bytes for report: {ReportName}", reportName);
                 byte[] reportData = System.Text.Encoding.UTF8.GetBytes(csvData);
                
                 // Basic check on byte array (though model validation checks for empty string already)
                 if (reportData.Length == 0)
                 { 
                     _logger.LogWarning("CSV data resulted in empty byte array for report: {ReportName}", reportName);
                     // This case might be redundant due to [Required] on CsvData string
                     return BadRequest(new { message = "Provided CSV data is empty or invalid." });
                 }
                _logger.LogInformation("Successfully converted CSV data (Bytes: {ByteLength}) for: {ReportName}", reportData.Length, reportName);


                // Generate a filename
                string fileName = $"analytics_report_{DateTime.UtcNow:yyyyMMdd}";
                _logger.LogInformation("Attempting to send email via EmailService for: {ReportName} to {RecipientCount} recipients with filename {FileName}", 
                                     reportName, recipients.Count, fileName);

                // Send email using the provided data
                var success = await _emailService.SendReportEmailAsync(
                    recipients,
                    reportName,
                    reportData, // Use the byte array from the request
                    fileName);

                if (success)
                {
                    _logger.LogInformation("EmailService reported success for: {ReportName}", reportName);
                    return Ok(new { message = "Report sent successfully" });
                }
                else
                {
                    _logger.LogWarning("EmailService reported failure for: {ReportName}", reportName);
                     return StatusCode(500, new { message = "Failed to send report email via service." });
                }

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception caught in EmailReport action for ReportName: {ReportName}", request?.ReportName ?? "N/A");
                return StatusCode(500, new { message = $"An error occurred: {ex.Message}" });
            }
        }
    }
} 