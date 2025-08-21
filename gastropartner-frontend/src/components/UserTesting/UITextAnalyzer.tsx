import React, { useState, useEffect } from 'react';
import { 
  AnalysisResult, 
  UIElement, 
  FunctionalCategory,
  uiTextAnalyzer 
} from '../../utils/uiTextAnalyzer';
import './UITextAnalyzer.css';

interface UITextAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  autoAnalyze?: boolean;
}

export const UITextAnalyzerComponent: React.FC<UITextAnalyzerProps> = ({
  isOpen,
  onClose,
  autoAnalyze = false
}) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedElement, setSelectedElement] = useState<UIElement | null>(null);
  const [filterCategory, setFilterCategory] = useState<FunctionalCategory | 'all'>('all');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen && autoAnalyze) {
      handleAnalyze();
    }
  }, [isOpen, autoAnalyze]);

  // Handle ESC key and prevent body scroll when modal is open
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = uiTextAnalyzer.analyzePage();
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleElementClick = (element: UIElement) => {
    setSelectedElement(element);
    // Highlight the element on the page
    highlightElement(element.element);
  };

  const highlightElement = (element: HTMLElement) => {
    // Remove previous highlights
    document.querySelectorAll('.ui-analyzer-highlight').forEach(el => {
      el.classList.remove('ui-analyzer-highlight');
    });
    
    // Add highlight to selected element
    element.classList.add('ui-analyzer-highlight');
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getFilteredElements = () => {
    if (!analysisResult) return [];
    
    if (filterCategory === 'all') {
      return analysisResult.elements;
    }
    
    return analysisResult.elements.filter(
      element => element.functionality.category === filterCategory
    );
  };

  const getCategoryColor = (category: FunctionalCategory): string => {
    const colors: Record<FunctionalCategory, string> = {
      input: '#4CAF50',
      navigation: '#2196F3',
      action: '#FF9800',
      validation: '#F44336',
      information: '#9C27B0',
      feedback: '#607D8B',
      help: '#00BCD4',
      grouping: '#795548',
      unknown: '#9E9E9E'
    };
    return colors[category];
  };

  const getCategoryLabel = (category: FunctionalCategory): string => {
    const labels: Record<FunctionalCategory, string> = {
      input: 'Datainmatning',
      navigation: 'Navigering',
      action: 'Åtgärder',
      validation: 'Validering',
      information: 'Information',
      feedback: 'Feedback',
      help: 'Hjälp',
      grouping: 'Gruppering',
      unknown: 'Okänt'
    };
    return labels[category];
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const exportResults = () => {
    if (!analysisResult) return;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      summary: analysisResult.summary,
      elements: analysisResult.elements.map(el => ({
        text: el.text,
        type: el.type,
        functionality: el.functionality,
        confidence: el.confidence,
        attributes: el.attributes
      })),
      insights: analysisResult.insights
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ui-analysis-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Close modal if clicking on the overlay background
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Prevent click events from bubbling to the overlay
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'modal-open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-content modal-content--full ui-analyzer-modal" onClick={handleModalClick}>
        <div className="ui-analyzer-header">
          <h2>🔍 UI Text Analyzer</h2>
          <div className="header-actions">
            <button 
              type="button" 
              className="btn btn--secondary"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '🔄 Analyserar...' : '🔍 Analysera Sida'}
            </button>
            {analysisResult && (
              <button 
                type="button" 
                className="btn btn--secondary"
                onClick={exportResults}
              >
                📥 Exportera
              </button>
            )}
            <button type="button" className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="ui-analyzer-content">
          {isAnalyzing && (
            <div className="analyzer-loading">
              <div className="loading-spinner"></div>
              <p>Analyserar UI-texter på sidan...</p>
            </div>
          )}

          {analysisResult && (
            <>
              {/* Summary Section */}
              <div className="analysis-summary">
                <h3>📊 Sammanfattning</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="stat-value">{analysisResult.summary.totalElements}</span>
                    <span className="stat-label">Element</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{Math.round(analysisResult.summary.confidence * 100)}%</span>
                    <span className="stat-label">Säkerhet</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{analysisResult.summary.language}</span>
                    <span className="stat-label">Språk</span>
                  </div>
                </div>

                <div className="category-breakdown">
                  <h4>Kategorier</h4>
                  <div className="category-chips">
                    {Object.entries(analysisResult.summary.categoryCounts)
                      .filter(([, count]) => count > 0)
                      .map(([category, count]) => (
                        <div 
                          key={category}
                          className="category-chip"
                          style={{ backgroundColor: getCategoryColor(category as FunctionalCategory) }}
                        >
                          {getCategoryLabel(category as FunctionalCategory)}: {count}
                        </div>
                      ))}
                  </div>
                </div>

                {analysisResult.insights.length > 0 && (
                  <div className="insights">
                    <h4>💡 Insikter</h4>
                    <ul>
                      {analysisResult.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Filter and Controls */}
              <div className="analyzer-controls">
                <div className="filter-controls">
                  <label htmlFor="category-filter">Filtrera kategori:</label>
                  <select
                    id="category-filter"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as FunctionalCategory | 'all')}
                  >
                    <option value="all">Alla kategorier</option>
                    {Object.entries(analysisResult.summary.categoryCounts)
                      .filter(([, count]) => count > 0)
                      .map(([category]) => (
                        <option key={category} value={category}>
                          {getCategoryLabel(category as FunctionalCategory)}
                        </option>
                      ))}
                  </select>
                </div>
                
                <button
                  className="btn btn--secondary"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? '📄 Dölj detaljer' : '📋 Visa detaljer'}
                </button>
              </div>

              {/* Elements List */}
              <div className="elements-list">
                <h3>🎯 Analyserade Element ({getFilteredElements().length})</h3>
                <div className="elements-grid">
                  {getFilteredElements().map((element, index) => (
                    <div 
                      key={index}
                      className={`element-card ${selectedElement === element ? 'selected' : ''}`}
                      onClick={() => handleElementClick(element)}
                    >
                      <div className="element-header">
                        <div 
                          className="category-indicator"
                          style={{ backgroundColor: getCategoryColor(element.functionality.category) }}
                        >
                          {getCategoryLabel(element.functionality.category)}
                        </div>
                        <div 
                          className="confidence-indicator"
                          style={{ color: getConfidenceColor(element.confidence) }}
                        >
                          {Math.round(element.confidence * 100)}%
                        </div>
                      </div>
                      
                      <div className="element-text">
                        <strong>Text:</strong> "{element.text}"
                      </div>
                      
                      <div className="element-type">
                        <strong>Typ:</strong> {element.type}
                      </div>
                      
                      <div className="element-purpose">
                        <strong>Syfte:</strong> {element.functionality.purpose}
                      </div>

                      {element.functionality.action && (
                        <div className="element-action">
                          <strong>Åtgärd:</strong> {element.functionality.action}
                        </div>
                      )}

                      {showDetails && (
                        <div className="element-details">
                          <div className="element-keywords">
                            <strong>Nyckelord:</strong> {element.functionality.keywords.join(', ') || 'Inga'}
                          </div>
                          
                          {element.functionality.relatedFields && element.functionality.relatedFields.length > 0 && (
                            <div className="element-related">
                              <strong>Relaterade fält:</strong> {element.functionality.relatedFields.join(', ')}
                            </div>
                          )}
                          
                          {Object.keys(element.attributes).length > 0 && (
                            <div className="element-attributes">
                              <strong>Attribut:</strong>
                              <pre>{JSON.stringify(element.attributes, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!analysisResult && !isAnalyzing && (
            <div className="analyzer-empty">
              <div className="empty-icon">🔍</div>
              <h3>Analysera UI-texter</h3>
              <p>
                Använd UI Text Analyzer för att automatiskt identifiera och tolka 
                svenska texter i gränssnittet. Systemet analyserar labels, placeholders, 
                hjälptexter, felmeddelanden och instruktioner för att förstå vad 
                varje element gör.
              </p>
              <button 
                className="btn btn--primary"
                onClick={handleAnalyze}
              >
                🚀 Starta Analys
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS for highlighting elements */}
      <style>{`
        .ui-analyzer-highlight {
          outline: 3px solid #FF5722 !important;
          outline-offset: 2px !important;
          background-color: rgba(255, 87, 34, 0.1) !important;
          transition: all 0.3s ease !important;
        }
        
        /* Prevent highlighting of elements within the analyzer modal */
        .ui-analyzer-modal .ui-analyzer-highlight,
        .ui-analyzer-modal * .ui-analyzer-highlight {
          outline: none !important;
          background-color: transparent !important;
        }
        
        /* Ensure modal stays on top even with highlighting */
        .ui-analyzer-overlay {
          z-index: 99999 !important;
        }
      `}</style>
    </div>
  );
};