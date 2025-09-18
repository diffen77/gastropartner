import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../../utils/api';
import { formatCurrency } from '../../utils/formatting';
import './DragDropZone.css';

interface RecipeComposition {
  recipe: Recipe;
  quantity: number;
  notes?: string;
}

interface DragDropZoneProps {
  composition: RecipeComposition[];
  onQuantityChange: (recipeId: string, quantity: number) => void;
  onRemove: (recipeId: string) => void;
  onDrop: (recipe: Recipe, quantity?: number) => void;
}

export function DragDropZone({ composition, onQuantityChange, onRemove, onDrop }: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    setDragCounter(0);

    try {
      const recipeData = e.dataTransfer.getData('text/plain');
      if (!recipeData) return;

      const recipe: Recipe = JSON.parse(recipeData);
      onDrop(recipe, 1); // Default quantity of 1
    } catch (error) {
      console.error('Failed to parse dropped recipe data:', error);
    }
  };

  // Touch and keyboard support
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  // Reset drag counter if it gets out of sync
  useEffect(() => {
    const handleMouseLeave = () => {
      setIsDragOver(false);
      setDragCounter(0);
    };

    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('mouseleave', handleMouseLeave);
      return () => dropZone.removeEventListener('mouseleave', handleMouseLeave);
    }
  }, []);

  const getTotalCost = () => {
    return composition.reduce((sum, comp) => {
      const cost = comp.recipe.cost_per_serving ?
        parseFloat(comp.recipe.cost_per_serving.toString()) * comp.quantity : 0;
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
  };

  const getTotalServings = () => {
    return composition.reduce((sum, comp) => sum + (comp.recipe.servings * comp.quantity), 0);
  };

  return (
    <div
      ref={dropZoneRef}
      className={`drag-drop-zone ${isDragOver ? 'drag-drop-zone--active' : ''} ${
        composition.length === 0 ? 'drag-drop-zone--empty' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="region"
      aria-label="Kombinationsområde för recept"
      tabIndex={0}
    >
      {composition.length === 0 ? (
        <div className="drop-zone-placeholder">
          <div className="placeholder-icon">🎯</div>
          <h4>Dra recept hit för att kombinera</h4>
          <p>Skapa sammansatta maträtter genom att dra och släppa dina favoritrecept</p>
          <div className="placeholder-hints">
            <div className="hint">
              <span className="hint-icon">💡</span>
              <span>Tips: Kombinera proteiner med tillbehör för kompletta måltider</span>
            </div>
            <div className="hint">
              <span className="hint-icon">🎨</span>
              <span>Experimentera med smaker och texturer</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="composition-list">
          <div className="composition-header">
            <h4>🍽️ Din Kombination</h4>
            <div className="composition-summary">
              <span className="summary-item">
                <strong>{composition.length}</strong> recept
              </span>
              <span className="summary-item">
                <strong>{getTotalServings()}</strong> portioner
              </span>
              <span className="summary-item">
                <strong>{formatCurrency(getTotalCost())}</strong> kostnad
              </span>
            </div>
          </div>

          <div className="composition-items">
            {composition.map((comp, index) => (
              <div key={comp.recipe.recipe_id} className="composition-item">
                <div className="item-info">
                  <div className="item-header">
                    <h5 className="item-name">{comp.recipe.name}</h5>
                    <button
                      className="btn btn--icon btn--danger btn--small"
                      onClick={() => onRemove(comp.recipe.recipe_id)}
                      onKeyDown={(e) => handleKeyDown(e, () => onRemove(comp.recipe.recipe_id))}
                      title={`Ta bort ${comp.recipe.name} från kombinationen`}
                      aria-label={`Ta bort ${comp.recipe.name} från kombinationen`}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="item-details">
                    <span className="detail">
                      {comp.recipe.servings} portioner per recept
                    </span>
                    {comp.recipe.cost_per_serving && (
                      <span className="detail">
                        {formatCurrency(parseFloat(comp.recipe.cost_per_serving.toString()))} per portion
                      </span>
                    )}
                  </div>

                  {comp.recipe.description && (
                    <p className="item-description">{comp.recipe.description}</p>
                  )}
                </div>

                <div className="item-controls">
                  <div className="quantity-control">
                    <label htmlFor={`quantity-${comp.recipe.recipe_id}`} className="quantity-label">
                      Antal:
                    </label>
                    <div className="quantity-input-group">
                      <button
                        className="btn btn--small btn--secondary quantity-btn"
                        onClick={() => onQuantityChange(comp.recipe.recipe_id, comp.quantity - 1)}
                        disabled={comp.quantity <= 1}
                        aria-label="Minska antal"
                      >
                        −
                      </button>
                      <input
                        id={`quantity-${comp.recipe.recipe_id}`}
                        type="number"
                        value={comp.quantity}
                        onChange={(e) => onQuantityChange(comp.recipe.recipe_id, parseInt(e.target.value) || 1)}
                        className="quantity-input"
                        min="1"
                        max="10"
                        aria-label={`Antal ${comp.recipe.name}`}
                      />
                      <button
                        className="btn btn--small btn--secondary quantity-btn"
                        onClick={() => onQuantityChange(comp.recipe.recipe_id, comp.quantity + 1)}
                        disabled={comp.quantity >= 10}
                        aria-label="Öka antal"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="item-cost">
                    <span className="cost-label">Kostnad:</span>
                    <span className="cost-value">
                      {comp.recipe.cost_per_serving
                        ? formatCurrency(parseFloat(comp.recipe.cost_per_serving.toString()) * comp.quantity)
                        : 'Okänd kostnad'
                      }
                    </span>
                  </div>
                </div>

                {index < composition.length - 1 && <div className="item-separator">+</div>}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="composition-actions">
            <button
              className="btn btn--small btn--secondary"
              onClick={() => {
                // Duplicate last recipe
                const lastRecipe = composition[composition.length - 1];
                if (lastRecipe) {
                  onDrop(lastRecipe.recipe, 1);
                }
              }}
              disabled={composition.length === 0}
              title="Lägg till fler av senaste receptet"
            >
              🔄 Duplicera senaste
            </button>

            <div className="drop-zone-hint">
              <span className="hint-icon">💡</span>
              <span>Dra fler recept hit för att utöka kombinationen</span>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-icon">⬇️</div>
            <span className="drag-text">Släpp här för att lägga till recept</span>
          </div>
        </div>
      )}
    </div>
  );
}