import { useState, useCallback } from 'react';
import { 
  AnalysisResult, 
  UIElement, 
  uiTextAnalyzer,
  analyzeCurrentPage 
} from '../utils/uiTextAnalyzer';

export interface UseUITextAnalyzerReturn {
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  startAnalysis: () => Promise<void>;
  analyzeElement: (element: HTMLElement) => UIElement;
  clearResults: () => void;
  exportResults: () => void;
}

/**
 * Hook for using the UI Text Analyzer in React components
 */
export const useUITextAnalyzer = (): UseUITextAnalyzerReturn => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Add a small delay to show loading state and allow UI to update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = analyzeCurrentPage();
      setAnalysisResult(result);
      
      // Log analysis for debugging (can be removed in production)
      console.log('UI Text Analysis completed:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett fel uppstod under analysen';
      setError(errorMessage);
      console.error('UI Text Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const analyzeElement = useCallback((element: HTMLElement): UIElement => {
    return uiTextAnalyzer.analyzeElement(element);
  }, []);

  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setError(null);
  }, []);

  const exportResults = useCallback(() => {
    if (!analysisResult) {
      console.warn('No analysis results to export');
      return;
    }

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        summary: analysisResult.summary,
        elements: analysisResult.elements.map(el => ({
          text: el.text,
          type: el.type,
          functionality: el.functionality,
          confidence: el.confidence,
          position: {
            x: el.position.x,
            y: el.position.y,
            width: el.position.width,
            height: el.position.height
          },
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
      link.download = `ui-text-analysis-${Date.now()}.json`;
      
      // Temporarily add to DOM to trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      console.log('Analysis results exported successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kunde inte exportera resultaten';
      setError(errorMessage);
      console.error('Export failed:', err);
    }
  }, [analysisResult]);

  return {
    analysisResult,
    isAnalyzing,
    error,
    startAnalysis,
    analyzeElement,
    clearResults,
    exportResults
  };
};

export default useUITextAnalyzer;