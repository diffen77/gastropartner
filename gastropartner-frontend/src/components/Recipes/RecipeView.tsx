import React from 'react';
import { Recipe } from '../../utils/api';

interface RecipeViewProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit?: () => void;
}

export function RecipeView({ recipe, onClose, onEdit }: RecipeViewProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recipe.name}</h2>
          <div>
            {onEdit && (
              <button 
                className="btn btn-primary" 
                onClick={onEdit}
                style={{ marginRight: '10px' }}
              >
                Redigera
              </button>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="recipe-view-content" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <strong>Beskrivning:</strong>
            <p>{recipe.description || 'Ingen beskrivning tillgänglig'}</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <strong>Portioner:</strong> {recipe.servings}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <strong>Instruktioner:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {recipe.instructions || 'Inga instruktioner tillgängliga'}
            </pre>
          </div>
          
          {recipe.is_active === false && (
            <div style={{ 
              padding: '10px',
              background: 'var(--color-warning-50)',
              border: '1px solid var(--color-warning-200)',
              borderRadius: '4px',
              color: 'var(--color-warning-700)'
            }}>
              Detta recept är inaktiverat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}