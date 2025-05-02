using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace ActionableIQ.Core.Models.Analytics
{
    /// <summary>
    /// Input parameters for generating a Google Analytics report
    /// </summary>
    public class ReportGenerationRequest
    {
        /// <summary>
        /// List of Google Analytics property IDs to include in the report
        /// </summary>
        [Required]
        [MaxLength(50, ErrorMessage = "Maximum of 50 property IDs allowed")]
        public List<string> PropertyIds { get; set; } = new List<string>();

        /// <summary>
        /// Source/Medium filter in format "source / medium"
        /// </summary>
        [Required]
        [RegularExpression(@"^[^/]+\s*/\s*[^/]+$", ErrorMessage = "Source/Medium must be in format 'source / medium'")]
        public string SourceMediumFilter { get; set; } = string.Empty;

        /// <summary>
        /// Number of top states to include in the report
        /// </summary>
        [Required]
        [Range(1, 100, ErrorMessage = "Number of top states must be between 1 and 100")]
        public int TopStatesCount { get; set; }

        /// <summary>
        /// Start date for the report in format YYYY-MM-DD
        /// </summary>
        [Required]
        public DateTime StartDate { get; set; } = DateTime.UtcNow.AddDays(-30);

        /// <summary>
        /// End date for the report in format YYYY-MM-DD
        /// </summary>
        [Required]
        public DateTime EndDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Validates that all property IDs are in the correct format
        /// </summary>
        public bool ValidatePropertyIds()
        {
            var regex = new Regex(@"^\d{9,10}$");
            return PropertyIds.TrueForAll(id => regex.IsMatch(id));
        }

        /// <summary>
        /// Gets source and medium as separate values
        /// </summary>
        public (string Source, string Medium) GetSourceMedium()
        {
            var parts = SourceMediumFilter.Split(new[] { '/' }, StringSplitOptions.TrimEntries);
            return (parts[0], parts[1]);
        }
    }

    /// <summary>
    /// Represents a complete analytics report for a single property
    /// </summary>
    public class PropertyReport
    {
        /// <summary>
        /// The Google Analytics property ID
        /// </summary>
        public string PropertyId { get; set; } = string.Empty;

        /// <summary>
        /// The display name of the property
        /// </summary>
        public string PropertyName { get; set; } = string.Empty;

        /// <summary>
        /// The date range for the report data
        /// </summary>
        public DateRange DateRange { get; set; } = new DateRange();

        /// <summary>
        /// Total number of users
        /// </summary>
        public long TotalUsers { get; set; }

        /// <summary>
        /// Total number of new users
        /// </summary>
        public long TotalNewUsers { get; set; }

        /// <summary>
        /// Total number of active users
        /// </summary>
        public long TotalActiveUsers { get; set; }

        /// <summary>
        /// Average session duration per user in seconds
        /// </summary>
        public double TotalAverageSessionDurationPerUser { get; set; }

        /// <summary>
        /// Percentage of new users
        /// </summary>
        public double TotalPercentageOfNewUsers { get; set; }

        /// <summary>
        /// Data broken down by region/state
        /// </summary>
        public List<RegionData> Regions { get; set; } = new List<RegionData>();
    }

    /// <summary>
    /// Represents the date range for the report
    /// </summary>
    public class DateRange
    {
        /// <summary>
        /// Start date in format YYYY-MM-DD
        /// </summary>
        public string StartDate { get; set; } = string.Empty;

        /// <summary>
        /// End date in format YYYY-MM-DD
        /// </summary>
        public string EndDate { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents analytics data for a specific region/state
    /// </summary>
    public class RegionData
    {
        /// <summary>
        /// Name of the state
        /// </summary>
        public string State { get; set; } = string.Empty;

        /// <summary>
        /// Number of users in this state
        /// </summary>
        public long Users { get; set; }

        /// <summary>
        /// Number of new users in this state
        /// </summary>
        public long NewUsers { get; set; }

        /// <summary>
        /// Number of active users in this state
        /// </summary>
        public long ActiveUsers { get; set; }

        /// <summary>
        /// Average session duration per user in seconds for this state
        /// </summary>
        public double AverageSessionDurationPerUser { get; set; }

        /// <summary>
        /// Percentage of new users in this state
        /// </summary>
        public double PercentageOfNewUsers { get; set; }
    }
} 