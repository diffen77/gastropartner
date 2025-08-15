import React, { useState } from 'react';
import './MenuItemForm.css';

interface MenuItemFormData {
  name: string;
  description: string;
  category: string;
  selling_price: number;
  target_food_cost_percentage: number;
  recipe_id?: string;
}

interface MenuItemFormErrors {
  name?: string;
  description?: string;
  category?: string;
  selling_price?: string;
  target_food_cost_percentage?: string;
  recipe_id?: string;
}

interface MenuItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  isLoading?: boolean;
}

export function MenuItemForm({ isOpen, onClose, onSubmit, isLoading = false }: MenuItemFormProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: '',
    description: '',
    category: '',
    selling_price: 0,
    target_food_cost_percentage: 30,
  });

  const [errors, setErrors] = useState<MenuItemFormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'selling_price' || name === 'target_food_cost_percentage' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof MenuItemFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: MenuItemFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Namnet är obligatoriskt';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Kategori är obligatorisk';
    }

    if (formData.selling_price <= 0) {
      newErrors.selling_price = 'Försäljningspriset måste vara större än 0';
    }

    if (formData.target_food_cost_percentage <= 0 || formData.target_food_cost_percentage > 100) {
      newErrors.target_food_cost_percentage = 'Målkostnad måste vara mellan 1-100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({
        name: '',
        description: '',
        category: '',
        selling_price: 0,
        target_food_cost_percentage: 30,
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      selling_price: 0,
      target_food_cost_percentage: 30,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    'Förrätt',
    'Huvudrätt',
    'Efterrätt',
    'Dryck',
    'Tillbehör',
    'Sallad',
    'Soppa',
    'Övrigt'
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Skapa ny matträtt</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="menu-item-form">
          <div className="form-group">
            <label htmlFor="name">Namn *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Ange maträttens namn"
              autoComplete="off"
              disabled={isLoading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Beskrivning</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Beskriv maträtten (valfritt)"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Kategori *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={errors.category ? 'error' : ''}
              disabled={isLoading}
            >
              <option value="">Välj kategori</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="selling_price">Försäljningspris (kr) *</label>
              <input
                type="number"
                id="selling_price"
                name="selling_price"
                value={formData.selling_price || ''}
                onChange={handleInputChange}
                className={errors.selling_price ? 'error' : ''}
                placeholder="0"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
              {errors.selling_price && <span className="error-message">{errors.selling_price}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="target_food_cost_percentage">Målkostnad (%) *</label>
              <input
                type="number"
                id="target_food_cost_percentage"
                name="target_food_cost_percentage"
                value={formData.target_food_cost_percentage || ''}
                onChange={handleInputChange}
                className={errors.target_food_cost_percentage ? 'error' : ''}
                placeholder="30"
                min="1"
                max="100"
                step="1"
                disabled={isLoading}
              />
              {errors.target_food_cost_percentage && <span className="error-message">{errors.target_food_cost_percentage}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn--secondary" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Avbryt
            </button>
            <button 
              type="submit" 
              className="btn btn--primary"
              disabled={isLoading}
            >
              {isLoading ? 'Skapar...' : 'Skapa matträtt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}