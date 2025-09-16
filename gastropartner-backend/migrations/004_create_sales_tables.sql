-- Migration 004: Create Sales Tables
-- Purpose: Enable sales tracking and reporting functionality for MVP
-- Security: Multi-tenant with organization_id filtering and RLS policies

-- ===== SALES TABLE =====
CREATE TABLE IF NOT EXISTS public.sales (
    sale_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_sales_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_creator FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- ===== SALE ITEMS TABLE =====
CREATE TABLE IF NOT EXISTS public.sale_items (
    sale_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL,
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('recipe', 'menu_item')),
    product_id UUID NOT NULL,
    product_name VARCHAR(255), -- Denormalized for performance
    quantity_sold DECIMAL(10,3) NOT NULL CHECK (quantity_sold > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES public.sales(sale_id) ON DELETE CASCADE
);

-- ===== INDEXES FOR PERFORMANCE =====
-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_organization_id ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_creator_id ON public.sales(creator_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON public.sales(organization_id, sale_date);

-- Sale items indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_type, product_id);

-- ===== TRIGGERS FOR UPDATED_AT =====
-- Sales trigger
CREATE OR REPLACE FUNCTION update_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_updated_at();

-- Sale items trigger
CREATE OR REPLACE FUNCTION update_sale_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sale_items_updated_at
    BEFORE UPDATE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_items_updated_at();

-- ===== ROW LEVEL SECURITY (RLS) POLICIES =====
-- Enable RLS on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sales policies
CREATE POLICY "Users can only access their organization's sales"
    ON public.sales
    FOR ALL
    USING (
        organization_id IN (
            SELECT ou.organization_id 
            FROM public.organization_users ou 
            WHERE ou.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert sales for their organization"
    ON public.sales
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT ou.organization_id 
            FROM public.organization_users ou 
            WHERE ou.user_id = auth.uid()::text
        )
        AND creator_id = auth.uid()
    );

-- Enable RLS on sale_items table
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Sale items policies (secured through parent sale)
CREATE POLICY "Users can only access sale items through their organization's sales"
    ON public.sale_items
    FOR ALL
    USING (
        sale_id IN (
            SELECT s.sale_id 
            FROM public.sales s
            JOIN public.organization_users ou ON s.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert sale items for their organization's sales"
    ON public.sale_items
    FOR INSERT
    WITH CHECK (
        sale_id IN (
            SELECT s.sale_id 
            FROM public.sales s
            JOIN public.organization_users ou ON s.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid()::text
        )
    );

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON TABLE public.sales IS 'Sales transactions for tracking daily revenue and product performance';
COMMENT ON TABLE public.sale_items IS 'Individual line items within each sale transaction';

COMMENT ON COLUMN public.sales.organization_id IS 'Organization that owns this sale - CRITICAL for multi-tenant security';
COMMENT ON COLUMN public.sales.creator_id IS 'User who registered this sale - REQUIRED for audit trail';
COMMENT ON COLUMN public.sales.sale_date IS 'Date when the sale occurred (can be different from created_at)';
COMMENT ON COLUMN public.sales.total_amount IS 'Total amount for entire sale in organization currency';

COMMENT ON COLUMN public.sale_items.product_type IS 'Type of product sold: recipe or menu_item';
COMMENT ON COLUMN public.sale_items.product_id IS 'UUID reference to recipes or menu_items table';
COMMENT ON COLUMN public.sale_items.product_name IS 'Denormalized product name for performance and history preservation';
COMMENT ON COLUMN public.sale_items.quantity_sold IS 'Quantity sold (supports fractional amounts)';
COMMENT ON COLUMN public.sale_items.unit_price IS 'Price per unit at time of sale';
COMMENT ON COLUMN public.sale_items.total_price IS 'Total price for this line item (quantity * unit_price)';