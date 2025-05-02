using System;

namespace ActionableIQ.Core.Models.Analytics.Metrics
{
    public class ConversionMetric
    {
        public DateTime Date { get; set; }
        public string ConversionName { get; set; }
        public int Conversions { get; set; }
        public double ConversionRate { get; set; }
        public double Value { get; set; }
    }
} 