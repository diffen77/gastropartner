/**
 * Hierarchy Tab Component
 *
 * Wrapper component for RecipeHierarchyTree that follows the same pattern
 * as other tab components in the RecipeManagement system.
 */

import React from 'react';
import { RecipeHierarchyTree } from './RecipeHierarchyTree';

interface HierarchyTabProps {
  isActive: boolean;
}

export const HierarchyTab: React.FC<HierarchyTabProps> = ({ isActive }) => {
  if (!isActive) {
    return null;
  }

  return (
    <div className="hierarchy-tab">
      <RecipeHierarchyTree
        className="recipe-hierarchy-main"
        onNodeClick={(node) => {
          console.log('Node clicked:', node);
          // Future enhancement: Navigate to edit forms based on node type
        }}
        showCosts={true}
      />
    </div>
  );
};

export default HierarchyTab;