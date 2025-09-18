/**
 * Creation Type Step - First step of the Recipe-MenuItem Creation Wizard
 *
 * Helps users choose between creating a "recipe" (grundrecept) or "menu-item" (sammansatt maträtt).
 * This step eliminates the confusion between recipes and menu items by clearly explaining
 * the differences and use cases for each option.
 *
 * Features:
 * - Clear visual distinction between options
 * - Contextual explanations with use cases
 * - Examples for each creation type
 * - Smart recommendations based on user input
 * - Mobile-friendly touch interface
 */

import React, { useCallback } from 'react';
import { CreationType } from '../../../hooks/useWizardState';
import { WizardStep, WizardStepSection, WizardStepHint } from '../WizardStep';
import './CreationTypeStep.css';

export interface CreationTypeStepProps {
  /** Currently selected creation type */
  selectedType: CreationType | null;
  /** Validation errors */
  errors: string[];
  /** Loading state */
  isLoading: boolean;
  /** Called when creation type is selected */
  onTypeSelect: (type: CreationType) => void;
}

interface CreationOption {
  id: CreationType;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  useCases: string[];
  benefits: string[];
  limitations: string[];
}

const CREATION_OPTIONS: CreationOption[] = [
  {
    id: 'recipe',
    title: 'Grundrecept',
    subtitle: 'Återanvändbar komponent',
    description: 'Skapa ett grundrecept som kan användas som byggsten i flera olika maträtter. Perfekt för standardkomponenter som sås, fyllning eller tillbehör.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="creation-option-icon">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    examples: [
      'Tomatsås',
      'Korvfärs',
      'Potatismos',
      'Vitlökssås',
      'Grönsaksbas'
    ],
    useCases: [
      'När du vill återanvända samma komponent i flera maträtter',
      'För standardtillbehör som serveras med många rätter',
      'När du vill centralisera kostnadsberäkningar för grundkomponenter',
      'För ingredienskombinationer som ofta används tillsammans'
    ],
    benefits: [
      'Återanvändning i flera maträtter',
      'Centraliserad kostnadshantering',
      'Automatisk kostnadsuppdatering när receptet ändras',
      'Enklare att underhålla standardkomponenter'
    ],
    limitations: [
      'Kräver extra steg för att använda i maträtt',
      'Mer komplext för engångsrätter',
      'Kan vara överkomplicerat för enkla ingredienser'
    ]
  },
  {
    id: 'menu-item',
    title: 'Sammansatt maträtt',
    subtitle: 'Komplett försäljningsprodukt',
    description: 'Skapa en komplett maträtt som kan säljas direkt till kunder. Inkluderar prissättning, kategorisering och alla nödvändiga försäljningsdetaljer.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="creation-option-icon">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    examples: [
      'Korv med mos',
      'Lasagne med sallad',
      'Kyckling med ris',
      'Vegetarisk pasta',
      'Fiskgratäng'
    ],
    useCases: [
      'När du skapar en komplett rätt för försäljning',
      'För unika kombinationer som inte återanvänds',
      'När du behöver sätta pris och kategori direkt',
      'För menyrätter med specifika portionsstorlekar'
    ],
    benefits: [
      'Direkt försäljningsklar',
      'Inkluderar prissättning och marginaler',
      'Enklare för engångsrätter',
      'Komplett produktinformation'
    ],
    limitations: [
      'Svårare att återanvända komponenter',
      'Mer manuellt arbete vid komponentändringar',
      'Kan bli duplicerat innehåll mellan liknande rätter'
    ]
  }
];

