using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ActionableIQ.Core.Models.Analytics // Or use ActionableIQ.Core.Models if more appropriate
{
    /// <summary>
    /// Request model for sending a pre-generated CSV report via email.
    /// </summary>
    public class EmailCsvRequest
    {
        /// <summary>
        /// List of email recipients (max 10).
        /// </summary>
        [Required]
        [MaxLength(10, ErrorMessage = "Maximum 10 email addresses allowed")]
        [MinLength(1, ErrorMessage = "At least one recipient is required.")]
        public List<string> Recipients { get; set; } = new List<string>();

        /// <summary>
        /// Name of the report (used in email subject/body).
        /// </summary>
        [Required(AllowEmptyStrings = false, ErrorMessage = "Report name is required.")]
        [MaxLength(100, ErrorMessage = "Report name cannot exceed 100 characters.")]
        public string ReportName { get; set; } = string.Empty;

        /// <summary>
        /// The pre-generated CSV data as a string.
        /// </summary>
        [Required(AllowEmptyStrings = false, ErrorMessage = "CSV data cannot be empty.")]
        public string CsvData { get; set; } = string.Empty;
    }
} 