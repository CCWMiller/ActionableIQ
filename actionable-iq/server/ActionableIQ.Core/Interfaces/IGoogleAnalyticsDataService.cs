using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ActionableIQ.Core.Models.Analytics.Metrics;

namespace ActionableIQ.Core.Interfaces
{
    public interface IGoogleAnalyticsDataService
    {
        /// <summary>
        /// Gets page view metrics for a specific property and date range
        /// </summary>
        Task<IEnumerable<PageViewMetric>> GetPageViewMetricsAsync(string propertyId, DateTime startDate, DateTime endDate);

        /// <summary>
        /// Gets user metrics for a specific property and date range
        /// </summary>
        Task<IEnumerable<UserMetric>> GetUserMetricsAsync(string propertyId, DateTime startDate, DateTime endDate);

        /// <summary>
        /// Gets conversion metrics for a specific property and date range
        /// </summary>
        Task<IEnumerable<ConversionMetric>> GetConversionMetricsAsync(string propertyId, DateTime startDate, DateTime endDate);

        /// <summary>
        /// Gets custom metrics for a specific property and date range
        /// </summary>
        Task<IEnumerable<CustomMetric>> GetCustomMetricsAsync(string propertyId, DateTime startDate, DateTime endDate, IEnumerable<string> metricNames);
    }
} 