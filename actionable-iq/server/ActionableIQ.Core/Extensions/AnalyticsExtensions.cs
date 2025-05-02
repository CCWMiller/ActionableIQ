using Google.Analytics.Data.V1Beta;
using ActionableIQ.Core.Models.Analytics;
using System;
using GoogleFilterExpression = Google.Analytics.Data.V1Beta.FilterExpression;
using CoreFilterExpression = ActionableIQ.Core.Models.Analytics.FilterExpression;

namespace ActionableIQ.Core.Extensions
{
    /// <summary>
    /// Extension methods for Analytics types
    /// </summary>
    public static class AnalyticsExtensions
    {
        public static GoogleFilterExpression ToGoogleFilterExpression(this CoreFilterExpression filterExpression)
        {
            return new GoogleFilterExpression
            {
                Filter = new Filter
                {
                    FieldName = filterExpression.FieldName,
                    StringFilter = new Filter.Types.StringFilter
                    {
                        Value = filterExpression.Value,
                        MatchType = Filter.Types.StringFilter.Types.MatchType.Exact
                    }
                }
            };
        }
    }
} 