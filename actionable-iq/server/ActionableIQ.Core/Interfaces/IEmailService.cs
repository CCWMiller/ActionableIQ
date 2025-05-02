using System.Collections.Generic;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Interface for email sending services
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Sends an analytics report via email to one or more recipients
        /// </summary>
        /// <param name="recipients">List of email recipients</param>
        /// <param name="reportName">Name of the report</param>
        /// <param name="reportData">CSV data as byte array</param>
        /// <param name="fileName">Filename for the attachment (without extension)</param>
        /// <returns>True if all emails were sent successfully, false otherwise</returns>
        Task<bool> SendReportEmailAsync(
            IEnumerable<string> recipients, 
            string reportName, 
            byte[] reportData, 
            string fileName);

        /// <summary>
        /// Validates an email address format
        /// </summary>
        /// <param name="email">Email address to validate</param>
        /// <returns>True if email format is valid</returns>
        bool IsValidEmail(string email);
    }
} 