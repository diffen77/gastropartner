/**
 * Recipe Hierarchy Tree Component
 *
 * Visualizes the hierarchical relationship between basic recipes and composite menu items.
 * Shows how ingredients flow into recipes, and how recipes are used in menu items.
 *
 * Features:
 * - Interactive tree with expandable/collapsible nodes
 * - Visual cost indicators per level
 * - Touch-friendly for mobile devices
 * - Drag & drop functionality for reorganization
 * - Real-time cost calculations
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Recipe, MenuItem, Ingredient } from '../../utils/api';
import { useRecipeManagement } from '../../contexts/RecipeManagementContext';
import './RecipeHierarchyTree.css';

// TypeScript interfaces for hierarchical data
export interface HierarchyNode {
  id: string;
  type: 'ingredient' | 'recipe' | 'menuitem';
  name: string;
  cost?: number;
  margin?: number;
  children: HierarchyNode[];
  isExpanded: boolean;
  level: number;
  parentId?: string;
}

export interface RecipeHierarchyData {
  roots: HierarchyNode[];
  nodeMap: Map<string, HierarchyNode>;
}

interface RecipeHierarchyTreeProps {
  className?: string;
  onNodeClick?: (node: HierarchyNode) => void;
  onNodeDragStart?: (node: HierarchyNode) => void;
  onNodeDrop?: (draggedNode: HierarchyNode, targetNode: HierarchyNode) => void;
  showCosts?: boolean;
  maxDepth?: number;
}

// Helper function to build hierarchy from flat data
const buildHierarchy = (
  ingredients: Ingredient[],
  recipes: Recipe[],
  menuItems: MenuItem[]
): RecipeHierarchyData => {
  const nodeMap = new Map<string, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  // Create ingredient nodes (leaf nodes, no children)
  ingredients.forEach(ingredient => {
    const node: HierarchyNode = {
      id: `ingredient-${ingredient.ingredient_id}`,
      type: 'ingredient',
      name: ingredient.name,
      cost: ingredient.cost_per_unit,
      children: [],
      isExpanded: false,
      level: 0
    };
    nodeMap.set(node.id, node);
  });

  // Create recipe nodes and link to ingredients
  recipes.forEach(recipe => {
    const node: HierarchyNode = {
      id: `recipe-${recipe.recipe_id}`,
      type: 'recipe',
      name: recipe.name,
      cost: recipe.cost_per_serving,
      children: [],
      isExpanded: false,
      level: 1
    };

    // Link recipe to its ingredients
    if (recipe.ingredients) {
      recipe.ingredients.forEach(recipeIngredient => {
        const ingredientNode = nodeMap.get(`ingredient-${recipeIngredient.ingredient_id}`);
        if (ingredientNode) {
          node.children.push({
            ...ingredientNode,
            level: 2,
            parentId: node.id
          });
        }
      });
    }

    nodeMap.set(node.id, node);
    roots.push(node);
  });

  // Create menu item nodes and link to recipes
  menuItems.forEach(menuItem => {
    if (menuItem.recipe_id) {
      const recipeNode = nodeMap.get(`recipe-${menuItem.recipe_id}`);
      if (recipeNode) {
        const menuNode: HierarchyNode = {
          id: `menuitem-${menuItem.menu_item_id}`,
          type: 'menuitem',
          name: menuItem.name,
          cost: menuItem.food_cost,
          margin: menuItem.margin_percentage,
          children: [{ ...recipeNode, level: recipeNode.level + 1, parentId: `menuitem-${menuItem.menu_item_id}` }],
          isExpanded: false,
          level: 0
        };
        nodeMap.set(menuNode.id, menuNode);
        roots.push(menuNode);
      }
    }
  });

  return { roots, nodeMap };
};

// Individual tree node component
interface TreeNodeProps {
  node: HierarchyNode;
  onToggle: (nodeId: string) => void;
  onNodeClick?: (node: HierarchyNode) => void;
  onDragStart?: (node: HierarchyNode) => void;
  onDrop?: (draggedNode: HierarchyNode, targetNode: HierarchyNode) => void;
  showCosts: boolean;
  draggedNode?: HierarchyNode;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onToggle,
  onNodeClick,
  onDragStart,
  onDrop,
  showCosts,
  draggedNode
}) => {
  const hasChildren = node.children.length > 0;
  const indentLevel = node.level * 24;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle(node.id);
    }
    onNodeClick?.(node);
  }, [node, onToggle, onNodeClick, hasChildren]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    onDragStart?.(node);
  }, [node, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNode && draggedNode.id !== node.id) {
      onDrop?.(draggedNode, node);
    }
  }, [draggedNode, node, onDrop]);

  const getCostDisplay = (cost?: number, margin?: number) => {
    if (!showCosts) return null;

    if (margin !== undefined) {
      return (
        <span className={`hierarchy-cost ${margin > 30 ? 'cost-good' : margin > 15 ? 'cost-warning' : 'cost-poor'}`}>
          {cost?.toFixed(2)} kr ({margin.toFixed(1)}%)
        </span>
      );
    }

    return cost !== undefined ? (
      <span className="hierarchy-cost">
        {cost.toFixed(2)} kr
      </span>
    ) : null;
  };

  const getNodeIcon = (type: string, isExpanded: boolean, hasChildren: boolean) => {
    if (hasChildren) {
      return isExpanded ? '▼' : '▶';
    }

    switch (type) {
      case 'ingredient': return '🥄';
      case 'recipe': return '📝';
      case 'menuitem': return '🍽️';
      default: return '•';
    }
  };

  return (
    <div className="tree-node-container">
      <div
        className={`tree-node tree-node-${node.type} ${node.isExpanded ? 'expanded' : ''}`}
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="treeitem"
        aria-expanded={hasChildren ? node.isExpanded : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <span className="node-icon">
          {getNodeIcon(node.type, node.isExpanded, hasChildren)}
        </span>
        <span className="node-name">{node.name}</span>
        {getCostDisplay(node.cost, node.margin)}
      </div>

      {node.isExpanded && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          onToggle={onToggle}
          onNodeClick={onNodeClick}
          onDragStart={onDragStart}
          onDrop={onDrop}
          showCosts={showCosts}
          draggedNode={draggedNode}
        />
      ))}
    </div>
  );
};

// Main component
export const RecipeHierarchyTree: React.FC<RecipeHierarchyTreeProps> = ({
  className = '',
  onNodeClick,
  onNodeDragStart,
  onNodeDrop,
  showCosts = true,
  maxDepth = 10
}) => {
  const { ingredients, recipes, menuItems, isLoading } = useRecipeManagement();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<HierarchyNode | undefined>();

  // Build hierarchy data
  const hierarchyData = useMemo(() => {
    return buildHierarchy(ingredients, recipes, menuItems);
  }, [ingredients, recipes, menuItems]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Update expanded state for nodes
  const nodesWithExpansion = useMemo(() => {
    const updateExpansion = (node: HierarchyNode): HierarchyNode => ({
      ...node,
      isExpanded: expandedNodes.has(node.id),
      children: node.children.map(updateExpansion)
    });

    return hierarchyData.roots.map(updateExpansion);
  }, [hierarchyData.roots, expandedNodes]);

  const handleDragStart = useCallback((node: HierarchyNode) => {
    setDraggedNode(node);
    onNodeDragStart?.(node);
  }, [onNodeDragStart]);

  const handleDrop = useCallback((draggedNode: HierarchyNode, targetNode: HierarchyNode) => {
    setDraggedNode(undefined);
    onNodeDrop?.(draggedNode, targetNode);
  }, [onNodeDrop]);

  if (isLoading.recipes || isLoading.ingredients || isLoading.menuItems) {
    return (
      <div className={`recipe-hierarchy-tree loading ${className}`}>
        <div className="loading-spinner">Laddar recepthierarki...</div>
      </div>
    );
  }

  if (nodesWithExpansion.length === 0) {
    return (
      <div className={`recipe-hierarchy-tree empty ${className}`}>
        <div className="empty-state">
          <span className="empty-icon">🌳</span>
          <h3>Ingen recepthierarki att visa</h3>
          <p>Skapa recept och maträtter för att se relationer här.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`recipe-hierarchy-tree ${className}`} role="tree">
      <div className="tree-header">
        <h3>Recepthierarki</h3>
        <div className="tree-legend">
          <span className="legend-item"><span className="node-icon">🍽️</span> Maträtt</span>
          <span className="legend-item"><span className="node-icon">📝</span> Recept</span>
          <span className="legend-item"><span className="node-icon">🥄</span> Ingrediens</span>
        </div>
      </div>

      <div className="tree-content">
        {nodesWithExpansion.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            onToggle={toggleNode}
            onNodeClick={onNodeClick}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            showCosts={showCosts}
            draggedNode={draggedNode}
          />
        ))}
      </div>
    </div>
  );
};

export default RecipeHierarchyTree;