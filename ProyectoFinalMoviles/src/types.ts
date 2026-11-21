// Types that describe the API responses.
// They match the Django serializers (catalog/serializers.py).
// Note: Django DecimalField values arrive as text ("85.00").

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  description: string;
  total_dishes: number;
}

export interface RecipeIngredient {
  id: number;
  supply_name: string;
  quantity: string;
  unit: string;
}

export interface Presentation {
  id: number;
  dish: number;
  name: string;
  price: string;
  available_now: boolean;
  possible_servings: number | null;
  recipe: RecipeIngredient[];
}

export interface Photo {
  id: number;
  image: string;
  description: string;
}

export interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
  created: string;
}

export interface Dish {
  id: number;
  name: string;
  description: string;
  image: string | null;
  photos: Photo[];
  spice: number;
  featured: boolean;
  available: boolean;
  available_now: boolean;
  created: string;
  category: MenuCategory;
  price_from: number | string | null;
  presentations: Presentation[];
  average_rating: number | null;
  is_favorite: boolean;
  reviews: Review[];
}

// Shape of any Django REST Framework paginated list
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------- Store (merch) ----------

export interface StoreCategory {
  id: number;
  name: string;
  description: string;
  total_products: number;
}

/** Size / color of a product. Each variant has its own price, SKU and stock. */
export interface Variant {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
}

/** Variant as returned by /store/variants/ (includes which product it belongs to). */
export interface FullVariant extends Variant {
  product: number;
  min_stock: number;
  low_stock: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  image: string | null;
  photos: Photo[];
  featured: boolean;
  available: boolean;
  created: string;
  category: StoreCategory;
  price_from: number | string | null;
  total_stock: number;
  variants: Variant[];
}

// ---------- Orders ----------

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: number;
  presentation: number | null; // food
  product_variant: number | null; // merch
  name: string;
  type: 'food' | 'merch';
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Order {
  id: number;
  user: string;
  status: OrderStatus;
  note: string;
  items: OrderItem[];
  total: string;
  created: string;
}

// ---------- Admin dashboard ----------

export interface Stats {
  orders_by_status: Record<OrderStatus, number>;
  delivered_revenue: number | string;
  best_sellers: { name: string; sold: number }[];
  low_stock_supplies: number;
  low_stock_merch: number;
}
