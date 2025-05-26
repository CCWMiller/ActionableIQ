import React, { useState } from 'react';
import { AnalyticsProperty, AnalyticsQueryRequest } from '../../types/analytics.types';
import PropertySelect from '../common/PropertySelect';
import DateRangePicker from '../common/DateRangePicker';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../store/slices/authSlice';
import { analyticsApi } from '../../services/api/analyticsApi';
import { reportService } from '../../services/api/reportService';

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

// Interface for benchmark results
interface BenchmarkResult {
  propertyId: string;
  dimensionHeaders: Array<{name: string}>;
  metricHeaders: Array<{name: string; type: string}>;
  rows: Array<{
    dimensionValues: Array<{value: string}>;
    metricValues: Array<{value: string}>;
  }>;
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
  "333203474", "386384488", "333205392", "386964789", "304575611", "304624383", 
  "295881351", "350355991", "272227841", "334728864", "251436487", "326611650", 
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
const BENCHMARK_EMAIL = "willmmillerdev@gmail.com";

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
    
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }, []);
  
  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Process data to add benchmark columns
  const processBenchmarkData = (result: any): BenchmarkResult => {
    // Clone the result to avoid modifying the original
    const benchmarkedResult = { ...result };
    
    // Add new headers for the benchmark columns
    benchmarkedResult.dimensionHeaders = [...result.dimensionHeaders];
    benchmarkedResult.metricHeaders = [
      ...result.metricHeaders,
      { name: 'TOS Benchmark', type: 'METRIC_TYPE_SECONDS' },
      { name: 'Passed Benchmark', type: 'METRIC_TYPE_BOOLEAN' }
    ];
    
    // Add benchmark values to each row
    benchmarkedResult.rows = result.rows.map((row: any) => {
      // Find the average session duration metric
      const metricValues = [...row.metricValues];
      const userEngagementIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'userEngagementDuration');
      const activeUsersIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'activeUsers');
      
      if (userEngagementIndex >= 0 && activeUsersIndex >= 0) {
        const userEngagementDuration = parseFloat(row.metricValues[userEngagementIndex].value);
        const activeUsers = parseFloat(row.metricValues[activeUsersIndex].value);
        
        // Calculate average session duration
        let avgSessionDuration = 0;
        if (activeUsers > 0) {
          avgSessionDuration = userEngagementDuration / activeUsers;
        }
        
        // Add benchmark columns
        metricValues.push({ value: TOS_BENCHMARK_VALUE.toString() }); // TOS Benchmark
        metricValues.push({ value: (avgSessionDuration > TOS_BENCHMARK_VALUE).toString() }); // Passed Benchmark
      } else {
        // If metrics not found, add placeholders
        metricValues.push({ value: TOS_BENCHMARK_VALUE.toString() }); // TOS Benchmark
        metricValues.push({ value: 'false' }); // Passed Benchmark
      }
      
      return {
        ...row,
        metricValues
      };
    });
    
    return benchmarkedResult;
  };
  
  // Generate CSV report from analytics results
  const generateCSVReport = (results: BenchmarkResult[]): string => {
    // Initialize CSV rows with headers
    let csvRows: string[] = [];
    
    // Add a header row even if no results are available
    const headers = ['Property ID', 'Region', 'Source/Medium', 'Active Users', 'New Users', 'Total Users', 'User Engagement Duration', 'TOS Benchmark', 'Passed Benchmark'];
    csvRows.push(headers.join(','));
    
    console.log(`Processing ${results.length} results for CSV generation`);
    
    // Process each property result
    results.forEach((result, idx) => {
      // Skip empty results
      if (!result || !result.rows || result.rows.length === 0) {
        console.log(`Skipping empty result for property ${idx}`);
        return;
      }
      
      console.log(`Processing property ID: ${result.propertyId}, with ${result.rows.length} rows`);
      
      // Process rows for this property
      result.rows.forEach((row: any) => {
        try {
          // Safely extract dimension and metric values
          const dimensionValues = row.dimensionValues ? 
            row.dimensionValues.map((d: {value: string}) => `"${d.value || ''}"`) : 
            ['"(not set)"', '"(not set)"'];
          
          const metricValues = row.metricValues ? 
            row.metricValues.map((m: {value: string}) => m.value || '0') : 
            ['0', '0', '0', '0', '0', 'false'];
          
          // Add property ID to the row
          csvRows.push([result.propertyId, ...dimensionValues, ...metricValues].join(','));
        } catch (error) {
          console.error(`Error processing row for property ${result.propertyId}:`, error);
        }
      });
    });
    
    // If we have no data rows, add a default row to make sure the CSV isn't empty
    if (csvRows.length === 1) {
      csvRows.push(['0', '"No Data"', '"No Data"', '0', '0', '0', '0', '30', 'false'].join(','));
    }
    
    // Join rows with newlines to create CSV string
    const csvContent = csvRows.join('\n');
    console.log(`Generated CSV with ${csvRows.length} rows (${csvContent.length} bytes)`);
    return csvContent;
  };

  // Run benchmark report
  const handleRunBenchmarkReport = async () => {
    if (!auth.token) {
      alert('Authentication required to run benchmark report');
      return;
    }
    
    try {
      setIsBenchmarkLoading(true);
      setBenchmarkStatus('Preparing benchmark query...');
      setBenchmarkProgress(0);
      
      // Split property IDs into batches to respect the 50-property limit
      const propertyIdBatches = chunkArray(BENCHMARK_PROPERTY_IDS, MAX_PROPERTY_IDS_PER_BATCH);
      const totalBatches = propertyIdBatches.length;
      
      setBenchmarkStatus(`Processing ${BENCHMARK_PROPERTY_IDS.length} properties in ${totalBatches} batches...`);
      
      // Run queries for each batch and collect all results
      const allResults: any[] = [];
      for (let i = 0; i < propertyIdBatches.length; i++) {
        const batch = propertyIdBatches[i];
        const batchNumber = i + 1;
        
        setBenchmarkStatus(`Running batch ${batchNumber}/${totalBatches} (${batch.length} properties)...`);
        setBenchmarkProgress(Math.floor((i / totalBatches) * 100));
        
        // Create query object for this batch
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
        
        // Execute the query for this batch
        const batchResponse = await analyticsApi.runQuery(batchQuery, auth.token, auth.idToken || undefined);
        
        // Collect successful results from this batch
        if (batchResponse.results && batchResponse.results.length > 0) {
          allResults.push(...batchResponse.results);
        }
        
        // Log any errors
        if (batchResponse.errors && batchResponse.errors.length > 0) {
          console.error(`Batch ${batchNumber} errors:`, batchResponse.errors);
        }
      }
      
      // Process all results to add benchmark columns
      setBenchmarkStatus('Processing benchmark data...');
      setBenchmarkProgress(70);
      
      const processedResults = allResults.map((result: any) => {
        // Get only the total rows for each property
        const propertyTotals = {
          ...result,
          rows: result.rows.filter((row: any) => {
            // Match the total row (no region, all regions combined)
            return row.dimensionValues.some((dim: any) => dim.value === "(not set)");
          })
        };
        
        // Add benchmark columns
        return processBenchmarkData(propertyTotals);
      });
      
      // Generate CSV report with benchmark data
      setBenchmarkStatus('Generating report...');
      setBenchmarkProgress(80);
      
      const csvData = generateCSVReport(processedResults);
      console.log('Generated CSV data, length:', csvData.length, 'First 100 chars:', csvData.substring(0, 100));
      
      if (!csvData || csvData.length === 0) {
        throw new Error('Failed to generate CSV data');
      }
      
      // Send report via email
      setBenchmarkStatus('Sending email...');
      setBenchmarkProgress(90);
      
      await reportService.emailCsvReport({
        recipients: [BENCHMARK_EMAIL],
        reportName: `Analytics Benchmark Report ${formatDate(new Date())}`,
        csvData: csvData
      }, auth.token);
      
      setBenchmarkStatus('Benchmark report sent successfully!');
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
            onRunBenchmarkReport={handleRunBenchmarkReport} // Add the benchmark handler
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