/**
 * BasicInfoStep - Second step of the Recipe-MenuItem Creation Wizard
 *
 * Collects basic information including name, description, category, and servings.
 * Adapts form fields based on whether user is creating a recipe or menu item.
 * Provides validation and smart suggestions for improving the input.
 */

import React, { useCallback, useState } from 'react';
import { BasicInfo } from '../../../hooks/useWizardState';
import { WizardStep, WizardStepSection, WizardStepHint } from '../WizardStep';
import './BasicInfoStep.css';

export interface BasicInfoStepProps {
  /** Current basic information data */
  basicInfo: BasicInfo;
  /** Current creation type to adapt form fields */
  creationType: 'recipe' | 'menu-item' | null;
  /** Validation errors */
  errors: string[];
  /** Loading state */
  isLoading: boolean;
  /** Called when basic info is updated */
  onBasicInfoUpdate: (basicInfo: Partial<BasicInfo>) => void;
}

const RECIPE_CATEGORIES = [
  'Grundrecept',
  'Såser och Dressingars',
  'Fyllningar',
  'Tillbehör',
  'Baser och Fond',
  'Marinad',
  'Kryddmix',
  'Drycker',
];

const MENU_ITEM_CATEGORIES = [
  'Förrätter',
  'Huvudrätter',
  'Efterrätter',
  'Sallader',
  'Smörgåsar',
  'Pizza',
  'Pasta',
  'Fisk och Skaldjur',
  'Kött och Fågel',
  'Vegetariskt',
  'Drycker',
  'Tillbehör',
];

const COMMON_SERVING_SIZES = [1, 2, 4, 6, 8, 10, 12, 16, 20, 25, 30];

