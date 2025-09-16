import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { MetricsCard } from '../components/MetricsCard';
import { SearchableTable, TableColumn } from '../components/SearchableTable';
import { EmptyState } from '../components/EmptyState';
import { useTranslation } from '../localization/sv';
import { formatCurrency } from '../utils/formatting';
import { apiClient, Sale, SaleCreate, SaleItemCreate, /* MenuItem, Recipe, */ SwedishVATRate } from '../utils/api';
// Note: MenuItem and Recipe types commented out but preserved for future sales feature implementation

interface SaleFormData extends Omit<SaleCreate, 'sale_date'> {
  sale_date: string; // Form uses string format
  items: SaleItemCreate[];
}

interface ProductOption {
  id: string;
  name: string;
  type: 'recipe' | 'menu_item';
  selling_price?: number;
}

export function Sales() {
  const { translateError } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<SaleFormData>({
    sale_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    total_amount: 0,
    notes: '',
    items: []
  });

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    sale: Sale | null;
  }>({ isOpen: false, sale: null });

  // Load data
  const loadSales = async () => {
    try {
      const items = await apiClient.getSales();
      setSales(items);
      setError('');
    } catch (err) {
      console.error('Failed to load sales:', err);
      setError('Kunde inte ladda försäljning');
    }
  };

  const loadProducts = async () => {
    try {
      const [menuItems, recipes] = await Promise.all([
        apiClient.getMenuItems(),
        apiClient.getRecipes()
      ]);
      
      const productOptions: ProductOption[] = [
        ...menuItems.map(item => ({
          id: item.menu_item_id,
          name: item.name,
          type: 'menu_item' as const,
          selling_price: item.selling_price
        })),
        ...recipes.map(recipe => ({
          id: recipe.recipe_id,
          name: recipe.name,
          type: 'recipe' as const,
          selling_price: recipe.cost_per_serving // Use cost as base price
        }))
      ];
      
      setProducts(productOptions);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    loadSales();
    loadProducts();
  }, []);

  // Calculate total amount from items
  const calculateTotalAmount = (items: SaleItemCreate[]) => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Form handlers
  const handleAddItem = () => {
    const newItem: SaleItemCreate = {
      product_type: 'menu_item',
      product_id: '',
      quantity_sold: 1,
      unit_price: 0,
      total_price: 0,
      vat_rate: SwedishVATRate.FOOD_REDUCED, // Default 12% for food items
      vat_amount: 0
    };
    
    const updatedItems = [...formData.items, newItem];
    setFormData({
      ...formData,
      items: updatedItems,
      total_amount: calculateTotalAmount(updatedItems)
    });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: updatedItems,
      total_amount: calculateTotalAmount(updatedItems)
    });
  };

  const handleItemChange = (index: number, field: keyof SaleItemCreate, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total_price when quantity or unit_price changes
    if (field === 'quantity_sold' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity_sold * updatedItems[index].unit_price;
    }
    
    // Auto-set price when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product && product.selling_price) {
        updatedItems[index].unit_price = product.selling_price;
        updatedItems[index].total_price = updatedItems[index].quantity_sold * product.selling_price;
      }
    }
    
    setFormData({
      ...formData,
      items: updatedItems,
      total_amount: calculateTotalAmount(updatedItems)
    });
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (formData.items.length === 0) {
        throw new Error('Lägg till minst en produkt');
      }
      
      const saleData: SaleCreate = {
        sale_date: new Date(formData.sale_date).toISOString(),
        total_amount: formData.total_amount,
        notes: formData.notes
      };
      
      if (editingSale) {
        // Update existing sale
        await apiClient.updateSale(editingSale.sale_id, saleData);
      } else {
        // Create new sale
        await apiClient.createSale(saleData, formData.items);
      }
      
      await loadSales();
      resetForm();
      setError('');
    } catch (err: any) {
      console.error('Failed to save sale:', err);
      setError(err.message || 'Kunde inte spara försäljning');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sale_date: new Date().toISOString().split('T')[0],
      total_amount: 0,
      notes: '',
      items: []
    });
    setIsFormOpen(false);
    setEditingSale(null);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      sale_date: sale.sale_date.split('T')[0],
      total_amount: sale.total_amount,
      notes: sale.notes || '',
      items: [] // Note: Would need to load sale items separately
    });
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    try {
      await apiClient.deleteSale(sale.sale_id);
      await loadSales();
      setDeleteConfirmation({ isOpen: false, sale: null });
      setError('');
    } catch (err) {
      console.error('Failed to delete sale:', err);
      setError('Kunde inte ta bort försäljning');
    }
  };

  // Table columns
  const columns: TableColumn[] = [
    {
      key: 'sale_date',
      label: 'Datum',
      render: (value, sale) => new Date(sale.sale_date).toLocaleDateString('sv-SE')
    },
    {
      key: 'total_amount',
      label: 'Belopp',
      render: (value, sale) => formatCurrency(sale.total_amount)
    },
    {
      key: 'notes',
      label: 'Anteckningar',
      render: (value, sale) => sale.notes || '-'
    },
    {
      key: 'created_at',
      label: 'Registrerad',
      render: (value, sale) => new Date(sale.created_at).toLocaleDateString('sv-SE')
    }
  ];

  // Calculate metrics
  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const avgSaleValue = sales.length > 0 ? totalSales / sales.length : 0;
  const todaysSales = sales
    .filter(sale => new Date(sale.sale_date).toDateString() === new Date().toDateString())
    .reduce((sum, sale) => sum + sale.total_amount, 0);

  return (
    <div className="main-content">
      <PageHeader 
        title="💰 Försäljning" 
        subtitle="Registrera och hantera daglig försäljning"
      >
        <button 
          className="btn btn--primary" 
          onClick={() => setIsFormOpen(true)}
          disabled={isLoading}
        >
          Ny försäljning
        </button>
      </PageHeader>

      {error && (
        <div className="alert alert--error">
          {translateError(error)}
        </div>
      )}

      {/* Metrics */}
      <div className="metrics-grid">
        <MetricsCard
          title="Total försäljning"
          value={formatCurrency(totalSales)}
          trend={sales.length > 0 ? 'up' : 'neutral'}
          icon="💰"
        />
        <MetricsCard
          title="Genomsnittligt köp"
          value={formatCurrency(avgSaleValue)}
          trend="neutral"
          icon="📊"
        />
        <MetricsCard
          title="Dagens försäljning"
          value={formatCurrency(todaysSales)}
          trend="up"
          icon="📅"
        />
        <MetricsCard
          title="Antal transaktioner"
          value={sales.length.toString()}
          trend="up"
          icon="🧾"
        />
      </div>

      {/* Sales form */}
      {isFormOpen && (
        <div className="modal">
          <div className="modal__overlay" onClick={resetForm} />
          <div className="modal__content">
            <div className="modal__header">
              <h2>{editingSale ? 'Redigera försäljning' : 'Ny försäljning'}</h2>
              <button className="modal__close" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmitSale} className="form">
              <div className="form__group">
                <label className="form__label">Datum</label>
                <input
                  type="date"
                  className="form__input"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  required
                />
              </div>

              <div className="form__group">
                <label className="form__label">Anteckningar</label>
                <textarea
                  className="form__input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Valfri information om försäljningen..."
                />
              </div>

              {/* Sale items */}
              <div className="form__group">
                <div className="form__label-row">
                  <label className="form__label">Produkter</label>
                  <button 
                    type="button" 
                    className="btn btn--secondary btn--small"
                    onClick={handleAddItem}
                  >
                    Lägg till produkt
                  </button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="sale-item">
                    <div className="sale-item__row">
                      <select
                        className="form__input"
                        value={`${item.product_type}:${item.product_id}`}
                        onChange={(e) => {
                          const [type, id] = e.target.value.split(':');
                          handleItemChange(index, 'product_type', type as 'recipe' | 'menu_item');
                          handleItemChange(index, 'product_id', id);
                        }}
                        required
                      >
                        <option value="">Välj produkt...</option>
                        <optgroup label="Maträtter">
                          {products.filter(p => p.type === 'menu_item').map(product => (
                            <option key={product.id} value={`menu_item:${product.id}`}>
                              {product.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Recept">
                          {products.filter(p => p.type === 'recipe').map(product => (
                            <option key={product.id} value={`recipe:${product.id}`}>
                              {product.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      
                      <input
                        type="number"
                        className="form__input"
                        placeholder="Antal"
                        aria-label="Antal sålda enheter"
                        min="0.01"
                        step="0.01"
                        value={item.quantity_sold || ''}
                        onChange={(e) => handleItemChange(index, 'quantity_sold', parseFloat(e.target.value) || 0)}
                        required
                      />
                      
                      <input
                        type="number"
                        className="form__input"
                        placeholder="Pris/st"
                        aria-label="Pris per styck"
                        min="0"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                      
                      <input
                        type="number"
                        className="form__input"
                        placeholder="Totalt"
                        aria-label="Totalt pris för artikel"
                        value={item.total_price || ''}
                        readOnly
                      />
                      
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={() => handleRemoveItem(index)}
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))}
                
                {formData.items.length === 0 && (
                  <p className="text-muted">Inga produkter tillagda än. Klicka på "Lägg till produkt" för att börja.</p>
                )}
              </div>

              {/* Total amount */}
              <div className="form__group">
                <label className="form__label">Total summa</label>
                <div className="form__readonly-value">
                  {formatCurrency(formData.total_amount)}
                </div>
              </div>

              <div className="form__actions">
                <button type="button" className="btn btn--secondary" onClick={resetForm}>
                  Avbryt
                </button>
                <button type="submit" className="btn btn--primary" disabled={isLoading}>
                  {isLoading ? 'Sparar...' : editingSale ? 'Uppdatera' : 'Spara försäljning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales table */}
      {sales.length > 0 ? (
        <SearchableTable
          data={sales}
          columns={columns}
          searchPlaceholder="Sök försäljning..."
          onRowClick={handleEditSale}
        />
      ) : (
        <EmptyState
          icon="💰"
          title="Ingen försäljning registrerad än"
          description="Börja registrera din dagliga försäljning för att få insikter i din verksamhet."
          actionLabel="Registrera första försäljning"
          onAction={() => setIsFormOpen(true)}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirmation.isOpen && deleteConfirmation.sale && (
        <div className="modal">
          <div className="modal__overlay" onClick={() => setDeleteConfirmation({ isOpen: false, sale: null })} />
          <div className="modal__content">
            <div className="modal__header">
              <h2>Ta bort försäljning</h2>
              <button 
                className="modal__close" 
                onClick={() => setDeleteConfirmation({ isOpen: false, sale: null })}
              >
                ×
              </button>
            </div>
            <div className="modal__body">
              <p>
                Är du säker på att du vill ta bort försäljningen från{' '}
                {new Date(deleteConfirmation.sale.sale_date).toLocaleDateString('sv-SE')}?
              </p>
              <p>Denna åtgärd kan inte ångras.</p>
            </div>
            <div className="modal__actions">
              <button 
                className="btn btn--secondary"
                onClick={() => setDeleteConfirmation({ isOpen: false, sale: null })}
              >
                Avbryt
              </button>
              <button 
                className="btn btn--danger"
                onClick={() => handleDeleteSale(deleteConfirmation.sale!)}
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}