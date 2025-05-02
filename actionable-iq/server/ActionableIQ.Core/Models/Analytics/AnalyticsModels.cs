using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Google.Analytics.Data.V1Beta;

namespace ActionableIQ.Core.Models.Analytics
{
    /// <summary>
    /// Represents a Google Analytics property
    /// </summary>
    public class AnalyticsProperty
    {
        /// <summary>
        /// The GA4 property ID
        /// </summary>
        public string PropertyId { get; set; } = string.Empty;
        
        /// <summary>
        /// The display name of the property
        /// </summary>
        public string DisplayName { get; set; } = string.Empty;
        
        /// <summary>
        /// The timezone of the property
        /// </summary>
        public string TimeZone { get; set; } = string.Empty;
        
        /// <summary>
        /// The currency code of the property
        /// </summary>
        public string CurrencyCode { get; set; } = string.Empty;
        
        /// <summary>
        /// The creation time of the property
        /// </summary>
        public DateTime CreateTime { get; set; }
        
        /// <summary>
        /// The last update time of the property
        /// </summary>
        public DateTime UpdateTime { get; set; }
    }

    /// <summary>
    /// Request model for Google Analytics queries
    /// </summary>
    public class AnalyticsQueryRequest
    {
        /// <summary>
        /// The GA4 property IDs to query (format: "properties/1234567")
        /// </summary>
        public List<string> PropertyIds { get; set; } = new List<string>();
        
        /// <summary>
        /// Dimensions to include in the report
        /// </summary>
        public List<string> Dimensions { get; set; } = new List<string>();
        
        /// <summary>
        /// Metrics to include in the report
        /// </summary>
        public List<string> Metrics { get; set; } = new List<string>();
        
        /// <summary>
        /// Optional filter expression to restrict data
        /// </summary>
        public string FilterExpression { get; set; }
        
        /// <summary>
        /// Start date for the query (YYYY-MM-DD)
        /// </summary>
        public string StartDate { get; set; } = string.Empty;
        
        /// <summary>
        /// End date for the query (YYYY-MM-DD)
        /// </summary>
        public string EndDate { get; set; } = string.Empty;
        
        /// <summary>
        /// Maximum number of rows to return
        /// </summary>
        public int Limit { get; set; } = 100;
        
        /// <summary>
        /// Optional offset for pagination
        /// </summary>
        public int Offset { get; set; } = 0;

        /// <summary>
        /// Source/Medium filter in format "source / medium"
        /// </summary>
        public string SourceMediumFilter { get; set; } = string.Empty;

        /// <summary>
        /// Number of top states to return
        /// </summary>
        public int TopStatesCount { get; set; } = 10; // Default to 10

        public (string source, string medium) GetSourceMedium()
        {
            if (string.IsNullOrEmpty(FilterExpression))
            {
                return ("", "");
            }

            var parts = FilterExpression.Split(';');
            if (parts.Length != 3)
            {
                return ("", "");
            }

            return (parts[1], parts[2]);
        }
    }

    /// <summary>
    /// Response model for Google Analytics queries
    /// </summary>
    public class AnalyticsQueryResponse
    {
        /// <summary>
        /// The Property ID this response corresponds to.
        /// </summary>
        public string PropertyId { get; set; } = string.Empty;
        
        /// <summary>
        /// Query metadata including request info
        /// </summary>
        public QueryMetadata Metadata { get; set; } = new QueryMetadata();
        
        /// <summary>
        /// Dimension headers from the response
        /// </summary>
        public List<DimensionHeader> DimensionHeaders { get; set; } = new List<DimensionHeader>();
        
        /// <summary>
        /// Metric headers from the response
        /// </summary>
        public List<MetricHeader> MetricHeaders { get; set; } = new List<MetricHeader>();
        
        /// <summary>
        /// Rows of data returned from the query
        /// </summary>
        public List<AnalyticsRow> Rows { get; set; } = new List<AnalyticsRow>();
        
        /// <summary>
        /// Total row count in the matching data
        /// </summary>
        public long RowCount { get; set; }
    }

    /// <summary>
    /// Metadata about the query
    /// </summary>
    public class QueryMetadata
    {
        /// <summary>
        /// The source property ID
        /// </summary>
        public string PropertyId { get; set; } = string.Empty;
        
        /// <summary>
        /// When the data was last refreshed
        /// </summary>
        public DateTime DataLastRefreshed { get; set; }
        
