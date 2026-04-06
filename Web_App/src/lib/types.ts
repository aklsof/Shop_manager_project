/**
 * Shared TypeScript interfaces matching the hybrid_store database schema.
 */

export interface Product {
  product_id: number;
  name: string;
  description: string;
  img_url: string;
  category: string;
  category_id: number;
  default_selling_price: number;
  store_location: string | null;
  tax_category_id: number;
  tax_category_name?: string;
  tax_rate?: number;
  min_stock_threshold: number;
  created_at?: string;
  // From vw_active_price
  effective_price?: number;
  promotional_price?: number | null;
  rule_type?: string | null;
  has_active_deal?: number;
  // From vw_product_stock
  total_stock?: number;
  is_low_stock?: number;
}

export interface TaxCategory {
  tax_category_id: number;
  name: string;
  rate: number;
  created_at?: string;
}

export interface ProductCategory {
  category_id: number;
  name: string;
  created_at?: string;
}

export interface InventoryLot {
  lot_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  buying_price: number;
  date_received: string;
}

export interface PriceRule {
  rule_id: number;
  product_id: number;
  product_name?: string;
  rule_type: 'Deal' | 'Rollback' | 'Clearance' | 'Holiday';
  promotional_price: number;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at?: string;
}

export interface WebOrder {
  order_id: number;
  client_id: number;
  client_username?: string;
  handled_by?: number | null;
  handled_by_user?: string | null;
  status: 'Pending' | 'Ready for Pickup' | 'Completed';
  order_date: string;
  updated_at: string;
  items?: WebOrderItem[];
}

export interface WebOrderItem {
  order_item_id: number;
  order_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  price_at_order: number;
}

export interface InventoryAdjustment {
  adjustment_id: number;
  lot_id: number;
  user_id: number;
  quantity_adjusted: number;
  reason: string | null;
  adjustment_date: string;
}

export interface FinancialReport {
  sale_date: string;
  product_id: number;
  product_name: string;
  category: string;
  units_sold: number;
  units_refunded: number;
  revenue: number;
  cogs: number;
  tax_collected: number;
  net_profit: number;
}

export interface LowStockAlert {
  product_id: number;
  product_name: string;
  category: string;
  store_location: string | null;
  total_stock: number;
  min_stock_threshold: number;
  units_below_threshold: number;
}

export interface CartItem {
  product_id: number;
  name: string;
  effective_price: number;
  quantity: number;
}
