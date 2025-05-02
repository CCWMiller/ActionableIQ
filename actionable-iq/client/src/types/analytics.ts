export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface RegionData {
    state: string;
    users: number;
    newUsers: number;
    activeUsers: number;
    averageSessionDurationPerUser: number;
    percentageOfNewUsers: number;
}

export interface PropertyReport {
    propertyId: string;
    propertyName: string;
    dateRange: DateRange;
    totalUsers: number;
    totalNewUsers: number;
    totalActiveUsers: number;
    totalAverageSessionDurationPerUser: number;
    totalPercentageOfNewUsers: number;
    regions: RegionData[];
}

export interface ReportGenerationRequest {
    propertyIds: string[];
    sourceMediumFilter: string;
    topStatesCount: number;
}

export interface ReportGenerationResponse {
    [propertyId: string]: PropertyReport;
}

export interface FormattedDuration {
    minutes: number;
    seconds: number;
}

export const formatDuration = (durationInSeconds: number): FormattedDuration => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.round(durationInSeconds % 60);
    return { minutes, seconds };
}; 