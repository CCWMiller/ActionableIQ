import React from 'react';
import { PropertyReport, formatDuration } from '../../types/analytics';

interface ReportDisplayProps {
    reports: Record<string, PropertyReport>;
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ reports }) => {
    if (!Object.keys(reports).length) {
        return null;
    }

    return (
        <div className="space-y-8">
            {Object.values(reports).map((report) => (
                <div key={report.propertyId} className="bg-white rounded-lg shadow-md p-6">
                    <div className="border-b pb-4 mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{report.propertyName}</h2>
                        <p className="text-sm text-gray-500">Property ID: {report.propertyId}</p>
                        <p className="text-sm text-gray-500">
                            Date Range: {report.dateRange.startDate} to {report.dateRange.endDate}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
                            <p className="text-2xl font-bold text-blue-600">{report.totalUsers.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-700">New Users</h3>
                            <p className="text-2xl font-bold text-green-600">
                                {report.totalNewUsers.toLocaleString()}
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    ({report.totalPercentageOfNewUsers.toFixed(1)}%)
                                </span>
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-700">Active Users</h3>
                            <p className="text-2xl font-bold text-indigo-600">{report.totalActiveUsers.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Average Session Duration</h3>
                        {(() => {
                            const { minutes, seconds } = formatDuration(report.totalAverageSessionDurationPerUser);
                            return (
                                <p className="text-lg text-gray-700">
                                    {minutes} minutes {seconds} seconds
                                </p>
                            );
                        })()}
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Top States</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            State
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Users
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            New Users
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Active Users
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Avg. Session
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {report.regions.map((region) => (
                                        <tr key={region.state}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {region.state}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {region.users.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {region.newUsers.toLocaleString()}
                                                <span className="text-xs text-gray-400 ml-1">
                                                    ({region.percentageOfNewUsers.toFixed(1)}%)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {region.activeUsers.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(() => {
                                                    const { minutes, seconds } = formatDuration(region.averageSessionDurationPerUser);
                                                    return `${minutes}m ${seconds}s`;
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}; 