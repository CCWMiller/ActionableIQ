using System.Collections.Generic;

namespace ActionableIQ.Core.Models.Analytics
{
    public class RegionData
    {
        // Existing properties like State, Users, NewUsers etc. would be here.
        // For example:
        public string State { get; set; } // If this was the old way of storing region
        public long Users { get; set; }
        public long NewUsers { get; set; }
        public long ActiveUsers { get; set; }
        public double UserEngagementDuration { get; set; } // Sum of engagement duration in ms
        public double AverageSessionDurationPerUser { get; set; }
        public double PercentageOfNewUsers { get; set; } 

        // New property for dynamic dimension values
        public List<AnalyticsDimensionValue> DimensionValues { get; set; }
    }
} 