using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace ActionableIQ.Core.Models.Analytics
{
    /// <summary>
    /// Configuration options for Google Analytics services
    /// </summary>
    public class GoogleAnalyticsOptions : IValidatableObject
    {
        /// <summary>
        /// The application name used in Google Analytics
        /// </summary>
        [Required(ErrorMessage = "Application name is required")]
        [StringLength(100, ErrorMessage = "Application name cannot exceed 100 characters")]
        public string ApplicationName { get; set; } = string.Empty;

        /// <summary>
        /// The default Google Analytics property ID to use
        /// </summary>
        [RegularExpression(@"^\d+$", ErrorMessage = "Default property ID must be a numeric value")]
        public string DefaultPropertyId { get; set; } = string.Empty;

        /// <summary>
        /// The path to the service account key file (JSON) for authentication.
        /// Required if not using OAuth flow.
        /// </summary>
        public string? ServiceAccountKeyPath { get; set; }

        /// <summary>
        /// Whether to use mock data instead of real Google Analytics data
        /// </summary>
        public bool UseMockData { get; set; }

        /// <summary>
        /// Maximum number of concurrent requests to make to Google Analytics
        /// </summary>
        [Range(1, 50, ErrorMessage = "Maximum concurrent requests must be between 1 and 50")]
        public int MaxConcurrentRequests { get; set; } = 5;

        /// <summary>
        /// The configuration section name in appsettings.json
        /// </summary>
        public static string SectionName => "GoogleAnalytics";

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // Always validate MaxConcurrentRequests as it affects system performance
            if (MaxConcurrentRequests < 1 || MaxConcurrentRequests > 50)
            {
                yield return new ValidationResult(
                    "Maximum concurrent requests must be between 1 and 50",
                    new[] { nameof(MaxConcurrentRequests) });
            }

            // If using mock data, no need to validate other fields
            if (UseMockData)
            {
                yield break;
            }

            // Production validation
            if (string.IsNullOrEmpty(ApplicationName))
            {
                yield return new ValidationResult(
                    "Application name is required when not using mock data",
                    new[] { nameof(ApplicationName) });
            }
            else if (ApplicationName.Length > 100)
            {
                yield return new ValidationResult(
                    "Application name cannot exceed 100 characters",
                    new[] { nameof(ApplicationName) });
            }

            if (!string.IsNullOrEmpty(DefaultPropertyId) && !DefaultPropertyId.All(char.IsDigit))
            {
                yield return new ValidationResult(
                    "Default property ID must be a numeric value",
                    new[] { nameof(DefaultPropertyId) });
            }
        }
    }
} 