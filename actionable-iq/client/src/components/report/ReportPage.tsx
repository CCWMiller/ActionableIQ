import React, { useState } from 'react';
import { ReportForm } from './ReportForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ReportGenerationRequest, ReportGenerationResponse } from '../../types/analytics';
import { useAnalyticsApi } from '../../hooks/useAnalyticsApi';

export const ReportPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [reports, setReports] = useState<ReportGenerationResponse>({});
    const [error, setError] = useState<string>('');
    const { generateReport } = useAnalyticsApi();

    const handleSubmit = async (request: ReportGenerationRequest) => {
        setIsLoading(true);
        setError('');
        
        try {
            const response = await generateReport(request);
            setReports(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred while generating the report');
            setReports({});
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Google Analytics Report Generator</h1>
                    <p className="mt-2 text-gray-600">
                        Generate detailed analytics reports for multiple properties with regional data
                    </p>
                </div>

                <ReportForm onSubmit={handleSubmit} isLoading={isLoading} />

                {error && (
                    <div className="mt-8 rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading && <LoadingSpinner />}

                {!isLoading && Object.keys(reports).length > 0 && (
                    <div className="mt-8">
                        <ReportDisplay reports={reports} />
                    </div>
                )}
            </div>
        </div>
    );
}; 