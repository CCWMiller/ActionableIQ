using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ActionableIQ.Core.Models.Analytics
{
    /// <summary>
    /// Report parameters required for email functionality
    /// </summary>
    public class ReportParameters
    {
        /// <summary>
        /// Start date for the report in format YYYY-MM-DD
        /// </summary>
        public string StartDate { get; set; } = string.Empty;

        /// <summary>
        /// End date for the report in format YYYY-MM-DD
        /// </summary>
        public string EndDate { get; set; } = string.Empty;

        /// <summary>
        /// List of dimensions to include in the report
        /// </summary>
        public List<string> Dimensions { get; set; } = new List<string>();

        /// <summary>
        /// List of metrics to include in the report
        /// </summary>
        public List<string> Metrics { get; set; } = new List<string>();

        /// <summary>
        /// Optional filter string to apply to the report
        /// </summary>
        public string? Filters { get; set; }

        /// <summary>
        /// Optional row limit
        /// </summary>
        public int? Limit { get; set; }
    }

    /// <summary>
    /// Request model for sending an analytics report via email
    /// </summary>
    public class EmailReportRequest
    {
        /// <summary>
        /// List of email recipients (max 10)
        /// </summary>
        [Required]
        [MaxLength(10, ErrorMessage = "Maximum 10 email addresses allowed")]
        public List<string> Recipients { get; set; } = new List<string>();

        /// <summary>
        /// Name of the report
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string ReportName { get; set; } = string.Empty;

        /// <summary>
        /// Parameters for generating the report
        /// </summary>
        [Required]
        public ReportParameters ReportParameters { get; set; } = new ReportParameters();

        /// <summary>
        /// List of property IDs to query for the report.
        /// Required for generating the report data.
        /// </summary>
        [Required]
        [MinLength(1, ErrorMessage = "At least one property ID is required.")]
        public List<string> PropertyIds { get; set; } = new List<string>();
    }
} 