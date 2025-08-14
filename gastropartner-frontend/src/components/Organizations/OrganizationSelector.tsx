/**
 * Organization selector component för multitenant support
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function OrganizationSelector() {
  const {
    organizations,
    currentOrganization,
    createOrganization,
  } = useAuth();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await createOrganization(
        createFormData.name,
        createFormData.description || undefined
      );
      
      setCreateFormData({ name: '', description: '' });
      setShowCreateForm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (organizations.length === 0 && !showCreateForm) {
    return (
      <div className="org-selector org-selector--empty">
        <div className="org-selector__empty">
          <h3>Välkommen till GastroPartner!</h3>
          <p>Du behöver skapa en organisation för att komma igång.</p>
          <button
            className="org-selector__create-btn"
            onClick={() => setShowCreateForm(true)}
          >
            Skapa din första organisation
          </button>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="org-selector org-selector--create">
        <form onSubmit={handleCreateSubmit} className="org-create-form">
          <h3>Skapa ny organisation</h3>
          
          {error && (
            <div className="org-create-form__error">
              {error}
            </div>
          )}

          <div className="org-create-form__field">
            <label htmlFor="name">Organisationsnamn</label>
            <input
              type="text"
              id="name"
              name="name"
              value={createFormData.name}
              onChange={handleCreateInputChange}
              required
              disabled={creating}
              placeholder="T.ex. Min Restaurang"
            />
          </div>

          <div className="org-create-form__field">
            <label htmlFor="description">Beskrivning (valfritt)</label>
            <textarea
              id="description"
              name="description"
              value={createFormData.description}
              onChange={handleCreateInputChange}
              disabled={creating}
              placeholder="Kort beskrivning av verksamheten"
              rows={3}
            />
          </div>

          <div className="org-create-form__actions">
            <button
              type="button"
              className="org-create-form__cancel"
              onClick={() => {
                setShowCreateForm(false);
                setError(null);
                setCreateFormData({ name: '', description: '' });
              }}
              disabled={creating}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="org-create-form__submit"
              disabled={creating || !createFormData.name.trim()}
            >
              {creating ? 'Skapar...' : 'Skapa organisation'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="org-selector">
      <div className="org-selector__current">
        <label>Din organisation:</label>
        <div className="org-selector__name">
          {currentOrganization ? currentOrganization.name : 'Ingen organisation'}
        </div>
      </div>

      {currentOrganization && (
        <div className="org-selector__info">
          <div className="org-info">
            <h4>{currentOrganization.name}</h4>
            {currentOrganization.description && (
              <p className="org-info__description">
                {currentOrganization.description}
              </p>
            )}
            <div className="org-info__limits">
              <span className="org-info__limit">
                Ingredienser: {currentOrganization.current_ingredients}/{currentOrganization.max_ingredients}
              </span>
              <span className="org-info__limit">
                Recept: {currentOrganization.current_recipes}/{currentOrganization.max_recipes}
              </span>
              <span className="org-info__limit">
                Maträtter: {currentOrganization.current_menu_items}/{currentOrganization.max_menu_items}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}