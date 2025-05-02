using System.Collections.Generic;
using System.Threading.Tasks;
using ActionableIQ.Core.Models.Analytics;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Service interface for generating Google Analytics reports
    /// </summary>
    public interface IGoogleAnalyticsReportService
    {
        /// <summary>
        /// Generates complete analytics reports for the given property IDs
        /// </summary>
        /// <param name="request">The report generation request containing property IDs and filters</param>
        /// <returns>Dictionary mapping property IDs to their complete reports</returns>
        Task<IDictionary<string, PropertyReport>> GenerateReportsAsync(ReportGenerationRequest request);

        /// <summary>
        /// Generates a CSV report based on the provided parameters
        /// </summary>
        /// <param name="parameters">The parameters for the report</param>
        /// <param name="propertyIds">The list of property IDs to query</param>
        /// <returns>CSV data as a string</returns>
        Task<string> GenerateReportCsvAsync(ReportParameters parameters, IEnumerable<string> propertyIds);
    }
} 