export function BasicInfoStep({
  basicInfo,
  creationType,
  errors,
  isLoading,
  onBasicInfoUpdate,
}: BasicInfoStepProps) {
  const [nameError, setNameError] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<string>('');

  const categories = creationType === 'recipe' ? RECIPE_CATEGORIES : MENU_ITEM_CATEGORIES;

  // Handle name changes with validation
  const handleNameChange = useCallback((value: string) => {
    // Clear previous error
    setNameError('');

    // Basic validation
    if (value.length > 100) {
      setNameError('Namnet får inte vara längre än 100 tecken');
      return;
    }

    if (value.trim().length < 2 && value.length > 0) {
      setNameError('Namnet måste vara minst 2 tecken långt');
      return;
    }

    onBasicInfoUpdate({ name: value });
  }, [onBasicInfoUpdate]);

  // Handle description changes with validation
  const handleDescriptionChange = useCallback((value: string) => {
    // Clear previous error
    setDescriptionError('');

    // Basic validation
    if (value.length > 500) {
      setDescriptionError('Beskrivningen får inte vara längre än 500 tecken');
      return;
    }

    onBasicInfoUpdate({ description: value });
  }, [onBasicInfoUpdate]);

  // Handle category changes
  const handleCategoryChange = useCallback((value: string) => {
    onBasicInfoUpdate({ category: value });
  }, [onBasicInfoUpdate]);

  // Handle servings changes
  const handleServingsChange = useCallback((value: number) => {
    if (value < 1) return;
    if (value > 100) return;
    onBasicInfoUpdate({ servings: value });
  }, [onBasicInfoUpdate]);

  // Get appropriate hints based on creation type
  const getTypeSpecificHints = () => {
    if (creationType === 'recipe') {
      return (
        <WizardStepHint type="tip">
          <strong>Tips för grundrecept:</strong> Använd beskrivande namn som
          &quot;Klassisk Tomatsås&quot; eller &quot;Kryddig Korvfärs&quot;.
          Beskriv huvudsmaken och konsistensen så att det blir lätt att återanvända receptet.
        </WizardStepHint>
      );
    } else {
      return (
        <WizardStepHint type="tip">
          <strong>Tips för maträtter:</strong> Använd aptitretande namn som
          &quot;Krämig Laxpasta med Dill&quot; eller &quot;Grillad Kyckling med Rosmarin&quot;.
          Skriv en beskrivning som lockar kunder att beställa rätten.
        </WizardStepHint>
      );
    }
  };

  return (
    <WizardStep
      stepId="basic-info"
      title="Grundinformation"
      description={`Fyll i grundläggande information för ditt ${creationType === 'recipe' ? 'grundrecept' : 'maträtt'}`}
      isActive={true}
      isLoading={isLoading}
      errors={errors}
    >
      {getTypeSpecificHints()}

      <WizardStepSection title="Namn och beskrivning">
        <div className="basic-info-form">
          {/* Name Field */}
          <div className="form-field">
            <label htmlFor="name-input" className="form-label">
              {creationType === 'recipe' ? 'Receptnamn' : 'Rättens namn'} *
            </label>
            <input
              id="name-input"
              type="text"
              className={`form-input ${nameError ? 'form-input-error' : ''}`}
              value={basicInfo.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={
                creationType === 'recipe'
                  ? 'T.ex. Klassisk Tomatsås eller Kryddig Korvfärs'
                  : 'T.ex. Grillad Lax med Citron eller Pasta Carbonara'
              }
              maxLength={100}
              aria-describedby={nameError ? 'name-error' : 'name-help'}
              aria-invalid={nameError ? 'true' : 'false'}
              required
            />
            {nameError && (
              <div id="name-error" className="form-error" role="alert">
                {nameError}
              </div>
            )}
            <div id="name-help" className="form-help">
              {basicInfo.name?.length || 0}/100 tecken
            </div>
          </div>

          {/* Description Field */}
          <div className="form-field">
            <label htmlFor="description-input" className="form-label">
              Beskrivning
            </label>
            <textarea
              id="description-input"
              className={`form-textarea ${descriptionError ? 'form-input-error' : ''}`}
              value={basicInfo.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                creationType === 'recipe'
                  ? 'Beskriv smaken, konsistensen och användningsområden för grundreceptet...'
                  : 'Beskriv maträtten på ett sätt som lockar kunder...'
              }
              rows={4}
              maxLength={500}
              aria-describedby={descriptionError ? 'description-error' : 'description-help'}
              aria-invalid={descriptionError ? 'true' : 'false'}
            />
            {descriptionError && (
              <div id="description-error" className="form-error" role="alert">
                {descriptionError}
              </div>
            )}
            <div id="description-help" className="form-help">
              {basicInfo.description?.length || 0}/500 tecken
            </div>
          </div>
        </div>
      </WizardStepSection>

      <WizardStepSection title="Kategorisering och portioner">
        <div className="basic-info-form">
          {/* Category Field */}
          <div className="form-field">
            <label htmlFor="category-select" className="form-label">
              Kategori *
            </label>
            <select
              id="category-select"
              className="form-select"
              value={basicInfo.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Välj kategori...</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="form-help">
              Kategorin hjälper till att organisera och hitta ditt {creationType === 'recipe' ? 'recept' : 'maträtt'}
            </div>
          </div>

          {/* Servings Field */}
          <div className="form-field">
            <label htmlFor="servings-input" className="form-label">
              {creationType === 'recipe' ? 'Antal portioner detta recept ger' : 'Portionsstorlek'} *
            </label>
            <div className="servings-input-container">
              <input
                id="servings-input"
                type="number"
                className="form-input form-input-number"
                value={basicInfo.servings || ''}
                onChange={(e) => handleServingsChange(parseInt(e.target.value) || 0)}
                min="1"
                max="100"
                placeholder="1"
                required
              />
              <div className="servings-quick-select">
                <span className="servings-quick-label">Snabbval:</span>
                {COMMON_SERVING_SIZES.slice(0, 6).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`servings-quick-button ${basicInfo.servings === size ? 'active' : ''}`}
                    onClick={() => handleServingsChange(size)}
                    aria-label={`Sätt portioner till ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-help">
              {creationType === 'recipe'
                ? 'Detta påverkar kostnadsberäkningen per portion'
                : 'Storleken på en portion som serveras till kund'
              }
            </div>
          </div>
        </div>
      </WizardStepSection>

      {/* Context-specific guidance */}
      {creationType === 'recipe' && (
        <WizardStepSection>
          <WizardStepHint type="info">
            <strong>Kom ihåg:</strong> Som grundrecept kommer detta att kunna återanvändas
            i flera olika maträtter. Se till att namnet och beskrivningen är tydliga
            så att andra kan förstå vad receptet innehåller och hur det används.
          </WizardStepHint>
        </WizardStepSection>
      )}

      {creationType === 'menu-item' && (
        <WizardStepSection>
          <WizardStepHint type="info">
            <strong>Kom ihåg:</strong> Denna information kommer att synas för kunderna,
            så se till att namnet och beskrivningen är tilltalande och professionella.
          </WizardStepHint>
        </WizardStepSection>
      )}
    </WizardStep>
  );
}