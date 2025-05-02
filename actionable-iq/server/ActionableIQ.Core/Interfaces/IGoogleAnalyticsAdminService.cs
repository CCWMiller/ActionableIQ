using ActionableIQ.Core.Models.Analytics;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ActionableIQ.Core.Interfaces
{
    /// <summary>
    /// Service interface for Google Analytics Admin API operations
    /// </summary>
    public interface IGoogleAnalyticsAdminService
    {
        /// <summary>
        /// Gets property details including display name
        /// </summary>
        /// <param name="propertyId">The GA4 property ID</param>
        /// <returns>Property details including display name</returns>
        Task<AnalyticsProperty> GetPropertyDetailsAsync(string propertyId);
        
        /// <summary>
        /// Gets property details for multiple property IDs in parallel
        /// </summary>
        /// <param name="propertyIds">Collection of GA4 property IDs</param>
        /// <returns>Dictionary mapping property IDs to their details</returns>
        Task<IDictionary<string, AnalyticsProperty>> GetPropertiesDetailsAsync(IEnumerable<string> propertyIds);

        /// <summary>
        /// Gets all properties that the authenticated user has access to
        /// </summary>
        /// <returns>List of GA4 properties with full details</returns>
        Task<IEnumerable<AnalyticsProperty>> GetAllPropertiesAsync();
    }
} 