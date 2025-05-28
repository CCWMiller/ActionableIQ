import React, { useState } from 'react';
import { AnalyticsProperty, AnalyticsQueryRequest } from '../../types/analytics.types';
import PropertySelect from '../common/PropertySelect';
import DateRangePicker from '../common/DateRangePicker';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import { analyticsApi } from '../../services/api/analyticsApi';
import { reportService } from '../../services/api/reportService';
import { generateStandardCsvReportData } from '../../utils/csvUtils';
import type { AnalyticsQueryResponse } from '../../types/analytics.types';

interface QueryFormProps {
  properties: AnalyticsProperty[];
  propertiesLoading: boolean;
  propertiesError: string | null;
  onSubmit: (query: AnalyticsQueryRequest) => void;
  isSubmitting: boolean;
  className?: string;
}

// Custom interface for emailReport function to include csvData
interface ExtendedEmailReportRequest {
  recipients: string[];
  reportName: string;
  reportParameters: {
    startDate: string;
    endDate: string;
    dimensions: string[];
    metrics: string[];
    filters?: string;
    limit?: number;
  };
  csvData?: string; // Optional CSV data for the report
}

// Interface for benchmark results (ensure compatibility with AnalyticsQueryResponse for csvUtils)
interface BenchmarkResult {
  propertyId: string;
  dimensionHeaders: Array<{name: string}>;
  metricHeaders: Array<{name: string; type?: string}>; // type is optional in AnalyticsQueryResponse headers
  rows: Array<{
    dimensionValues: Array<{value: string}>;
    metricValues: Array<{value: string}>;
  }>;
  rowCount?: number; // Available in AnalyticsQueryResponse
  metadata?: any;    // Available in AnalyticsQueryResponse
}

// Predefined property IDs for benchmark report
const BENCHMARK_PROPERTY_IDS = [
  "335833512", "333357692", "379610045", "379660503", "368238745", "274279409", 
  "373763905", "333310822", "352123852", "333324964", "439667473", "271696822", 
  "324029849", "300469369", "300474450", "300462486", "316765189", "300439530", 
  "312806310", "399027418", "401815405", "333310819", "333327090", "333335061", 
  "351106327", "453408897", "286545710", "396610999", "381357159", "333139301", 
  "333268611", "292984912", "386567965", "355889776", "353812836", "368940906", 
  "315002244", "314953528", "315002244", "403517518", "346738029", "350352231", 
  "346803562", "316851664", "261505635", "261205528", "326699961", "360066647", 
  "401017604", "317189004", "333200364", "333200057", "312883574", "373584301", 
  "333203474", "386394488", "333205392", "386964789", "304575611", "304624383", 
  "295881351", "350355991", "272227841", "334728864", "251436497", "326611650", 
  "353733469", "375707463", "262384102", "318006744", "262401021", "262404657", 
  "262387703", "319042159", "378118358", "262409134", "439542477", "375756916", 
  "363062560", "398485794", "399474323", "331623978", "273390330", "384172922", 
  "375798237", "333134722", "333156089", "326692979", "327784887", "398712904", 
  "333134009", "398499777", "254044393", "328851922", "293567087", "256520118", 
  "392595554", "297840571", "292975961", "333139548", "388438117", "393374294", 
  "457367711", "381546208", "340346036", "340370157", "340351765", "340348253", 
  "333139764", "333171513", "333159635", "313201002", "393868125", "363161673", 
  "362098326", "333127576", "313104865"
];

// Max number of property IDs per batch (server limit)
const MAX_PROPERTY_IDS_PER_BATCH = 50;

// Predefined email for benchmark report
const BENCHMARK_EMAIL = "ggeodakyan@gmail.com";

// TOS Benchmark value in seconds
const TOS_BENCHMARK_VALUE = 30;

/**
 * Split an array into chunks of the specified size
 * @param array The array to split
 * @param chunkSize The maximum size of each chunk
 * @returns An array of chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Query Form Component
 * Handles user input for Google Analytics queries
 * 
 * Note: Data processing for New User % and benchmark columns (TOS Benchmark, Passed Benchmark)
 * is now handled in analyticsActions.ts for both regular queries and benchmark queries.
 */
