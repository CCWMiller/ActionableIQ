using System;

namespace ActionableIQ.Core.Models.Analytics.Metrics
{
    public class CustomMetric
    {
        public DateTime Date { get; set; }
        public string MetricName { get; set; }
        public double Value { get; set; }
        public string Dimension { get; set; }
    }
} 