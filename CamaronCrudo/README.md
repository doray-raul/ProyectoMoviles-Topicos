# El Camarón Crudo - REST API (Django + Django REST Framework)

> The code and comments are in English. Texts shown to users (error messages, admin labels) stay in Spanish.

## Getting started (PowerShell)
    python -m venv .venv
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py seed_data
    python manage.py runserver

API: http://127.0.0.1:8000/api/   |   Admin: http://127.0.0.1:8000/admin/

Automatic check of the 10 project points (leaves no data in the database):

    python manage.py verify

## Test users (created by `seed_data`)
| Role | Username | Password |
|---|---|---|
| Admin (superuser) | admin | admin12345 |
| Customer | cliente | cliente12345 |

## One app (`catalog`), 4 modules
| Module | What it is | Endpoints |
|---|---|---|
| Menu | Food: dishes, presentations, recipes, favorites, reviews | /api/menu/... |
| Store | T-shirts, caps, aprons, mugs, logos, shrimp for sale | /api/store/... |
| Inventory | Materials: ingredients, packaging, merch material, suppliers | /api/inventory/... (admin) |
| Orders | Food + merch sales; deducts stock and supplies | /api/orders/, /api/stats/ |
| Gallery | Extra real photos of dishes and products | /api/photos/ |

## Professor's requirements -> where they are
| # | Requirement | File |
|---|-----------|---------|
| 1 | Authentication (Token) | views.py (RegisterView, ProfileView), urls.py (login/), settings.py |
| 2 | Models and relations | models.py |
| 3 | Admin panel | admin.py (separate sections, inlines, filters, actions) |
| 4 | Nested serializers | serializers.py (DishSerializer, ProductSerializer, SupplySerializer, OrderSerializer) |
| 5 | Search and filters | filters.py + search_fields / ordering_fields in views.py |
| 6 | Views | views.py (ViewSets, generic views, APIView) |
| 7 | Validations | serializers.py (validate_*), services.py (stock) |
| 8 | File uploads (images) | Dish.image, Product.image, Photo.image (multipart, 2 MB, JPG/PNG/WEBP) |
| 9 | Custom Action | views.py: favorite, toggle_availability, stock_in, stock_out, adjust, adjust_stock, cancel, change_status |
| 10 | Settings | camaron/settings.py |

Authentication: header `Authorization: Token <token>` (not Bearer).

## Notes for the mobile app (Expo)
- After changing `requirements.txt`, run `pip install -r requirements.txt` again (`django-cors-headers` was added).
- CORS is open while `DEBUG = True`, so the app in the browser (localhost:8081) can call the API.
- Configurable pagination: `?page=2&page_size=20` (10 by default, 50 max). Configured in `catalog/pagination.py`.
- `POST /api/register/` also returns the `token`, so the app logs in right after signing up.
- `GET /api/menu/dishes/my_favorites/` is paginated like the catalog.
- Every error has the same shape (see `catalog/exceptions.py`):

```json
{ "message": "La calificación debe estar entre 1 y 5.", "fields": { "rating": ["..."] }, "status": 400 }
```

## Data from before the English translation
The app used to be called `catalogo` (tables `catalogo_*`). Migration `catalog/migrations/0002_import_legacy_data.py`
copies those rows into the new `catalog_*` tables the first time `migrate` runs, so existing dishes, orders,
favorites and users are kept. On a new database it does nothing.
