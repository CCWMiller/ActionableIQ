import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AnalyticsQueryResponse } from '../../types/analytics.types';
import { calculateReportMetrics, generateReportId, ReportMetrics } from '../../utils/reportUtils';
import { reportService } from '../../services/api/reportService';
import { selectAuth } from '../../store/slices/authSlice';
import EmailReportModal from '../common/EmailReportModal';

interface ReportResultsProps {
  results: AnalyticsQueryResponse;
  className?: string;
}

/**
 * Report Results Component
 * Displays a summary of analytics data with action buttons
 */
const ReportResults: React.FC<ReportResultsProps> = ({ results, className = '' }) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [visualizationType, setVisualizationType] = useState<'heatmap' | 'bar' | 'line' | 'pie'>('heatmap');
  
  // Log component data for debugging
  useEffect(() => {
    console.log('[ReportResults] Component rendered with results:', {
      hasResults: !!results,
      rowCount: results?.rowCount || 0,
      hasMetadata: !!results?.metadata,
      hasDimensionHeaders: !!results?.dimensionHeaders && results.dimensionHeaders.length > 0,
      hasMetricHeaders: !!results?.metricHeaders && results.metricHeaders.length > 0,
      hasRows: !!results?.rows && results.rows.length > 0
    });
    
    if (results?.rows && results.rows.length > 0) {
      console.log('[ReportResults] Sample row:', {
        dimensions: results.rows[0].dimensionValues.map(d => d.value),
        metrics: results.rows[0].metricValues.map(m => m.value)
      });
    }
  }, [results]);
  
  // Get auth token from Redux store
  const auth = useSelector(selectAuth);
  const token = auth.token || '';
  
  // Generate a unique report ID
  const reportId = generateReportId();
  
  // Format date for display
  const formattedDate = new Date().toLocaleDateString();
  
  // Calculate report metrics from results
  const metrics: ReportMetrics = calculateReportMetrics(results);
  
  // Log the calculated metrics
  useEffect(() => {
    console.log('[ReportResults] Calculated metrics:', metrics);
  }, [metrics]);
  
  // Handle email button click
  const handleEmailClick = () => {
    setIsEmailModalOpen(true);
  };
  
  // Handle sending emails
  const handleSendEmails = async (recipients: string[]) => {
    if (!token) {
      throw new Error('Authentication required to send email');
    }
    
    try {
      // Create report parameters from results
      const reportParameters = {
        startDate: results.metadata.dataLastRefreshed,
        endDate: results.metadata.queryTime,
        dimensions: results.dimensionHeaders.map(h => h.name),
        metrics: results.metricHeaders.map(h => h.name)
      };
      
      // Call the API to send the report
      const response = await reportService.emailReport({
        recipients,
        reportName: `Analytics Report ${formattedDate}`,
        reportParameters
      }, token);
      
      return response;
    } catch (error) {
      console.error('Error sending emails:', error);
      throw error;
    }
  };
  
  // Handle download button click
  const handleDownloadClick = () => {
    const reportData = {
      id: reportId,
      date: formattedDate,
      metrics,
      // Include actual results data
      results: {
        dimensions: results.dimensionHeaders.map(h => h.name),
        metrics: results.metricHeaders.map(h => h.name),
        rows: results.rows.map(row => ({
          dimensions: row.dimensionValues.map(v => v.value),
          metrics: row.metricValues.map(v => v.value)
        }))
      }
    };
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${reportId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Handle visualize button click
  const handleVisualizeClick = () => {
    setIsVisualizationOpen(true);
  };
  
  // Handle visualization modal close
  const handleCloseVisualizationModal = () => {
    setIsVisualizationOpen(false);
  };
  
  // Handle visualization generation
  const handleGenerateVisualization = async () => {
    if (!token) {
      setStatusMessage('Authentication required to generate visualization');
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('Generating visualization...');
    
    try {
      const response = await reportService.generateVisualization(reportId, visualizationType, token);
      setStatusMessage(response.message);
      
      // In a real implementation, you would use the returned URL to display the visualization
      window.open(response.visualizationUrl, '_blank');
      
      // Close the modal after a short delay
      setTimeout(() => {
        setIsVisualizationOpen(false);
        setStatusMessage('');
      }, 2000);
    } catch (error: any) {
      setStatusMessage('Failed to generate visualization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle AI chat button click
  const handleChatClick = () => {
    // This would open the AI chat interface with context about the report
    alert('AI Chat feature would open here with context about report ' + reportId);
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Report Header with Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Report Results</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleEmailClick}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Report
          </button>
          <button
            onClick={handleDownloadClick}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button
            onClick={handleVisualizeClick}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Visualize
          </button>
          <button
            onClick={handleChatClick}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Chat with AI
          </button>
        </div>
      </div>
      
      {/* Report Identification */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Report ID: {reportId}</h3>
        <p className="text-gray-600">Generated on {formattedDate}</p>
      </div>
      
      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border-b border-gray-200 py-4">
          <p className="text-gray-600">Visits</p>
          <p className="text-xl font-semibold">{metrics.visits}</p>
        </div>
        <div className="border-b border-gray-200 py-4">
          <p className="text-gray-600">Pageviews</p>
          <p className="text-xl font-semibold">{metrics.pageviews}</p>
        </div>
        <div className="border-b border-gray-200 py-4">
          <p className="text-gray-600">Bounce Rate</p>
          <p className="text-xl font-semibold">{metrics.bounceRate}</p>
        </div>
        <div className="border-b border-gray-200 py-4">
          <p className="text-gray-600">Avg. Session Duration</p>
          <p className="text-xl font-semibold">{metrics.avgSessionDuration}</p>
        </div>
      </div>
      
      {/* Email Modal */}
      <EmailReportModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSendEmails={handleSendEmails}
        reportName={`Analytics Report ${formattedDate}`}
      />
      
      {/* Visualization Modal */}
      {isVisualizationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Generate Visualization</h3>
            {statusMessage && (
              <div className={`mb-4 p-3 rounded ${isLoading ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {statusMessage}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visualization Type
              </label>
              <select
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              >
                <option value="heatmap">Heatmap</option>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseVisualizationModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateVisualization}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportResults; 