        /// <summary>
        /// Timestamp of when the query was run
        /// </summary>
        public DateTime QueryTime { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Header information for a dimension
    /// </summary>
    public class DimensionHeader
    {
        /// <summary>
        /// The name of the dimension
        /// </summary>
        public string Name { get; set; } = string.Empty;
    }

    /// <summary>
    /// Header information for a metric
    /// </summary>
    public class MetricHeader
    {
        /// <summary>
        /// The name of the metric
        /// </summary>
        public string Name { get; set; } = string.Empty;
        
        /// <summary>
        /// The type of the metric (INTEGER, FLOAT, etc.)
        /// </summary>
        public string Type { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a row of data in the analytics response
    /// </summary>
    public class AnalyticsRow
    {
        /// <summary>
        /// Dimension values in this row
        /// </summary>
        public List<AnalyticsDimensionValue> DimensionValues { get; set; } = new List<AnalyticsDimensionValue>();
        
        /// <summary>
        /// Metric values in this row
        /// </summary>
        public List<AnalyticsMetricValue> MetricValues { get; set; } = new List<AnalyticsMetricValue>();

        // Add properties for calculated metrics
        public double PercentageOfNewUsers { get; set; }
        public double AverageSessionDurationPerUser { get; set; }
    }

    /// <summary>
    /// A dimension value in our analytics model
    /// </summary>
    public class AnalyticsDimensionValue
    {
        /// <summary>
        /// The value of the dimension
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Creates an AnalyticsDimensionValue from a Google Analytics DimensionValue
        /// </summary>
        public static AnalyticsDimensionValue FromGoogleDimensionValue(DimensionValue value)
        {
            return new AnalyticsDimensionValue
            {
                Value = value.Value
            };
        }
    }

    /// <summary>
    /// A metric value in our analytics model
    /// </summary>
    public class AnalyticsMetricValue
    {
        /// <summary>
        /// The value of the metric
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// Creates an AnalyticsMetricValue from a Google Analytics MetricValue
        /// </summary>
        public static AnalyticsMetricValue FromGoogleMetricValue(MetricValue value)
        {
            return new AnalyticsMetricValue
            {
                Value = value.Value.ToString()
            };
        }
    }

    /// <summary>
    /// A filter expression in our analytics model
    /// </summary>
    public class AnalyticsFilterExpression
    {
        /// <summary>
        /// The field name to filter on
        /// </summary>
        public string FieldName { get; set; } = string.Empty;

        /// <summary>
        /// The value to filter by
        /// </summary>
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// The type of match to perform
        /// </summary>
        public string MatchType { get; set; } = string.Empty;

        /// <summary>
        /// Creates a Google Analytics FilterExpression from our AnalyticsFilterExpression
        /// </summary>
        public Google.Analytics.Data.V1Beta.FilterExpression ToGoogleFilterExpression()
        {
            return new Google.Analytics.Data.V1Beta.FilterExpression
            {
                Filter = new Google.Analytics.Data.V1Beta.Filter
                {
                    FieldName = FieldName,
                    StringFilter = new Google.Analytics.Data.V1Beta.Filter.Types.StringFilter
                    {
                        Value = Value,
                        MatchType = MatchType.Equals("exact", StringComparison.OrdinalIgnoreCase)
                            ? Google.Analytics.Data.V1Beta.Filter.Types.StringFilter.Types.MatchType.Exact
                            : Google.Analytics.Data.V1Beta.Filter.Types.StringFilter.Types.MatchType.Contains
                    }
                }
            };
        }
    }

    /// <summary>
    /// Response model for queries involving multiple properties.
    /// Contains combined results and any errors encountered.
    /// </summary>
    public class AnalyticsMultiQueryResponse
    {
        /// <summary>
        /// List of successful query results for individual properties.
        /// </summary>
        public List<AnalyticsQueryResponse> Results { get; set; } = new List<AnalyticsQueryResponse>();

        /// <summary>
        /// List of errors encountered during queries for specific properties.
        /// </summary>
        public List<AnalyticsQueryError> Errors { get; set; } = new List<AnalyticsQueryError>();
    }

    /// <summary>
    /// Represents an error that occurred while querying a specific property.
    /// </summary>
    public class AnalyticsQueryError
    {
        /// <summary>
        /// The Property ID for which the query failed.
        /// </summary>
        public string PropertyId { get; set; } = string.Empty;

        /// <summary>
        /// The error message describing the failure.
        /// </summary>
        public string ErrorMessage { get; set; } = string.Empty;
    }
} 