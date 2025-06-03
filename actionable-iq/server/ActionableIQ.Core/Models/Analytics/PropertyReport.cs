using System;
using System.Collections.Generic;

namespace ActionableIQ.Core.Models.Analytics
{
    // Represents a report for a single GA4 property
    public class PropertyReport
    {
        public string PropertyId { get; set; }
        public string PropertyName { get; set; }
        public DateRange DateRange { get; set; }
        public long TotalUsers { get; set; }
        public long TotalNewUsers { get; set; }
        public long TotalActiveUsers { get; set; }
        public double TotalAverageSessionDurationPerUser { get; set; }
        public double TotalPercentageOfNewUsers { get; set; }
        public List<RegionData> Regions { get; set; }
        public List<DimensionHeader> DimensionHeaders { get; set; }
        // Add other summary data as needed, e.g., totals for other metrics
    }
} 