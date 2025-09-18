/**
 * Recipe Management Module - Integrated Tab-Based Interface
 *
 * This module consolidates the previously separate Ingredients, Recipes, and MenuItems
 * pages into a unified tabbed interface. It provides:
 *
 * - Centralized state management via RecipeManagementContext
 * - Dependency-aware data synchronization (ingredients → recipes → menu items)
 * - URL-based tab navigation with backward compatibility
 * - Consistent UI/UX patterns across all recipe-related functionality
 *
 * Architecture:
 * - RecipeManagementProvider: Context for shared state and actions
 * - Tab Components: Individual functionality modules (IngredientsTab, RecipesTab, MenuItemsTab)
 * - URL Integration: Direct linking to specific tabs via query parameters
 *
 * Migration Notes:
 * - /ingredienser → /recepthantering?tab=ingredients
 * - /recept → /recepthantering?tab=recipes
 * - /matratter → /recepthantering?tab=menu-items
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { OrganizationSelector } from '../components/Organizations/OrganizationSelector';
import { RecipeManagementProvider } from '../contexts/RecipeManagementContext';

// Tab content components - each encapsulates complete functionality from original pages
import IngredientsTab from '../components/RecipeManagement/IngredientsTab';
import RecipesTab from '../components/RecipeManagement/RecipesTab';
import MenuItemsTab from '../components/RecipeManagement/MenuItemsTab';
import { HierarchyTab } from '../components/RecipeManagement/HierarchyTab';

// Type definitions for tab management system
export type RecipeManagementTab = 'ingredients' | 'recipes' | 'menu-items' | 'hierarchy';

/**
 * Configuration interface for tab management system
 * Each tab requires a unique key, display label, icon, and component
 */
interface TabConfig {
  key: RecipeManagementTab;           // Unique identifier for the tab
  label: string;                      // Display name in navigation
  icon: string;                       // Emoji icon for visual identification
  component: React.ComponentType<TabContentProps>; // React component to render
}

/**
 * Props passed to each tab component
 * isActive: Whether this tab is currently visible/active (used for conditional loading)
 */
interface TabContentProps {
  isActive: boolean;
}

/**
 * Internal component that handles the main recipe management interface
 * This component is wrapped by RecipeManagementProvider for context access
 */
function RecipeManagementContent() {
  // Active tab state - defaults to ingredients (first tab)
  const [activeTab, setActiveTab] = useState<RecipeManagementTab>('ingredients');

  // Tab configuration - memoized to prevent unnecessary re-renders
  // Order matters: ingredients → recipes → menu items (follows dependency chain)
  const tabs: TabConfig[] = useMemo(() => [
    {
      key: 'ingredients',
      label: 'Ingredienser',
      icon: '🥬',
      component: IngredientsTab,
    },
    {
      key: 'recipes',
      label: 'Recept',
      icon: '📝',
      component: RecipesTab,
    },
    {
      key: 'menu-items',
      label: 'Maträtter',
      icon: '🍽️',
      component: MenuItemsTab,
    },
    {
      key: 'hierarchy',
      label: 'Hierarki',
      icon: '🌳',
      component: HierarchyTab,
    },
  ], []);

  // URL parameter handling for direct tab navigation and bookmarking
  // Supports URLs like: /recepthantering?tab=recipes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as RecipeManagementTab;

    // Only set tab if it's a valid tab key
    if (tabParam && tabs.some(tab => tab.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabs]);

  // Update URL when user switches tabs manually
  // This enables bookmarking and back/forward browser navigation
  const handleTabChange = (tabKey: RecipeManagementTab) => {
    setActiveTab(tabKey);

    // Update browser URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabKey);
    window.history.pushState({}, '', url.toString());
  };

  // Find the currently active tab configuration and component
  const activeTabConfig = tabs.find(tab => tab.key === activeTab);
  const ActiveComponent = activeTabConfig?.component;

  return (
    <div className="main-content">
      {/* Page header with integrated recipe management branding */}
      <PageHeader
        title="🏗️ Recepthantering"
        subtitle="Hantera ingredienser, recept och maträtter i en integrerad vy"
      />

      <div className="modules-container">
        {/* Multi-tenant organization selector */}
        <OrganizationSelector />

        {/* Main tab navigation and content area */}
        <div className="recipe-management-tabs">
          {/* Horizontal tab navigation bar */}
          <div className="tab-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
                type="button"
                aria-label={`Switch to ${tab.label} tab`}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Dynamic tab content area */}
          <div className="tab-content">
            {ActiveComponent && (
              <ActiveComponent
                isActive={true} // Always true for rendered component
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Recipe Management component with context provider
 *
 * This is the primary export that wraps the interface with RecipeManagementProvider
 * to provide centralized state management and dependency-aware data synchronization
 * across all tabs.
 *
 * Usage: Import and use in routing as <Route path="/recepthantering" element={<RecipeManagement />} />
 */
export function RecipeManagement() {
  return (
    <RecipeManagementProvider>
      <RecipeManagementContent />
    </RecipeManagementProvider>
  );
}

// Export types for use by tab components and other related modules
export type { TabContentProps };