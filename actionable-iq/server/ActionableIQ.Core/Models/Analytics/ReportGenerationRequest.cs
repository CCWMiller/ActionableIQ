using System;
using System.Collections.Generic;

namespace ActionableIQ.Core.Models.Analytics
{
    public class ReportGenerationRequest
    {
        public List<string> PropertyIds { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string SourceMediumFilter { get; set; }
        public int TopStatesCount { get; set; }
        public List<string> Dimensions { get; set; }

        public (string Source, string Medium) GetSourceMedium()
        {
            if (string.IsNullOrEmpty(SourceMediumFilter))
            {
                return (string.Empty, string.Empty);
            }

            var parts = SourceMediumFilter.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 2)
            {
                return (parts[0], parts[1]);
            }
            
            // Optionally, log a warning or throw an exception if the format is unexpected
            // For now, returning empty strings if format is not "source / medium"
            return (string.Empty, string.Empty); 
        }
    }
} 