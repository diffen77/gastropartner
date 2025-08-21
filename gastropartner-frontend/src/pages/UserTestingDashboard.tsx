import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { UITextAnalyzerComponent } from '../components/UserTesting/UITextAnalyzer';
import { TestResultsViewer } from '../components/TestResults/TestResultsViewer';
import { useTranslation } from '../localization/sv';
import { formatPercentage, formatDuration } from '../utils/formatting';
import { apiClient } from '../utils/api';
import './UserTestingDashboard.css';

interface UserTestingMetrics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  avg_session_duration_minutes: number;
  total_feedback_items: number;
  unresolved_feedback: number;
  onboarding_completion_rate: number;
  avg_onboarding_time_minutes: number;
  most_used_features: Array<{ feature: string; count: number }>;
  conversion_rate: number;
}

interface UserFeedback {
  feedback_id: string;
  feedback_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  rating?: number;
  created_at: string;
  user_id: string;
}


export default function UserTestingDashboard() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<UserTestingMetrics | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showUIAnalyzer, setShowUIAnalyzer] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tests'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsResponse, feedbackResponse] = await Promise.all([
        apiClient.getUserTestingMetrics(),
        apiClient.getFeedback()
      ]);
      
      setMetrics(metricsResponse);
      setFeedback(feedbackResponse);
      setError('');
    } catch (err) {
      console.error('Failed to load user testing data:', err);
      setError('Kunde inte ladda user testing data');
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return '🐛';
      case 'feature_request':
        return '💡';
      case 'usability':
        return '🎯';
      case 'satisfaction':
        return '😊';
      default:
        return '💬';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const feedbackColumns: TableColumn[] = [
    { key: 'type', label: 'Typ', sortable: false },
    { key: 'title', label: 'Rubrik', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'priority', label: 'Prioritet', sortable: true },
    { key: 'rating', label: 'Betyg', sortable: true },
    { key: 'created_at', label: 'Datum', sortable: true },
  ];

  const feedbackTableData = feedback.map(item => ({
    type: `${getFeedbackTypeIcon(item.feedback_type)} ${item.feedback_type}`,
    title: item.title,
    status: (
      <span className={`status-badge status-badge--${getStatusColor(item.status)}`}>
        {item.status}
      </span>
    ),
    priority: (
      <span className={`priority-badge priority-badge--${getPriorityColor(item.priority)}`}>
        {item.priority}
      </span>
    ),
    rating: item.rating ? `⭐ ${item.rating}/5` : '-',
    created_at: formatDate(item.created_at),
  }));

  if (isLoading) {
    return (
      <div className="main-content">
        <PageHeader 
          title={t('userTestingDashboard')} 
          subtitle="Övervaka användarfeedback och testmätvärden"
        />
        <div className="loading-state">
          <p>Laddar user testing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <PageHeader 
        title={t('userTestingDashboard')} 
        subtitle="Övervaka användarfeedback och testmätvärden"
      >
        <div className="dashboard-header-actions">
          <div className="dashboard-tabs">
            <button
              className={`dashboard-tab ${activeTab === 'overview' ? 'dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'tests' ? 'dashboard-tab--active' : ''}`}
              onClick={() => setActiveTab('tests')}
            >
              🧪 Test Results
            </button>
          </div>
          <button 
            className="btn btn--primary"
            onClick={() => setShowUIAnalyzer(true)}
          >
            🔍 Analysera UI-texter
          </button>
        </div>
      </PageHeader>

      <div className="modules-container">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {activeTab === 'overview' && metrics && (
          <>
            {/* User Activity Metrics */}
            <section className="modules-section">
              <h2 className="">📊 Användaraktivitet</h2>
              <div className="modules-grid">
                <MetricsCard
                  icon="👥"
                  title="TOTALT ANTAL ANVÄNDARE"
                  value={metrics.total_users.toString()}
                  subtitle="Registrerade användare"
                  color="primary"
                />
                <MetricsCard
                  icon="🔥"
                  title="AKTIVA IDAG"
                  value={metrics.active_users_today.toString()}
                  subtitle={`${metrics.active_users_week} denna vecka`}
                  color={metrics.active_users_today > 0 ? "success" : "warning"}
                />
                <MetricsCard
                  icon="⏱️"
                  title="GENOMSNITTLIG SESSIONSTID"
                  value={`${formatDuration(metrics.avg_session_duration_minutes)}`}
                  subtitle="Per session"
                  color="primary"
                />
                <MetricsCard
                  icon="📈"
                  title="KONVERTERINGSGRAD"
                  value={formatPercentage(metrics.conversion_rate)}
                  subtitle="Fullständig onboarding"
                  color={metrics.conversion_rate > 70 ? "success" : metrics.conversion_rate > 50 ? "warning" : "danger"}
                />
              </div>
            </section>

            {/* Feedback Metrics */}
            <section className="modules-section">
              <h2 className="">💬 Feedback</h2>
              <div className="modules-grid">
                <MetricsCard
                  icon="📝"
                  title="TOTAL FEEDBACK"
                  value={metrics.total_feedback_items.toString()}
                  subtitle="Alla feedback-poster"
                  color="primary"
                />
                <MetricsCard
                  icon="⚠️"
                  title="OLÖSTA PROBLEM"
                  value={metrics.unresolved_feedback.toString()}
                  subtitle="Kräver uppmärksamhet"
                  color={metrics.unresolved_feedback === 0 ? "success" : metrics.unresolved_feedback < 5 ? "warning" : "danger"}
                />
                <MetricsCard
                  icon="✅"
                  title="ONBOARDING SLUTFÖRD"
                  value={formatPercentage(metrics.onboarding_completion_rate)}
                  subtitle={`⏱️ ${formatDuration(metrics.avg_onboarding_time_minutes)} snitt`}
                  color={metrics.onboarding_completion_rate > 80 ? "success" : metrics.onboarding_completion_rate > 60 ? "warning" : "danger"}
                />
                <MetricsCard
                  icon="🎯"
                  title="MEST ANVÄNDA FUNKTIONEN"
                  value={metrics.most_used_features[0]?.feature || 'N/A'}
                  subtitle={metrics.most_used_features[0] ? `${metrics.most_used_features[0].count} användningar` : ''}
                  color="primary"
                />
              </div>
            </section>

            {/* Most Used Features */}
            <section className="modules-section">
              <h2 className="">🏆 Mest Använda Funktioner</h2>
              <div className="features-list">
                {metrics.most_used_features.map((feature, index) => (
                  <div key={feature.feature} className="feature-item">
                    <div className="feature-rank">#{index + 1}</div>
                    <div className="feature-info">
                      <div className="feature-name">{feature.feature}</div>
                      <div className="feature-count">{feature.count} användningar</div>
                    </div>
                    <div className="feature-bar">
                      <div 
                        className="feature-bar-fill" 
                        style={{ 
                          width: `${(feature.count / metrics.most_used_features[0].count) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'overview' && (
          <section className="modules-section">
            <h2 className="">💬 Senaste Feedback</h2>
            <div className="table-section">
              <SearchableTable
                columns={feedbackColumns}
                data={feedbackTableData}
                searchPlaceholder="Sök feedback..."
                emptyMessage="Ingen feedback hittades"
              />
            </div>
          </section>
        )}

        {activeTab === 'tests' && (
          <section className="modules-section">
            <TestResultsViewer refreshInterval={30000} />
          </section>
        )}
      </div>

      {/* UI Text Analyzer Modal */}
      <UITextAnalyzerComponent
        isOpen={showUIAnalyzer}
        onClose={() => setShowUIAnalyzer(false)}
        autoAnalyze={true}
      />
    </div>
  );
}