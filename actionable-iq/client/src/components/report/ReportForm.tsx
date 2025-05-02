import React, { useState } from 'react';
import { ReportGenerationRequest } from '../../types/analytics';

interface ReportFormProps {
    onSubmit: (request: ReportGenerationRequest) => void;
    isLoading: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({ onSubmit, isLoading }) => {
    const [propertyIds, setPropertyIds] = useState<string>('');
    const [sourceMediumFilter, setSourceMediumFilter] = useState<string>('client-command / email');
    const [topStatesCount, setTopStatesCount] = useState<number>(10);
    const [error, setError] = useState<string>('');

    const validatePropertyIds = (ids: string[]): boolean => {
        const propertyIdRegex = /^\d{9,10}$/;
        return ids.every(id => propertyIdRegex.test(id));
    };

    const validateSourceMedium = (filter: string): boolean => {
        const sourceMediumRegex = /^[^/]+\s*\/\s*[^/]+$/;
        return sourceMediumRegex.test(filter);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Split and trim property IDs
        const ids = propertyIds.split(',').map(id => id.trim());

        // Validate property IDs
        if (!validatePropertyIds(ids)) {
            setError('Property IDs must be 9-10 digits each');
            return;
        }

        // Validate number of property IDs
        if (ids.length > 50) {
            setError('Maximum of 50 property IDs allowed');
            return;
        }

        // Validate source/medium filter
        if (!validateSourceMedium(sourceMediumFilter)) {
            setError('Source/Medium must be in format "source / medium"');
            return;
        }

        // Validate top states count
        if (topStatesCount < 1 || topStatesCount > 100) {
            setError('Number of top states must be between 1 and 100');
            return;
        }

        const request: ReportGenerationRequest = {
            propertyIds: ids,
            sourceMediumFilter,
            topStatesCount
        };

        onSubmit(request);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div>
                <label htmlFor="propertyIds" className="block text-sm font-medium text-gray-700">
                    Property IDs (comma-separated)
                </label>
                <input
                    type="text"
                    id="propertyIds"
                    value={propertyIds}
                    onChange={(e) => setPropertyIds(e.target.value)}
                    placeholder="123456789, 987654321"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isLoading}
                />
                <p className="mt-1 text-sm text-gray-500">Enter up to 50 property IDs, each 9-10 digits</p>
            </div>

            <div>
                <label htmlFor="sourceMedium" className="block text-sm font-medium text-gray-700">
                    Source / Medium Filter
                </label>
                <div className="mt-1 flex space-x-4">
                    <input
                        type="text"
                        id="sourceMedium"
                        value={sourceMediumFilter}
                        onChange={(e) => setSourceMediumFilter(e.target.value)}
                        placeholder="source / medium"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        onClick={() => setSourceMediumFilter('client-command / email')}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        disabled={isLoading}
                    >
                        Use Default
                    </button>
                </div>
            </div>

            <div>
                <label htmlFor="topStates" className="block text-sm font-medium text-gray-700">
                    Number of Top States
                </label>
                <input
                    type="number"
                    id="topStates"
                    value={topStatesCount}
                    onChange={(e) => setTopStatesCount(parseInt(e.target.value, 10))}
                    min="1"
                    max="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isLoading}
                />
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
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

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                >
                    {isLoading ? 'Generating Report...' : 'Generate Report'}
                </button>
            </div>
        </form>
    );
}; 