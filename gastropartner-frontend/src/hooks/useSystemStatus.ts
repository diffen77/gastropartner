import { useState, useEffect, useCallback } from 'react';

interface SystemStatus {
  overall_status: string;
  last_updated: string;
  services: Array<{
    name: string;
    status: string;
    response_time_ms?: number;
    last_updated: string;
    description: string;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    resolved_at?: string;
  }>;
  maintenance: Array<{
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    description: string;
  }>;
}

interface UseSystemStatusReturn {
  status: SystemStatus | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const useSystemStatus = (): UseSystemStatusReturn => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/health/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: SystemStatus = await response.json();
      setStatus(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          setError('Request timeout - please check your connection');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Network error - unable to connect to status API');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Failed to fetch system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    refreshStatus,
  };
};

// Additional hook for monitoring metrics
export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/health/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch metrics');
      }
      console.error('Failed to fetch system metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh metrics every minute
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
};

// Hook for basic health check (faster, for quick status indicators)
export const useHealthCheck = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // Shorter timeout for basic check
      });

      setIsHealthy(response.ok);
      setLastCheck(new Date());
    } catch (err) {
      setIsHealthy(false);
      setLastCheck(new Date());
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    isHealthy,
    loading,
    lastCheck,
    refresh: checkHealth,
  };
};