const QueryForm: React.FC<QueryFormProps> = ({
  properties,
  propertiesLoading,
  propertiesError,
  onSubmit,
  isSubmitting,
  className = '',
}) => {
  // Form state
  const [propertyIds, setPropertyIds] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('client-command / email');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [topStatesCount, setTopStatesCount] = useState<number>(10);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState<boolean>(false);
  const [benchmarkStatus, setBenchmarkStatus] = useState<string>('');
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  
  // Get authentication token from Redux store
  const auth = useSelector(selectAuth);
  
  // Set default date range on component load (last 30 days)
  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setStartDate(formatDateForApi(start));
    setEndDate(formatDateForApi(end));
  }, []);
  
  // Format date to YYYY-MM-DD
  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Run benchmark query
  const handleRunBenchmarkReport = async () => {
    if (!auth.token) {
      alert('Authentication required to run benchmark query');
      return;
    }
    
    try {
      setIsBenchmarkLoading(true);
      setBenchmarkStatus('Preparing benchmark query...');
      setBenchmarkProgress(0);
      
      const propertyIdBatches = chunkArray(BENCHMARK_PROPERTY_IDS, MAX_PROPERTY_IDS_PER_BATCH);
      const totalBatches = propertyIdBatches.length;
      
      setBenchmarkStatus(`Processing ${BENCHMARK_PROPERTY_IDS.length} properties in ${totalBatches} batches...`);
      
      const allResults: BenchmarkResult[] = [];
      for (let i = 0; i < propertyIdBatches.length; i++) {
        const batch = propertyIdBatches[i];
        const batchNumber = i + 1;
        
        setBenchmarkStatus(`Running batch ${batchNumber}/${totalBatches} (${batch.length} properties)...`);
        setBenchmarkProgress(Math.floor((i / totalBatches) * 100));
        
        const batchQuery: AnalyticsQueryRequest = {
          propertyIds: batch,
          metrics: ["activeUsers", "newUsers", "totalUsers", "userEngagementDuration"],
          dimensions: ["region", "firstUserSourceMedium"],
          startDate,
          endDate,
          sourceMediumFilter: sourceFilter,
          topStatesCount: topStatesCount,
          limit: 10000,
          offset: 0,
          filterExpression: ''
        };
        
        const batchResponse = await analyticsApi.runQuery(batchQuery, auth.token, auth.idToken || undefined);
        
        if (batchResponse.results && batchResponse.results.length > 0) {
          allResults.push(...batchResponse.results.map(r => ({
            propertyId: r.propertyId,
            dimensionHeaders: r.dimensionHeaders,
            metricHeaders: r.metricHeaders,
            rows: r.rows,
            rowCount: r.rowCount
          } as BenchmarkResult)));
        }
        
        if (batchResponse.errors && batchResponse.errors.length > 0) {
          console.error(`Batch ${batchNumber} errors:`, batchResponse.errors);
        }
      }
      
      setBenchmarkStatus('Generating report...');
      setBenchmarkProgress(80);

      // Create propertyNameRecord for the CSV utility, handling potential ID format differences
      const propertyNameRecord: Record<string, string> = {};
      properties.forEach(prop => {
        if (prop.propertyId && prop.displayName) {
          // Store the ID as it appears in the properties array
          propertyNameRecord[prop.propertyId] = prop.displayName;
          
          // Also store common variations (with/without 'properties/' prefix)
          if (prop.propertyId.startsWith('properties/')) {
            const idWithoutPrefix = prop.propertyId.split('properties/')[1];
            if (idWithoutPrefix) {
              propertyNameRecord[idWithoutPrefix] = prop.displayName;
            }
          } else {
            // If it doesn't start with prefix, add one with prefix
            propertyNameRecord[`properties/${prop.propertyId}`] = prop.displayName;
          }
        }
      });

      const dateRangeForCsv = `${startDate} - ${endDate}`;

      const csvData = generateStandardCsvReportData(
        allResults as AnalyticsQueryResponse[], 
        propertyNameRecord, // Pass the Record<string, string>
        dateRangeForCsv, 
        TOS_BENCHMARK_VALUE
      );
      
      if (!csvData || csvData.length === 0) {
        throw new Error('Failed to generate CSV data using new utility');
      }
      
      setBenchmarkStatus('Sending email...');
      setBenchmarkProgress(90);
      
      await reportService.emailCsvReport({
        recipients: [BENCHMARK_EMAIL],
        reportName: `Analytics Benchmark Report ${formatDateForApi(new Date())}`,
        csvData: csvData
      }, auth.token);
      
      setBenchmarkStatus('Query report sent successfully!');
      setBenchmarkProgress(100);
      setTimeout(() => {
        setBenchmarkStatus('');
        setBenchmarkProgress(0);
        setIsBenchmarkLoading(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error in report generation/sending:', error);
      setBenchmarkStatus(`Error: ${error.message || 'Failed to generate or send report'}`);
      setBenchmarkProgress(0);
      setIsBenchmarkLoading(false);
    }
  };

  // Auto-fill the Source/Medium with the common value
  const setDefaultSourceMedium = () => {
    setSourceFilter('client-command/email');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const propertyIdList = propertyIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (propertyIdList.length === 0) {
      alert('Please select at least one property ID');
      return;
    }
    if (!sourceFilter) {
      alert('Please enter a Source/Medium filter (e.g., client-command / email)');
      return;
    }
    if (topStatesCount < 1 || topStatesCount > 100) {
      alert('Top states count must be between 1 and 100');
      return;
    }

    // Create query object with all necessary fields
    const query: AnalyticsQueryRequest = {
      propertyIds: propertyIdList,
      metrics: ["activeUsers", "newUsers", "totalUsers", "userEngagementDuration"],
      dimensions: ["region", "firstUserSourceMedium"],
      startDate,
      endDate,
      sourceMediumFilter: sourceFilter,
      topStatesCount: topStatesCount,
      limit: 10000,
      offset: 0,
      filterExpression: ''
    };
    
    // Pass the query to the parent component
    onSubmit(query);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Benchmark Status Notification */}
      {benchmarkStatus && (
        <div className="mb-4">
          <div className={`p-3 rounded ${isBenchmarkLoading ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
            {benchmarkStatus}
          </div>
          {/* Progress bar */}
          {isBenchmarkLoading && benchmarkProgress > 0 && (
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div 
                className="h-full bg-blue-600 rounded-full" 
                style={{ width: `${benchmarkProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Property IDs */}
          <PropertySelect 
            properties={properties}
            selectedIds={propertyIds}
            onChange={setPropertyIds}
            isLoading={propertiesLoading}
            error={propertiesError}
            onRunBenchmarkReport={handleRunBenchmarkReport}
          />
          
          {/* Source/Medium */}
          <div>
            <label htmlFor="sourceFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Source / Medium <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="sourceFilter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="source / medium (e.g., client-command / email)"
              required
            />
          </div>
          
          {/* Date Range */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          
          {/* Top States Count */}
          <div>
            <label htmlFor="topStatesCount" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Top States <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="topStatesCount"
              min="1"
              max="100"
              value={topStatesCount}
              onChange={(e) => setTopStatesCount(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || isBenchmarkLoading}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Loading...' : 'Submit Query'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QueryForm; 