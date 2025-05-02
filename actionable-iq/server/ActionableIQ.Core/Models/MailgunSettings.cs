using System.ComponentModel.DataAnnotations;

namespace ActionableIQ.Core.Models
{
    /// <summary>
    /// Settings for Mailgun email service
    /// </summary>
    public class MailgunSettings
    {
        /// <summary>
        /// Mailgun API key
        /// </summary>
        [Required]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Mailgun domain name
        /// </summary>
        [Required]
        public string Domain { get; set; } = string.Empty;

        /// <summary>
        /// Email address to send from
        /// </summary>
        [Required]
        [EmailAddress]
        public string SenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// Display name for the sender
        /// </summary>
        public string SenderName { get; set; } = "ActionableIQ Analytics";
    }
} 