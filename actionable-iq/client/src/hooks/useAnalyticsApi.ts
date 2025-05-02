import { ReportGenerationRequest, ReportGenerationResponse } from '../types/analytics';

export const useAnalyticsApi = () => {
    const generateReport = async (request: ReportGenerationRequest): Promise<ReportGenerationResponse> => {
        const response = await fetch('/api/analytics/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate report');
        }

        return response.json();
    };

    return {
        generateReport,
    };
}; 