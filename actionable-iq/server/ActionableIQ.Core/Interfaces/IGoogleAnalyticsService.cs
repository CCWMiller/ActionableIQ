using ActionableIQ.Core.Models.Analytics;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Service interface for Google Analytics operations
    /// </summary>
    public interface IGoogleAnalyticsService
    {
        /// <summary>
        /// Runs a standard query against Google Analytics data
        /// </summary>
        /// <param name="request">The query request with parameters</param>
        /// <returns>The query response with data</returns>
        Task<AnalyticsMultiQueryResponse> RunQueryAsync(AnalyticsQueryRequest request);
        
        /// <summary>
        /// Runs multiple queries against Google Analytics data
        /// </summary>
        /// <param name="requests">The list of query requests</param>
        /// <returns>A list of query responses</returns>
        Task<IEnumerable<AnalyticsQueryResponse>> RunBatchQueryAsync(IEnumerable<AnalyticsQueryRequest> requests);
        
        /// <summary>
        /// Gets available properties that the authenticated user has access to
        /// </summary>
        /// <returns>List of GA4 properties</returns>
        Task<IEnumerable<AnalyticsProperty>> GetPropertiesAsync();
    }
} 