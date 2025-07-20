import { useEffect, useState } from 'react';
import { SystemStatus } from '../types';
import { getSystemHealth } from '../services/api';

export const useSystemHealth = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        setIsLoading(true);
        const data = await getSystemHealth();
        setSystemStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch system health');
        setSystemStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchSystemHealth();

    // Poll every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return { systemStatus, isLoading, error };
};