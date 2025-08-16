import React, { useEffect, useState } from 'react';
import { MetricsCard } from '../MetricsCard';
import { SearchableTable, TableColumn } from '../SearchableTable';
import { CheckCircle, XCircle, AlertCircle, Clock, Play, RotateCcw } from 'lucide-react';
import './TestResultsViewer.css';

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  className?: string;
  errorMessage?: string;
  output?: string;
  timestamp: string;
}

interface TestSuite {
  name: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
  tests: TestResult[];
}

interface TestSummary {
  backend: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage: number;
    lastRun: string;
  };
  frontend: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage?: number;
    lastRun: string;
  };
}

interface TestResultsViewerProps {
  refreshInterval?: number;
}

export const TestResultsViewer: React.FC<TestResultsViewerProps> = ({ 
  refreshInterval = 30000 
}) => {
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [backendResults, setBackendResults] = useState<TestSuite | null>(null);
  const [frontendResults, setFrontendResults] = useState<TestSuite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'backend' | 'frontend'>('summary');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch backend test results
      const backendResponse = await fetch('/api/v1/testing/results/backend');
      const backendData = await backendResponse.json();

      // Fetch frontend test results (if available)
      let frontendData = null;
      try {
        const frontendResponse = await fetch('/api/v1/testing/results/frontend');
        frontendData = await frontendResponse.json();
      } catch (err) {
        console.warn('Frontend test results not available:', err);
      }

      // Process and set data
      setBackendResults(backendData);
      setFrontendResults(frontendData);
      
      // Calculate summary
      const summary: TestSummary = {
        backend: {
          totalTests: backendData?.totalTests || 0,
          passed: backendData?.passed || 0,
          failed: backendData?.failed || 0,
          skipped: backendData?.skipped || 0,
          duration: backendData?.duration || 0,
          coverage: backendData?.coverage || 0,
          lastRun: backendData?.timestamp || new Date().toISOString(),
        },
        frontend: {
          totalTests: frontendData?.totalTests || 0,
          passed: frontendData?.passed || 0,
          failed: frontendData?.failed || 0,
          skipped: frontendData?.skipped || 0,
          duration: frontendData?.duration || 0,
          coverage: frontendData?.coverage,
          lastRun: frontendData?.timestamp || new Date().toISOString(),
        }
      };
      
      setTestSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch test results');
    } finally {
      setLoading(false);
    }
  };

  const runTests = async (type: 'backend' | 'frontend' | 'all') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/testing/run/${type}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to run ${type} tests`);
      }

      // Wait a moment then refresh results
      setTimeout(fetchTestResults, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run ${type} tests`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestResults();
  }, []);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchTestResults, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="test-status-icon test-status-icon--passed" size={16} />;
      case 'failed':
        return <XCircle className="test-status-icon test-status-icon--failed" size={16} />;
      case 'skipped':
        return <AlertCircle className="test-status-icon test-status-icon--skipped" size={16} />;
      case 'running':
        return <Clock className="test-status-icon test-status-icon--running" size={16} />;
      default:
        return null;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1) {
      return `${Math.round(duration * 1000)}ms`;
    }
    return `${duration.toFixed(2)}s`;
  };

  const getSuccessRate = (passed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((passed / total) * 100);
  };

  const testColumns: TableColumn[] = [
    {
      key: 'status',
      label: 'Status',
      render: (test: TestResult) => (
        <div className="test-status">
          {getStatusIcon(test.status)}
          <span className={`test-status-text test-status-text--${test.status}`}>
            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Test Name',
      render: (test: TestResult) => (
        <div className="test-name">
          <div className="test-name__primary">{test.name}</div>
          {test.className && (
            <div className="test-name__secondary">{test.className}</div>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (test: TestResult) => (
        <span className="test-duration">{formatDuration(test.duration)}</span>
      ),
    },
    {
      key: 'error',
      label: 'Details',
      render: (test: TestResult) => (
        <div className="test-details">
          {test.errorMessage && (
            <details className="test-error">
              <summary>Error Details</summary>
              <pre className="test-error__message">{test.errorMessage}</pre>
            </details>
          )}
          {test.output && (
            <details className="test-output">
              <summary>Test Output</summary>
              <pre className="test-output__content">{test.output}</pre>
            </details>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="test-results-loader">
        <RotateCcw className="test-results-loader__icon" size={24} />
        <span>Loading test results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="test-results-error">
        <XCircle className="test-results-error__icon" size={24} />
        <span>Error: {error}</span>
        <button 
          onClick={fetchTestResults}
          className="test-results-error__retry"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="test-results-viewer">
      <div className="test-results-header">
        <div className="test-results-header__title">
          <h2>Test Results</h2>
          <div className="test-results-header__actions">
            <label className="test-results-auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchTestResults}
              className="test-results-refresh"
              disabled={loading}
            >
              <RotateCcw size={16} />
              Refresh
            </button>
            <button
              onClick={() => runTests('all')}
              className="test-results-run"
              disabled={loading}
            >
              <Play size={16} />
              Run All Tests
            </button>
          </div>
        </div>

        <div className="test-results-tabs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`test-results-tab ${activeTab === 'summary' ? 'test-results-tab--active' : ''}`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`test-results-tab ${activeTab === 'backend' ? 'test-results-tab--active' : ''}`}
          >
            Backend Tests
          </button>
          <button
            onClick={() => setActiveTab('frontend')}
            className={`test-results-tab ${activeTab === 'frontend' ? 'test-results-tab--active' : ''}`}
          >
            Frontend Tests
          </button>
        </div>
      </div>

      <div className="test-results-content">
        {activeTab === 'summary' && testSummary && (
          <div className="test-results-summary">
            <div className="test-results-summary__section">
              <h3>Backend Tests</h3>
              <div className="test-summary-metrics">
                <MetricsCard
                  title="Total Tests"
                  value={testSummary.backend.totalTests}
                />
                <MetricsCard
                  title="Success Rate"
                  value={`${getSuccessRate(testSummary.backend.passed, testSummary.backend.totalTests)}%`}
                  trend={testSummary.backend.failed === 0 ? 'up' : 'down'}
                />
                <MetricsCard
                  title="Coverage"
                  value={`${Math.round(testSummary.backend.coverage)}%`}
                />
                <MetricsCard
                  title="Duration"
                  value={formatDuration(testSummary.backend.duration)}
                />
              </div>
              <div className="test-summary-counts">
                <div className="test-count test-count--passed">
                  <CheckCircle size={16} />
                  {testSummary.backend.passed} Passed
                </div>
                <div className="test-count test-count--failed">
                  <XCircle size={16} />
                  {testSummary.backend.failed} Failed
                </div>
                <div className="test-count test-count--skipped">
                  <AlertCircle size={16} />
                  {testSummary.backend.skipped} Skipped
                </div>
              </div>
              <button
                onClick={() => runTests('backend')}
                className="test-summary-run"
                disabled={loading}
              >
                <Play size={16} />
                Run Backend Tests
              </button>
            </div>

            <div className="test-results-summary__section">
              <h3>Frontend Tests</h3>
              <div className="test-summary-metrics">
                <MetricsCard
                  title="Total Tests"
                  value={testSummary.frontend.totalTests}
                />
                <MetricsCard
                  title="Success Rate"
                  value={`${getSuccessRate(testSummary.frontend.passed, testSummary.frontend.totalTests)}%`}
                  trend={testSummary.frontend.failed === 0 ? 'up' : 'down'}
                />
                {testSummary.frontend.coverage && (
                  <MetricsCard
                    title="Coverage"
                    value={`${Math.round(testSummary.frontend.coverage)}%`}
                    />
                )}
                <MetricsCard
                  title="Duration"
                  value={formatDuration(testSummary.frontend.duration)}
                />
              </div>
              <div className="test-summary-counts">
                <div className="test-count test-count--passed">
                  <CheckCircle size={16} />
                  {testSummary.frontend.passed} Passed
                </div>
                <div className="test-count test-count--failed">
                  <XCircle size={16} />
                  {testSummary.frontend.failed} Failed
                </div>
                <div className="test-count test-count--skipped">
                  <AlertCircle size={16} />
                  {testSummary.frontend.skipped} Skipped
                </div>
              </div>
              <button
                onClick={() => runTests('frontend')}
                className="test-summary-run"
                disabled={loading}
              >
                <Play size={16} />
                Run Frontend Tests
              </button>
            </div>
          </div>
        )}

        {activeTab === 'backend' && backendResults && (
          <div className="test-results-details">
            <div className="test-results-details__header">
              <h3>Backend Test Results</h3>
              <span className="test-results-timestamp">
                Last run: {new Date(backendResults.timestamp).toLocaleString()}
              </span>
            </div>
            <SearchableTable
              data={backendResults.tests}
              columns={testColumns}
              emptyMessage="No backend tests found"
            />
          </div>
        )}

        {activeTab === 'frontend' && frontendResults && (
          <div className="test-results-details">
            <div className="test-results-details__header">
              <h3>Frontend Test Results</h3>
              <span className="test-results-timestamp">
                Last run: {new Date(frontendResults.timestamp).toLocaleString()}
              </span>
            </div>
            <SearchableTable
              data={frontendResults.tests}
              columns={testColumns}
              emptyMessage="No frontend tests found"
            />
          </div>
        )}

        {activeTab === 'frontend' && !frontendResults && (
          <div className="test-results-empty">
            <AlertCircle size={48} />
            <h3>Frontend Tests Not Available</h3>
            <p>Frontend test results are not currently being collected.</p>
            <button
              onClick={() => runTests('frontend')}
              className="test-results-run"
            >
              <Play size={16} />
              Run Frontend Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
};