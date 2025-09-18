import React, { useState } from 'react';
import { PriceSuggestion, AffectedMenuItem } from '../../utils/impactAnalysis';
import './PriceAdjustmentModal.css';

interface PriceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: PriceSuggestion[];
  affectedItems: AffectedMenuItem[];
  onApply: (selectedSuggestions: PriceSuggestion[]) => Promise<void>;
  isLoading?: boolean;
}

export function PriceAdjustmentModal({
  isOpen,
  onClose,
  suggestions,
  affectedItems,
  onApply,
  isLoading = false
}: PriceAdjustmentModalProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'risk'>('confidence');

  if (!isOpen) return null;

  // Helper functions
  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const selectAllFilteredSuggestions = () => {
    const filteredIds = getFilteredSuggestions().map(s => s.menu_item_id);
    setSelectedSuggestions(new Set(filteredIds));
  };

  const clearAllSelections = () => {
    setSelectedSuggestions(new Set());
  };

  const getFilteredSuggestions = (): PriceSuggestion[] => {
    let filtered = [...suggestions];

    // Filter by risk level
    if (filterLevel !== 'all') {
      filtered = filtered.filter(suggestion => {
        const affectedItem = affectedItems.find(item => item.menu_item_id === suggestion.menu_item_id);
        if (!affectedItem) return false;

        if (filterLevel === 'critical') {
          return affectedItem.risk_level === 'critical';
        } else if (filterLevel === 'high') {
          return affectedItem.risk_level === 'high' || affectedItem.risk_level === 'critical';
        }
        return true;
      });
    }

    // Sort suggestions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        case 'impact':
          return b.price_increase_percentage - a.price_increase_percentage;
        case 'risk':
          const riskA = affectedItems.find(item => item.menu_item_id === a.menu_item_id)?.risk_level || 'low';
          const riskB = affectedItems.find(item => item.menu_item_id === b.menu_item_id)?.risk_level || 'low';
          const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return riskOrder[riskB as keyof typeof riskOrder] - riskOrder[riskA as keyof typeof riskOrder];
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getSelectedSuggestions = (): PriceSuggestion[] => {
    return suggestions.filter(suggestion => selectedSuggestions.has(suggestion.menu_item_id));
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} kr`;
  };

  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const handleApply = async () => {
    const selected = getSelectedSuggestions();
    if (selected.length === 0) return;

    try {
      await onApply(selected);
      onClose();
    } catch (error) {
      console.error('Failed to apply price suggestions:', error);
    }
  };

  const filteredSuggestions = getFilteredSuggestions();
  const selectedSuggestionsData = getSelectedSuggestions();
  const totalImpact = selectedSuggestionsData.reduce((sum, s) => sum + s.price_increase, 0);

  return (
    <div className="modal-overlay">
      <div className="price-adjustment-modal">
        <div className="modal-header">
          <h2>💰 Bulk Prisjusteringar</h2>
          <button
            className="btn btn--small btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Stats */}
          <div className="adjustment-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Totalt förslag</span>
                <span className="summary-value">{suggestions.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Valda</span>
                <span className="summary-value selected">{selectedSuggestions.size}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total prisökning</span>
                <span className="summary-value impact">{formatCurrency(totalImpact)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Genomsnittligt förtroende</span>
                <span className="summary-value confidence">
                  {selectedSuggestionsData.length > 0
                    ? formatPercentage(selectedSuggestionsData.reduce((sum, s) => sum + s.confidence_score, 0) / selectedSuggestionsData.length * 100)
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls-section">
            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="riskFilter">Filtrera efter risk:</label>
                <select
                  id="riskFilter"
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as 'all' | 'high' | 'critical')}
                  className="form-control"
                >
                  <option value="all">Alla nivåer</option>
                  <option value="high">Hög risk och uppåt</option>
                  <option value="critical">Endast kritisk risk</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sortBy">Sortera efter:</label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'confidence' | 'impact' | 'risk')}
                  className="form-control"
                >
                  <option value="confidence">Förtroende</option>
                  <option value="impact">Prisökning</option>
                  <option value="risk">Risknivå</option>
                </select>
              </div>
            </div>

            <div className="selection-controls">
              <button
                className="btn btn--small btn--secondary"
                onClick={selectAllFilteredSuggestions}
                disabled={filteredSuggestions.length === 0}
              >
                ✓ Välj alla ({filteredSuggestions.length})
              </button>
              <button
                className="btn btn--small btn--secondary"
                onClick={clearAllSelections}
                disabled={selectedSuggestions.size === 0}
              >
                ✕ Rensa alla
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="suggestions-section">
            <h3>Prisförslag ({filteredSuggestions.length})</h3>

            {filteredSuggestions.length === 0 ? (
              <div className="empty-state">
                <p>Inga förslag matchar de valda filtren</p>
              </div>
            ) : (
              <div className="suggestions-list">
                {filteredSuggestions.map((suggestion) => {
                  const affectedItem = affectedItems.find(item => item.menu_item_id === suggestion.menu_item_id);
                  const isSelected = selectedSuggestions.has(suggestion.menu_item_id);

                  return (
                    <div
                      key={suggestion.menu_item_id}
                      className={`suggestion-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="suggestion-header">
                        <label className="suggestion-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSuggestion(suggestion.menu_item_id)}
                          />
                          <span className="suggestion-name">
                            {affectedItem?.name || 'Okänd maträtt'}
                          </span>
                        </label>

                        <div className="suggestion-badges">
                          {affectedItem && (
                            <span
                              className="risk-badge"
                              style={{ backgroundColor: getRiskColor(affectedItem.risk_level) }}
                            >
                              {affectedItem.risk_level.toUpperCase()}
                            </span>
                          )}
                          <span className="confidence-badge">
                            🎯 {formatPercentage(suggestion.confidence_score * 100)}
                          </span>
                        </div>
                      </div>

                      <div className="suggestion-content">
                        <div className="price-change">
                          <div className="price-row">
                            <span>Nuvarande pris:</span>
                            <span>{formatCurrency(suggestion.current_price)}</span>
                          </div>
                          <div className="price-row">
                            <span>Föreslaget pris:</span>
                            <span className="suggested-price">{formatCurrency(suggestion.suggested_price)}</span>
                          </div>
                          <div className="price-row highlight">
                            <span>Ökning:</span>
                            <span>
                              +{formatCurrency(suggestion.price_increase)}
                              ({formatPercentage(suggestion.price_increase_percentage)})
                            </span>
                          </div>
                        </div>

                        <div className="suggestion-reason">
                          <small>{suggestion.reason}</small>
                        </div>

                        {affectedItem && (
                          <div className="margin-impact">
                            <div className="margin-row">
                              <span>Nuvarande marginal:</span>
                              <span>{formatPercentage(affectedItem.current_margin_percentage)}</span>
                            </div>
                            <div className="margin-row">
                              <span>Målmarginal:</span>
                              <span>{formatPercentage(suggestion.target_margin_percentage)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Avbryt
          </button>

          {selectedSuggestions.size > 0 && (
            <button
              className="btn btn--primary"
              onClick={handleApply}
              disabled={isLoading}
            >
              {isLoading
                ? 'Tillämpar...'
                : `Tillämpa ${selectedSuggestions.size} prisjusteringar`
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}