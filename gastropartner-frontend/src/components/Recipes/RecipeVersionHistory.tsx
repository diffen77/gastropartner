import React, { useState, useEffect, useCallback } from 'react';
import { RecipeChange, impactAnalysisService } from '../../utils/impactAnalysis';
import './RecipeVersionHistory.css';

interface RecipeVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
}

export function RecipeVersionHistory({
  isOpen,
  onClose,
  recipeId,
  recipeName
}: RecipeVersionHistoryProps) {
  const [versions, setVersions] = useState<RecipeChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const loadVersionHistory = useCallback(async () => {
    setLoading(true);
    try {
      const history = await impactAnalysisService.getRecipeChangeHistory(recipeId);
      setVersions(history);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    if (isOpen && recipeId) {
      loadVersionHistory();
    }
  }, [isOpen, recipeId, loadVersionHistory]);

  const formatDateTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Okänt datum';
    }
  };

  const formatRelativeTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `${diffDays} dag${diffDays > 1 ? 'ar' : ''} sedan`;
      if (diffHours > 0) return `${diffHours} timm${diffHours > 1 ? 'ar' : 'e'} sedan`;
      if (diffMinutes > 0) return `${diffMinutes} minut${diffMinutes > 1 ? 'er' : ''} sedan`;
      return 'Just nu';
    } catch {
      return '';
    }
  };

  const toggleVersionDetails = (timestamp: string) => {
    setExpandedVersion(expandedVersion === timestamp ? null : timestamp);
  };

  const clearVersionHistory = async () => {
    if (window.confirm('Är du säker på att du vill rensa versionshistoriken? Detta kan inte ångras.')) {
      localStorage.removeItem(`recipe_versions_${recipeId}`);
      setVersions([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="version-history-modal">
        <div className="modal-header">
          <h2>📜 Versionshistorik</h2>
          <span className="recipe-name">{recipeName}</span>
          <button
            className="btn btn--small btn--secondary"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <p>🔄 Laddar versionshistorik...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="empty-state">
              <p>📝 Inga versioner sparade än</p>
              <small>Versioner sparas automatiskt när du använder batch-redigering</small>
            </div>
          ) : (
            <>
              <div className="version-header">
                <div className="version-stats">
                  <span className="stat">
                    <strong>{versions.length}</strong> versioner
                  </span>
                  <span className="stat">
                    Senaste: {formatRelativeTime(versions[0]?.timestamp)}
                  </span>
                </div>
                <button
                  className="btn btn--small btn--danger"
                  onClick={clearVersionHistory}
                  title="Rensa hela historiken"
                >
                  🗑️ Rensa historik
                </button>
              </div>

              <div className="versions-list">
                {versions.map((version, index) => (
                  <div key={version.timestamp} className="version-card">
                    <div
                      className="version-summary"
                      onClick={() => toggleVersionDetails(version.timestamp)}
                    >
                      <div className="version-info">
                        <div className="version-title">
                          <span className="version-number">
                            Version #{versions.length - index}
                          </span>
                          <span className="version-time">
                            {formatDateTime(version.timestamp)}
                          </span>
                        </div>
                        <div className="version-reason">
                          {version.reason || 'Ingen beskrivning'}
                        </div>
                        <div className="version-meta">
                          <span className="relative-time">
                            {formatRelativeTime(version.timestamp)}
                          </span>
                          {version.applied_price_adjustments ? (
                            <span className="price-adjustments">
                              💰 {version.applied_price_adjustments} prisjusteringar
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="expand-indicator">
                        {expandedVersion === version.timestamp ? '▼' : '▶'}
                      </div>
                    </div>

                    {expandedVersion === version.timestamp && (
                      <div className="version-details">
                        <div className="detail-section">
                          <h4>🔄 Ändringar</h4>
                          <div className="changes-grid">
                            <div className="change-item">
                              <span className="change-label">Namn:</span>
                              <span className="change-value">
                                {version.changes.name || 'Oförändrat'}
                              </span>
                            </div>
                            <div className="change-item">
                              <span className="change-label">Beskrivning:</span>
                              <span className="change-value">
                                {version.changes.description || 'Oförändrat'}
                              </span>
                            </div>
                            <div className="change-item">
                              <span className="change-label">Portioner:</span>
                              <span className="change-value">
                                {version.changes.servings || 'Oförändrat'}
                              </span>
                            </div>
                            <div className="change-item">
                              <span className="change-label">Ingredienser:</span>
                              <span className="change-value">
                                {version.changes.ingredients?.length || 0} st
                              </span>
                            </div>
                          </div>
                        </div>

                        {version.previous_version && (
                          <div className="detail-section">
                            <h4>📋 Tidigare version</h4>
                            <div className="previous-version">
                              <div className="previous-item">
                                <span className="prev-label">Namn:</span>
                                <span className="prev-value">
                                  {version.previous_version.name}
                                </span>
                              </div>
                              <div className="previous-item">
                                <span className="prev-label">Kostnad/portion:</span>
                                <span className="prev-value">
                                  {version.previous_version.cost_per_serving?.toFixed(2)} kr
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {version.changes.ingredients && version.changes.ingredients.length > 0 && (
                          <div className="detail-section">
                            <h4>🥄 Ingredienser i denna version</h4>
                            <div className="ingredients-list">
                              {version.changes.ingredients.map((ingredient, idx) => (
                                <div key={idx} className="ingredient-item">
                                  <span className="ingredient-name">
                                    {ingredient.ingredient_id}
                                  </span>
                                  <span className="ingredient-amount">
                                    {ingredient.quantity} {ingredient.unit}
                                  </span>
                                  <span className="ingredient-cost">
                                    {/* Cost calculation would need ingredient data */}
                                    -
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn--secondary"
            onClick={onClose}
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}