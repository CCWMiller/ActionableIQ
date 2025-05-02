using System;

namespace ActionableIQ.Core.Models.Analytics.Metrics
{
    public class PageViewMetric
    {
        public DateTime Date { get; set; }
        public string PagePath { get; set; }
        public int PageViews { get; set; }
        public int UniquePageViews { get; set; }
        public double AverageTimeOnPage { get; set; }
        public double BounceRate { get; set; }
        public double AverageSessionDuration { get; set; }
    }
} 