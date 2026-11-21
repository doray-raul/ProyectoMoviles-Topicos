import { request } from './client';
import { appendImage, SelectedImage } from './image';
import { StoreCategory, Page, Product, FullVariant } from '@/types';

export interface ProductFilters {
  search: string;
  category: string | null;
  ordering: string;
  inStockOnly: boolean;
  page: number;
  pageSize: number;
}

/**
 * GET /api/store/products/
 * The filters come from ProductFilter (filters.py): category, in_stock, min_price, max_price.
 */
export function listProducts(filters: ProductFilters) {
  return request<Page<Product>>('/store/products/', {
    params: {
      search: filters.search.trim(),
      category: filters.category,
      ordering: filters.ordering,
      in_stock: filters.inStockOnly ? 'true' : undefined,
      page: filters.page,
      page_size: filters.pageSize,
    },
  });
}

export function getProduct(id: number) {
  return request<Product>(`/store/products/${id}/`);
}

export async function listStoreCategories() {
  const page = await request<Page<StoreCategory>>('/store/categories/', { params: { page_size: 50 } });
  return page.results;
}

/** Custom action (admin only): toggles whether the product can be bought or not. */
export function toggleProductAvailability(id: number) {
  return request<{ id: number; available: boolean }>(`/store/products/${id}/toggle_availability/`, {
    method: 'POST',
  });
}

export function deleteProduct(id: number) {
  return request<void>(`/store/products/${id}/`, { method: 'DELETE' });
}

export interface ProductInput {
  name: string;
  description: string;
  categoryId: number;
  featured: boolean;
  available: boolean;
  image: SelectedImage | null; // null = the image was not changed
}

/** Creates (POST) or edits (PATCH) a product. Sent as multipart because it may include an image. */
export async function saveProduct(data: ProductInput, id?: number) {
  const form = new FormData();
  form.append('name', data.name.trim());
  form.append('description', data.description.trim());
  form.append('category_id', String(data.categoryId));
  form.append('featured', String(data.featured));
  form.append('available', String(data.available));
  if (data.image) await appendImage(form, data.image);

  if (id) {
    return request<Product>(`/store/products/${id}/`, { method: 'PATCH', body: form });
  }
  return request<Product>('/store/products/', { method: 'POST', body: form });
}

// ---------- Variants (sizes / colors) ----------

export interface VariantInput {
  name: string;
  sku: string;
  price: string;
  stock: string;
}

/** POST /api/store/variants/ -> adds a size or color to a product. */
export function createVariant(productId: number, data: VariantInput) {
  return request<FullVariant>('/store/variants/', {
    method: 'POST',
    body: {
      product: productId,
      name: data.name.trim(),
      sku: data.sku.trim(),
      price: data.price,
      stock: Number(data.stock) || 0,
    },
  });
}

export function deleteVariant(id: number) {
  return request<void>(`/store/variants/${id}/`, { method: 'DELETE' });
}

/**
 * Custom action (admin only): adds or removes stock from a variant.
 * positive quantity = merchandise arrived, negative = it went out.
 */
export function adjustStock(id: number, quantity: number) {
  return request<{ id: number; sku: string; stock: number; low_stock: boolean }>(
    `/store/variants/${id}/adjust_stock/`,
    { method: 'POST', body: { quantity } },
  );
}

/** GET /api/store/variants/low_stock/ -> variants that need restocking. */
export function listLowStockVariants() {
  return request<FullVariant[]>('/store/variants/low_stock/');
}