export function CreationTypeStep({
  selectedType,
  errors,
  isLoading,
  onTypeSelect,
}: CreationTypeStepProps) {
  const handleTypeSelect = useCallback((type: CreationType) => {
    onTypeSelect(type);
  }, [onTypeSelect]);

  return (
    <WizardStep
      stepId="creation-type"
      title="Vad vill du skapa?"
      description="Välj mellan grundrecept eller sammansatt maträtt baserat på hur du planerar att använda det du skapar."
      isActive={true}
      isLoading={isLoading}
      errors={errors}
    >
      <WizardStepHint type="info">
        <strong>Behöver du vägledning?</strong> Grundrecept används som byggstenar i flera maträtter,
        medan sammansatta maträtter är kompletta produkter redo för försäljning.
      </WizardStepHint>

      <WizardStepSection>
        <div className="creation-options">
          {CREATION_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={`creation-option ${selectedType === option.id ? 'selected' : ''}`}
              onClick={() => handleTypeSelect(option.id)}
              role="button"
              tabIndex={0}
              aria-pressed={selectedType === option.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTypeSelect(option.id);
                }
              }}
            >
              {/* Option Header */}
              <div className="creation-option-header">
                <div className="creation-option-icon-container">
                  {option.icon}
                </div>
                <div className="creation-option-titles">
                  <h3 className="creation-option-title">{option.title}</h3>
                  <p className="creation-option-subtitle">{option.subtitle}</p>
                </div>
                <div className="creation-option-selector">
                  <div className="creation-option-radio">
                    {selectedType === option.id && (
                      <div className="creation-option-radio-dot" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option Description */}
              <div className="creation-option-content">
                <p className="creation-option-description">{option.description}</p>

                {/* Examples */}
                <div className="creation-option-section">
                  <h4 className="creation-option-section-title">Exempel:</h4>
                  <div className="creation-option-examples">
                    {option.examples.map((example, index) => (
                      <span key={index} className="creation-option-example">
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div className="creation-option-section">
                  <h4 className="creation-option-section-title">Använd när:</h4>
                  <ul className="creation-option-list">
                    {option.useCases.map((useCase, index) => (
                      <li key={index} className="creation-option-list-item">
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits and Limitations */}
                {selectedType === option.id && (
                  <div className="creation-option-details">
                    <div className="creation-option-benefits">
                      <h4 className="creation-option-section-title">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="creation-option-detail-icon">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Fördelar:
                      </h4>
                      <ul className="creation-option-list creation-option-list-benefits">
                        {option.benefits.map((benefit, index) => (
                          <li key={index} className="creation-option-list-item">
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="creation-option-limitations">
                      <h4 className="creation-option-section-title">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="creation-option-detail-icon">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Begränsningar:
                      </h4>
                      <ul className="creation-option-list creation-option-list-limitations">
                        {option.limitations.map((limitation, index) => (
                          <li key={index} className="creation-option-list-item">
                            {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </WizardStepSection>

      {/* Smart Recommendations */}
      {selectedType && (
        <WizardStepSection>
          <div className="creation-recommendation">
            <div className="creation-recommendation-header">
              <svg viewBox="0 0 20 20" fill="currentColor" className="creation-recommendation-icon">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h3 className="creation-recommendation-title">
                Bra val! {selectedType === 'recipe' ? 'Grundrecept' : 'Sammansatt maträtt'}
              </h3>
            </div>
            <p className="creation-recommendation-description">
              {selectedType === 'recipe'
                ? 'Du skapar ett återanvändbart grundrecept som kan användas som komponent i flera olika maträtter. Detta ger dig flexibilitet och effektiv kostnadshantering.'
                : 'Du skapar en komplett maträtt redo för försäljning. Detta inkluderar alla nödvändiga försäljningsdetaljer som pris, kategori och beskrivning.'
              }
            </p>

            {selectedType === 'recipe' && (
              <WizardStepHint type="tip">
                <strong>Pro-tips för grundrecept:</strong> Efter att du skapat detta grundrecept kan du
                enkelt återanvända det i flera maträtter. Kostnadsändringar uppdateras automatiskt
                i alla maträtter som använder receptet.
              </WizardStepHint>
            )}

            {selectedType === 'menu-item' && (
              <WizardStepHint type="tip">
                <strong>Pro-tips för maträtter:</strong> Du kan använda befintliga grundrecept som
                komponenter i din maträtt. Detta sparar tid och säkerställer konsistenta kostnader.
              </WizardStepHint>
            )}
          </div>
        </WizardStepSection>
      )}
    </WizardStep>
  );
}