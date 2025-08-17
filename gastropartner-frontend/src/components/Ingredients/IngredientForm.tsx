import React, { useState, useEffect } from 'react';
import './IngredientForm.css';
import { IngredientCreate, Ingredient } from '../../utils/api';
import { UNITS, renderUnitOptions } from '../../utils/units';

interface IngredientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IngredientCreate) => Promise<void>;
  isLoading?: boolean;
  editingIngredient?: Ingredient | null;
}

export function IngredientForm({ isOpen, onClose, onSubmit, isLoading = false, editingIngredient }: IngredientFormProps) {
  const [formData, setFormData] = useState<IngredientCreate>({
    name: '',
    category: '',
    unit: '',
    cost_per_unit: 0,
    supplier: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (editingIngredient) {
      setFormData({
        name: editingIngredient.name,
        category: editingIngredient.category || '',
        unit: editingIngredient.unit,
        cost_per_unit: Number(editingIngredient.cost_per_unit),
        supplier: editingIngredient.supplier || '',
        notes: editingIngredient.notes || ''
      });
    } else {
      setFormData({
        name: '',
        category: '',
        unit: '',
        cost_per_unit: 0,
        supplier: '',
        notes: ''
      });
    }
    setErrors({});
  }, [editingIngredient]);

  const categories = [
    'Kött',
    'Fisk & Skaldjur',
    'Mejeri',
    'Grönsaker',
    'Frukt & Bär',
    'Kryddor & Örter',
    'Torrvaror',
    'Bakning',
    'Drycker',
    'Övrigt'
  ];

  const units = UNITS;;;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: IngredientCreate) => ({
      ...prev,
      [name]: name === 'cost_per_unit' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Namn är obligatoriskt';
    }

    if (!formData.category) {
      newErrors.category = 'Kategori är obligatorisk';
    }

    if (!formData.unit) {
      newErrors.unit = 'Enhet är obligatorisk';
    }

    if (formData.cost_per_unit <= 0) {
      newErrors.cost_per_unit = 'Kostnad måste vara större än 0';
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
      handleClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      category: '',
      unit: '',
      cost_per_unit: 0,
      supplier: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingIngredient ? 'Redigera Ingrediens' : 'Ny Ingrediens'}</h2>
          <button 
            className="btn btn--icon btn--ghost" 
            onClick={handleClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ingredient-form">
          <div className="form-group">
            <label htmlFor="name">Namn *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="t.ex. Laxfilé"
              autoComplete="off"
              disabled={isLoading}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-row">
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
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="unit">Enhet *</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className={errors.unit ? 'error' : ''}
                disabled={isLoading}
              >
                <option value="">Välj enhet</option>
                {renderUnitOptions(units)}
              </select>
              {errors.unit && <span className="error-text">{errors.unit}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cost_per_unit">Kostnad per enhet (kr) *</label>
            <input
              id="cost_per_unit"
              name="cost_per_unit"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_per_unit}
              onChange={handleInputChange}
              className={errors.cost_per_unit ? 'error' : ''}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.cost_per_unit && <span className="error-text">{errors.cost_per_unit}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="supplier">Leverantör</label>
            <input
              id="supplier"
              name="supplier"
              type="text"
              value={formData.supplier}
              onChange={handleInputChange}
              placeholder="t.ex. ICA, Menigo, Kött & Fisk AB"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Anteckningar</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Eventuella anteckningar om ingrediensen..."
              disabled={isLoading}
            />
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
              {isLoading ? 'Sparar...' : (editingIngredient ? 'Uppdatera Ingrediens' : 'Spara Ingrediens')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}