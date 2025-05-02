using System;

namespace ActionableIQ.Core.Models.Analytics.Metrics
{
    public class UserMetric
    {
        public DateTime Date { get; set; }
        public int TotalUsers { get; set; }
        public int NewUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int ReturningUsers { get; set; }
        public double AverageSessionDuration { get; set; }
        public double SessionsPerUser { get; set; }
    }
} 