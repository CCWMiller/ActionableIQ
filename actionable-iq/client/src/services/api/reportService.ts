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
  csvData?: string; // Added to support sending CSV data directly
}

/**
 * Interface matching the server's EmailCsvRequest model
 */
interface EmailCsvRequest {
  recipients: string[];
  reportName: string;
  csvData: string; // This is required by the server
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
      // If csvData is provided, use the direct CSV email endpoint
      if (request.csvData) {
        return await reportService.emailCsvReport({
          recipients: request.recipients,
          reportName: request.reportName,
          csvData: request.csvData
        }, token);
      }
      
      // Otherwise use the standard report endpoint
      const response = await apiClient.post<{ message: string }>('/report/email', request, {
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
   * Email a CSV report directly to recipients
   */
  emailCsvReport: async (request: EmailCsvRequest, token: string) => {
    try {
      console.log('Sending CSV report with data length:', request.csvData.length);
      
      // Make sure we're sending the exact structure the server expects
      const emailCsvRequest: EmailCsvRequest = {
        recipients: request.recipients,
        reportName: request.reportName,
        csvData: request.csvData
      };
      
      const response = await apiClient.post<{ message: string }>('/report/email', emailCsvRequest, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return {
        success: true,
        message: response.message || 'CSV report sent successfully'
      };
    } catch (error: any) {
      console.error('Error sending CSV report:', error);
      throw new Error(error.response?.data?.message || 'Failed to send CSV report');
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
   * Generate a visualization from report data
   */
  generateVisualization: async (reportId: string, visualizationType: string, token: string) => {
    // In a real implementation, this would call an API endpoint
    // For now, we'll just simulate a successful response
    console.log('Generating visualization:', reportId, visualizationType);
    
    // Return a promise that resolves after a short delay
    return new Promise<{ success: boolean; message: string; visualizationUrl: string }>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Visualization generated successfully',
          visualizationUrl: `https://example.com/visualizations/${reportId}/${visualizationType}`
        });
      }, 1500);
    });
  }
}; 