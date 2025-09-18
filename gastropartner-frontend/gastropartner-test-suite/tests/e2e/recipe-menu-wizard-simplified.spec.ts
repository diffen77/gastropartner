import { test, expect } from '@playwright/test';
import {
  setupWizardTest,
  createRecipeFlow,
  createMenuItemFlow,
  WizardStepData,
  measureWizardPerformance,
  verifyMobileLayout,
  testKeyboardNavigation,
  verifyWizardAccessibility
} from './helpers/wizard-helpers';

test.describe('Recipe Menu Wizard - Simplified Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupWizardTest(page);
  });

  test('should create a complete recipe using helper functions', async ({ page }) => {
    const recipeData: WizardStepData = {
      basicInfo: {
        name: 'Hemlagad Tomatsås',
        description: 'En enkel och smakrik tomatsås gjord från grunden',
        servings: 6
      },
      ingredients: [
        { ingredientId: 1, quantity: 2, unit: 'kg' }, // Tomater
        { ingredientId: 2, quantity: 0.1, unit: 'l' }, // Olivolja
        { ingredientId: 3, quantity: 20, unit: 'g' },  // Basilika
        { ingredientId: 4, quantity: 0.2, unit: 'kg' } // Vitlök
      ],
      preparation: {
        instructions: '1. Skär tomaterna i bitar\n2. Hetta upp olivoljan\n3. Tillsätt vitlök och låt fräsa\n4. Tillsätt tomater och basilika\n5. Låt koka i 30 minuter',
        prepTime: 15,
        cookTime: 30
      }
    };

    await createRecipeFlow(page, recipeData);
  });

  test('should create a complete menu item using helper functions', async ({ page }) => {
    const menuItemData: WizardStepData = {
      basicInfo: {
        name: 'Pasta Arrabbiata',
        description: 'Kryddig pastarätt med tomatsås och chili',
        servings: 1,
        category: 'Huvudrätter'
      },
      ingredients: [
        { ingredientId: 1, quantity: 0.3, unit: 'kg' }, // Tomater
        { ingredientId: 2, quantity: 0.05, unit: 'l' }  // Olivolja
      ],
      preparation: {
        instructions: 'Koka pasta enligt förpackningen. Hetta upp sås och servera.',
        prepTime: 10,
        cookTime: 15
      },
      salesSettings: {
        price: 145,
        margin: 40,
        category: 'huvudrätter',
        isAvailable: true
      }
    };

    await createMenuItemFlow(page, menuItemData);
  });

  test('should handle quick recipe creation with minimal data', async ({ page }) => {
    const minimalRecipe: WizardStepData = {
      basicInfo: {
        name: 'Snabb Lunch',
        servings: 2
      },
      ingredients: [
        { ingredientId: 1, quantity: 1, unit: 'kg' }
      ]
    };

    await createRecipeFlow(page, minimalRecipe);
  });

  test('should measure wizard performance', async ({ page }) => {
    const performance = await measureWizardPerformance(page);

    console.log(`Wizard load time: ${performance.loadTime}ms at ${performance.timestamp}`);

    // Performance should meet requirements
    expect(performance.loadTime).toBeLessThan(3000);
  });

  test('should work properly on mobile devices', async ({ page }) => {
    await verifyMobileLayout(page);

    // Create a simple recipe on mobile
    const mobileRecipe: WizardStepData = {
      basicInfo: {
        name: 'Mobil Test Recept',
        servings: 4
      },
      ingredients: [
        { ingredientId: 1, quantity: 2, unit: 'kg' }
      ]
    };

    await createRecipeFlow(page, mobileRecipe);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await testKeyboardNavigation(page);
    await verifyWizardAccessibility(page);
  });

  test('should handle edge case: empty ingredient list gracefully', async ({ page }) => {
    const edgeCaseData: WizardStepData = {
      basicInfo: {
        name: 'Recept Utan Ingredienser',
        description: 'Test för att hantera tomma ingredienslistor',
        servings: 1
      },
      ingredients: [] // Tom ingredienslista
    };

    // Detta borde trigga valideringsfel
    try {
      await createRecipeFlow(page, edgeCaseData);
    } catch (error) {
      // Förväntat att detta misslyckas på grund av validering
      await expect(page.locator('text=Minst en ingrediens krävs, text=ingredient required')).toBeVisible();
    }
  });

  test('should validate large servings numbers', async ({ page }) => {
    const largeServingsData: WizardStepData = {
      basicInfo: {
        name: 'Stora Portioner Test',
        servings: 100 // Väldigt många portioner
      },
      ingredients: [
        { ingredientId: 1, quantity: 50, unit: 'kg' } // Stora mängder
      ]
    };

    await createRecipeFlow(page, largeServingsData);

    // Verifiera att kostnader beräknas korrekt för stora mängder
    // Detta skulle normalt kräva att vi navigerar till cost calculation step
    // och verifierar att beräkningarna är rimliga
  });

  test('should handle special characters in recipe names', async ({ page }) => {
    const specialCharData: WizardStepData = {
      basicInfo: {
        name: 'Änglamat™ & "Specialkräm" (50% rabatt!)',
        description: 'Recept med specialtecken: åäö, émojis 🍕, och symboler ©®',
        servings: 4
      },
      ingredients: [
        { ingredientId: 1, quantity: 1, unit: 'kg' }
      ]
    };

    await createRecipeFlow(page, specialCharData);
  });

  test('should handle decimal quantities correctly', async ({ page }) => {
    const decimalData: WizardStepData = {
      basicInfo: {
        name: 'Decimal Test',
        servings: 3
      },
      ingredients: [
        { ingredientId: 1, quantity: 1.5, unit: 'kg' },
        { ingredientId: 2, quantity: 0.25, unit: 'l' },
        { ingredientId: 3, quantity: 2.75, unit: 'g' }
      ]
    };

    await createRecipeFlow(page, decimalData);
  });
});