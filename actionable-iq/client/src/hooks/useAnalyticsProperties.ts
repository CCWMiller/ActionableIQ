import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store';
import { 
  selectProperties, 
  selectPropertiesLoading, 
  selectPropertiesError 
} from '../store/slices/analyticsQuerySlice';
import { fetchProperties } from '../store/actions/analyticsActions';

/**
 * Custom hook to fetch and manage Google Analytics properties
 * @returns Object with properties, loading state, and error
 */
export function useAnalyticsProperties() {
  const dispatch = useDispatch<AppDispatch>();
  const properties = useSelector(selectProperties);
  const loading = useSelector(selectPropertiesLoading);
  const error = useSelector(selectPropertiesError);

  // Fetch properties on initial render
  useEffect(() => {
    // Only fetch if we don't already have properties
    if (properties.length === 0 && !loading && !error) {
      dispatch(fetchProperties());
    }
  }, [dispatch, properties.length, loading, error]);

  return {
    properties,
    loading,
    error,
    refetch: () => dispatch(fetchProperties())
  };
}

export default useAnalyticsProperties; 