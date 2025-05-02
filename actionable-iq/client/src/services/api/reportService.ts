import { apiClient } from './apiClient';
import { AnalyticsQueryResponse } from '../../types/analytics.types';

/**
 * Interface for email request
 */
interface EmailReportRequest {
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
}

/**
 * Service for report-related operations
 */
export const reportService = {
  /**
   * Email a report to recipients
   */
  emailReport: async (request: EmailReportRequest, token: string) => {
    try {
      const response = await apiClient.post<{ message: string }>('/api/report/email', request, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return {
        success: true,
        message: response.message || 'Report sent successfully'
      };
    } catch (error: any) {
      console.error('Error sending email report:', error);
      throw new Error(error.response?.data?.message || 'Failed to send report');
    }
  },
  
  /**
   * Save a report to the user's account
   */
  saveReport: (reportName: string, results: AnalyticsQueryResponse, token: string) => {
    // In a real implementation, this would call an API endpoint
    // For now, we'll just simulate a successful response
    console.log('Saving report:', reportName, results);
    
    // Generate a random ID for the report
    const reportId = Math.random().toString(36).substring(2, 12);
    
    // Return a promise that resolves after a short delay
    return new Promise<{ success: boolean; reportId: string; message: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          reportId,
          message: `Report "${reportName}" saved successfully`
        });
      }, 1000);
    });
  },
  
  /**
   * Generate a visualization for a report
   */
  generateVisualization: (
    reportId: string, 
    visualizationType: 'heatmap' | 'bar' | 'line' | 'pie', 
    token: string
  ) => {
    // In a real implementation, this would call an API endpoint
    // For now, we'll just simulate a successful response
    console.log('Generating visualization:', reportId, visualizationType);
    
    // Return a promise that resolves after a short delay
    return new Promise<{ success: boolean; visualizationUrl: string; message: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          visualizationUrl: `https://example.com/visualizations/${reportId}/${visualizationType}`,
          message: `${visualizationType} visualization generated successfully`
        });
      }, 1000);
    });
  }
}; 