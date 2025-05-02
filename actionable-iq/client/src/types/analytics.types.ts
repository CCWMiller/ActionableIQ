/**
 * Type definitions for Google Analytics data
 * These match the backend models in ActionableIQ.Core.Models.Analytics
 */

/**
 * Google Analytics property
 */
export interface AnalyticsProperty {
  propertyId: string;
  displayName: string;
  createTime: string;
}

/**
 * Request for Google Analytics query
 */
export interface AnalyticsQueryRequest {
  propertyIds: string[];
  dimensions: string[];
  metrics: string[];
  filterExpression?: string;
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
  sourceMediumFilter?: string;
  topStatesCount?: number;
}

/**
 * Response from Google Analytics query
 */
export interface AnalyticsQueryResponse {
  propertyId: string;
  metadata: QueryMetadata;
  dimensionHeaders: DimensionHeader[];
  metricHeaders: MetricHeader[];
  rows: AnalyticsRow[];
  rowCount: number;
}

/**
 * Metadata about the query execution
 */
export interface QueryMetadata {
  propertyId: string;
  dataLastRefreshed: string;
  queryTime: string;
}

/**
 * Header for a dimension
 */
export interface DimensionHeader {
  name: string;
}

/**
 * Header for a metric
 */
export interface MetricHeader {
  name: string;
  type: string;
}

/**
 * A row of analytics data
 */
export interface AnalyticsRow {
  dimensionValues: DimensionValue[];
  metricValues: MetricValue[];
}

/**
 * A dimension value
 */
export interface DimensionValue {
  value: string;
}

/**
 * A metric value
 */
export interface MetricValue {
  value: string;
}

/**
 * State for analytics queries
 */
export interface AnalyticsQueryState {
  activeQuery: AnalyticsQueryRequest | null;
  queryResponse: AnalyticsMultiQueryResponse | null;
  queryLoading: boolean;
  queryError: string | null;
  properties: AnalyticsProperty[];
  propertiesLoading: boolean;
  propertiesError: string | null;
}

/**
 * State for analytics reports
 */
export interface AnalyticsReportState {
  reports: AnalyticsReport[];
  activeReport: AnalyticsReport | null;
  loading: boolean;
  error: string | null;
}

/**
 * A saved report
 */
export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  query: AnalyticsQueryRequest;
  result?: AnalyticsMultiQueryResponse | null;
  createdAt: string;
  updatedAt: string;
}

// Added new interfaces for multi-query response
/**
 * Represents an error during a query for a specific property.
 */
export interface AnalyticsQueryError {
  propertyId: string;
  errorMessage: string;
}

/**
 * Response model for multi-property queries.
 */
export interface AnalyticsMultiQueryResponse {
  results: AnalyticsQueryResponse[];
  errors: AnalyticsQueryError[];
} 