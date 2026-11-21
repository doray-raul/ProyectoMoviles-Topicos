import { request } from './client';
import { appendImage, SelectedImage } from './image';
import { MenuCategory, Page, Dish, Presentation } from '@/types';

export interface DishFilters {
  search: string;
  category: string | null;
  ordering: string;
  maxSpice: number | null;
  availableOnly: boolean;
  page: number;
  pageSize: number;
}

/**
 * GET /api/menu/dishes/
 * Each screen filter is translated into the parameter Django understands:
 * search (SearchFilter), ordering (OrderingFilter), and the ones from DishFilter (filters.py).
 */
export function listDishes(filters: DishFilters) {
  return request<Page<Dish>>('/menu/dishes/', {
    params: {
      search: filters.search.trim(),
      category: filters.category,
      ordering: filters.ordering,
      max_spice: filters.maxSpice,
      available: filters.availableOnly ? 'true' : undefined,
      page: filters.page,
      page_size: filters.pageSize,
    },
  });
}

/** GET /api/menu/dishes/my_favorites/ (paginated like the catalog) */
export function listFavorites(page: number, pageSize: number) {
  return request<Page<Dish>>('/menu/dishes/my_favorites/', {
    params: { page, page_size: pageSize },
  });
}

export function getDish(id: number) {
  return request<Dish>(`/menu/dishes/${id}/`);
}

/** Categories are paginated too; 50 are requested to get all of them at once. */
export async function listMenuCategories() {
  const page = await request<Page<MenuCategory>>('/menu/categories/', { params: { page_size: 50 } });
  return page.results;
}

/** Custom action: adds or removes the dish from favorites (toggle). */
export function toggleFavorite(id: number) {
  return request<{ dish: number; is_favorite: boolean }>(`/menu/dishes/${id}/favorite/`, {
    method: 'POST',
  });
}

/** Custom action (admin only): toggles whether the dish is available or not. */
export function toggleDishAvailability(id: number) {
  return request<{ id: number; available: boolean }>(`/menu/dishes/${id}/toggle_availability/`, {
    method: 'POST',
  });
}

export function deleteDish(id: number) {
  return request<void>(`/menu/dishes/${id}/`, { method: 'DELETE' });
}

// ---------- Create and edit ----------

export interface DishInput {
  name: string;
  description: string;
  categoryId: number;
  spice: number;
  featured: boolean;
  available: boolean;
  image: SelectedImage | null; // null = the image was not changed
}

/**
 * Creates (POST) or edits (PATCH) a dish.
 * It is sent as multipart/form-data because it may include an image.
 */
export async function saveDish(data: DishInput, id?: number) {
  const form = new FormData();
  form.append('name', data.name.trim());
  form.append('description', data.description.trim());
  form.append('category_id', String(data.categoryId));
  form.append('spice', String(data.spice));
  form.append('featured', String(data.featured));
  form.append('available', String(data.available));
  if (data.image) await appendImage(form, data.image);

  if (id) {
    return request<Dish>(`/menu/dishes/${id}/`, { method: 'PATCH', body: form });
  }
  return request<Dish>('/menu/dishes/', { method: 'POST', body: form });
}

/** POST /api/menu/presentations/ -> the price lives in the presentation, not in the dish. */
export function createPresentation(dishId: number, name: string, price: string) {
  return request<Presentation>('/menu/presentations/', {
    method: 'POST',
    body: { dish: dishId, name: name.trim(), price },
  });
}
