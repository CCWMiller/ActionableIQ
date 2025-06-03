import React from 'react';
import { AnalyticsProperty } from '../../types/analytics.types';

// SharePoint link for property IDs list
const PROPERTY_IDS_LINK = "https://srppm.sharepoint.com/:x:/r/sites/SamWFiles/Shared%20Documents/Ad%20Hoc/GA4%20Property%20IDs%20for%20Dealers.xlsx?d=wf47932fd3e4841378e1c1298ffcb15a2&csf=1&web=1&e=IgrXp4";

interface PropertySelectProps {
  properties: AnalyticsProperty[];
  selectedIds: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  className?: string;
  onRunBenchmarkReport?: () => void;
}

/**
 * Property Select Component
 * Allows users to select Google Analytics properties
 */
const PropertySelect: React.FC<PropertySelectProps> = ({
  properties,
  selectedIds,
  onChange,
  isLoading,
  error,
  className = '',
  onRunBenchmarkReport,
}) => {
  // Handle manual input change
  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="propertyIds" className="block text-sm font-medium text-gray-700">
        Property IDs
      </label>
      
      <div className="flex space-x-2 items-center">
        <input
          type="text"
          id="propertyIds"
          placeholder="Enter numbers only (comma-separated)"
          value={selectedIds}
          onChange={handleManualInput}
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : null}
    </div>
  );
};

export default PropertySelect; 