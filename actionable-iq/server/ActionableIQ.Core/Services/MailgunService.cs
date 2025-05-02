using ActionableIQ.Core.Interfaces;
using ActionableIQ.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestSharp;
using RestSharp.Authenticators;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Services
{
    /// <summary>
    /// Implementation of email service using Mailgun API
    /// </summary>
    public class MailgunService : IEmailService
    {
        private readonly ILogger<MailgunService> _logger;
        private readonly MailgunSettings _settings;
        private readonly RestClient _client;
        private static readonly Regex EmailRegex = new Regex(
            @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$", 
            RegexOptions.Compiled);

        /// <summary>
        /// Initializes a new instance of the <see cref="MailgunService"/> class.
        /// </summary>
        /// <param name="options">Mailgun settings</param>
        /// <param name="logger">Logger</param>
        public MailgunService(IOptions<MailgunSettings> options, ILogger<MailgunService> logger)
        {
            _settings = options.Value ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            if (string.IsNullOrEmpty(_settings.ApiKey))
            {
                throw new ArgumentException("Mailgun API key is required.");
            }

            if (string.IsNullOrEmpty(_settings.Domain))
            {
                throw new ArgumentException("Mailgun domain is required.");
            }

            // Create RestClient with Mailgun authenticator
            var clientOptions = new RestClientOptions("https://api.mailgun.net/v3")
            {
                Authenticator = new HttpBasicAuthenticator("api", _settings.ApiKey)
            };

            _client = new RestClient(clientOptions);
        }

        /// <inheritdoc />
        public async Task<bool> SendReportEmailAsync(
            IEnumerable<string> recipients, 
            string reportName, 
            byte[] reportData, 
            string fileName)
        {
            try
            {
                // Validate inputs
                if (recipients == null || !recipients.Any())
                {
                    throw new ArgumentException("At least one recipient is required.");
                }

                if (reportData == null || reportData.Length == 0)
                {
                    throw new ArgumentException("Report data cannot be empty.");
                }

                // Validate email addresses
                var validEmails = recipients.Where(IsValidEmail).ToList();
                if (!validEmails.Any())
                {
                    throw new ArgumentException("No valid email addresses provided.");
                }

                if (validEmails.Count < recipients.Count())
                {
                    _logger.LogWarning("Some email addresses were invalid and removed: {Count} valid out of {Total}",
                        validEmails.Count, recipients.Count());
                }

                // Create request
                var request = new RestRequest($"{_settings.Domain}/messages");

                // Add sender
                var from = string.IsNullOrEmpty(_settings.SenderName)
                    ? _settings.SenderEmail
                    : $"{_settings.SenderName} <{_settings.SenderEmail}>";
                request.AddParameter("from", from);

                // Add recipients (max 1000 as per Mailgun docs)
                foreach (var email in validEmails.Take(1000))
                {
                    request.AddParameter("to", email);
                }

                // Add subject and body
                request.AddParameter("subject", $"ActionableIQ Analytics Report: {reportName}");
                request.AddParameter("text", $"Please find attached your requested analytics report: {reportName}");

                // Add the CSV file as an attachment
                request.AddFile("attachment", reportData, $"{fileName}.csv", "text/csv");

                // Send the request
                var response = await _client.ExecutePostAsync(request);

                if (response.IsSuccessful)
                {
                    _logger.LogInformation("Successfully sent report email to {Count} recipients", validEmails.Count);
                    return true;
                }
                else
                {
                    _logger.LogError("Failed to send email: {ErrorMessage}", response.ErrorMessage);
                    _logger.LogError("Response content: {Content}", response.Content);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending report email");
                return false;
            }
        }

        /// <inheritdoc />
        public bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                // First check using regex for performance
                if (!EmailRegex.IsMatch(email))
                    return false;

                // Validate with .NET's built-in validator
                return email.Length <= 254; // Standard maximum email length
            }
            catch
            {
                return false;
            }
        }
    }
} 