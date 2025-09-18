import React, { useState, useRef } from 'react';
import { Recipe } from '../../utils/api';
import { formatCurrency } from '../../utils/formatting';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onDrag: (recipe: Recipe, quantity?: number) => void;
  isDraggable?: boolean;
  isSuggestion?: boolean;
  showDetails?: boolean;
}

export function RecipeCard({
  recipe,
  onDrag,
  isDraggable = true,
  isSuggestion = false,
  showDetails = false
}: RecipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify(recipe));
    e.dataTransfer.effectAllowed = 'copy';

    // Set drag image (optional - could be customized)
    if (cardRef.current) {
      const dragImage = cardRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.transform = 'rotate(5deg)';
      dragImage.style.opacity = '0.8';
      e.dataTransfer.setDragImage(dragImage, 50, 50);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartTime(Date.now());

    // Long press to start drag simulation on mobile
    setTimeout(() => {
      if (touchStartTime && Date.now() - touchStartTime >= 500) {
        // Simulate drag start with visual feedback
        setIsDragging(true);

        // Provide haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartTime) return;

    const touchDuration = Date.now() - touchStartTime;
    setTouchStartTime(null);

    if (isDragging) {
      // Handle drop simulation
      const touch = e.changedTouches[0];
      const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

      if (dropTarget?.closest('.drag-drop-zone')) {
        onDrag(recipe, 1);
      }

      setIsDragging(false);
    } else if (touchDuration < 500) {
      // Quick tap - add directly
      onDrag(recipe, 1);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      // Prevent scrolling while dragging
      e.preventDefault();
    }
  };

  // Click handler for desktop (alternative to drag)
  const handleClick = () => {
    if (!isDraggable) return;
    onDrag(recipe, 1);
  };

  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDraggable) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDrag(recipe, 1);
    }
  };

  const getCostPerServing = () => {
    if (!recipe.cost_per_serving) return null;
    const cost = parseFloat(recipe.cost_per_serving.toString());
    return isNaN(cost) ? null : cost;
  };

  const getCostClass = () => {
    const cost = getCostPerServing();
    if (!cost) return '';

    if (cost < 15) return 'cost-low';
    if (cost < 30) return 'cost-medium';
    return 'cost-high';
  };

  const getIngredientCount = () => {
    return recipe.ingredients?.length || 0;
  };

  const getTotalTime = () => {
    const prep = recipe.prep_time_minutes || 0;
    const cook = recipe.cook_time_minutes || 0;
    return prep + cook;
  };

  return (
    <div
      ref={cardRef}
      className={`recipe-card ${isDragging ? 'recipe-card--dragging' : ''} ${
        isSuggestion ? 'recipe-card--suggestion' : ''
      } ${isDraggable ? 'recipe-card--draggable' : ''}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      tabIndex={isDraggable ? 0 : -1}
      role={isDraggable ? 'button' : 'article'}
      aria-label={isDraggable ? `Lägg till ${recipe.name} till kombinationen` : recipe.name}
      aria-describedby={showDetails ? `recipe-details-${recipe.recipe_id}` : undefined}
    >
      {/* Suggestion badge */}
      {isSuggestion && (
        <div className="recipe-card__badge">
          <span className="badge badge--suggestion">💡 Förslag</span>
        </div>
      )}

      {/* Recipe header */}
      <div className="recipe-card__header">
        <h4 className="recipe-card__title">{recipe.name}</h4>

        {getCostPerServing() && (
          <div className={`recipe-card__cost ${getCostClass()}`}>
            {formatCurrency(getCostPerServing()!)}
            <span className="cost-unit">/portion</span>
          </div>
        )}
      </div>

      {/* Recipe description */}
      {recipe.description && (
        <p className="recipe-card__description">
          {recipe.description.length > 80
            ? `${recipe.description.substring(0, 80)}...`
            : recipe.description
          }
        </p>
      )}

      {/* Recipe stats */}
      <div className="recipe-card__stats">
        <div className="stat">
          <span className="stat-icon">🍽️</span>
          <span className="stat-value">{recipe.servings}</span>
          <span className="stat-label">portioner</span>
        </div>

        <div className="stat">
          <span className="stat-icon">🥄</span>
          <span className="stat-value">{getIngredientCount()}</span>
          <span className="stat-label">ingredienser</span>
        </div>

        {getTotalTime() > 0 && (
          <div className="stat">
            <span className="stat-icon">⏱️</span>
            <span className="stat-value">{getTotalTime()}</span>
            <span className="stat-label">min</span>
          </div>
        )}
      </div>

      {/* Detailed information (expandable) */}
      {showDetails && (
        <div id={`recipe-details-${recipe.recipe_id}`} className="recipe-card__details">
          {recipe.instructions && (
            <div className="detail-section">
              <h5>Instruktioner:</h5>
              <p>{recipe.instructions.substring(0, 150)}...</p>
            </div>
          )}

          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="detail-section">
              <h5>Ingredienser:</h5>
              <ul className="ingredients-list">
                {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                  <li key={index}>
                    {ingredient.quantity} {ingredient.unit} {ingredient.ingredient?.name || 'Okänd'}
                  </li>
                ))}
                {recipe.ingredients.length > 3 && (
                  <li className="ingredients-more">
                    +{recipe.ingredients.length - 3} till...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Drag instructions */}
      {isDraggable && (
        <div className="recipe-card__instructions">
          <span className="instruction-desktop">🖱️ Dra eller klicka för att lägga till</span>
          <span className="instruction-mobile">👆 Tryck för att lägga till</span>
        </div>
      )}

      {/* Tooltip for more info */}
      {showTooltip && !showDetails && (
        <div className="recipe-card__tooltip">
          <div className="tooltip-content">
            <strong>{recipe.name}</strong>
            {recipe.description && <p>{recipe.description}</p>}
            {getCostPerServing() && (
              <div className="tooltip-cost">
                Kostnad: {formatCurrency(getCostPerServing()!)} per portion
              </div>
            )}
            {recipe.total_cost && (
              <div className="tooltip-total">
                Total: {formatCurrency(parseFloat(recipe.total_cost.toString()))} ({recipe.servings} portioner)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual drag feedback */}
      {isDragging && (
        <div className="recipe-card__drag-feedback">
          <div className="drag-icon">🎯</div>
          <span>Dra till kombinationszonen</span>
        </div>
      )}
    </div>
  );
}