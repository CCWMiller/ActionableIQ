import React from 'react';
import { AnalyticsProperty } from '../../types/analytics.types';

interface PropertySelectProps {
  properties: AnalyticsProperty[];
  selectedIds: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  className?: string;
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
      
      <input
        type="text"
        id="propertyIds"
        placeholder="Enter numbers only"
        value={selectedIds}
        onChange={handleManualInput}
        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      
      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : null}
    </div>
  );
};

export default PropertySelect; 