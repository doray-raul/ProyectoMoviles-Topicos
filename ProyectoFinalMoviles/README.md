# El Camarón Crudo - App (Expo + TypeScript)

App that consumes the Django REST API (`CamaronCrudo`). It has three parts:

- **Menu**: dishes with search, filters, favorites and a detail screen with prices.
- **Store**: merch (caps, t-shirts, mugs...) with sizes/colors and stock.
- **Orders**: a cart with food and merch, placing the order and tracking its status.

The administrator can also create, edit and delete dishes and products, manage the store inventory,
move orders forward and see the dashboard with the business statistics.

> The code and comments are in English. The user interface (what the customer sees) stays in Spanish.

## How to run it

1. Start the API first (in the `CamaronCrudo` folder):

   ```
   .\.venv\Scripts\python.exe manage.py runserver
   ```

2. Install the app (first time only). The script installs the version of each package that is compatible with Expo:

   ```
   npm run install-deps
   ```

   After the first time, whoever clones the repository only needs `npm install`.

3. Open it in the browser:

   ```
   npm run web
   ```

Test users: `admin / admin12345` (sees the admin options and the Dashboard) and `cliente / cliente12345`.

If the API is at another address, create a `.env` file with:

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## Structure

```
app/                          Screens. expo-router builds the navigation from these files
  _layout.tsx                 Root: contexts + which screens are available with or without a session
  login.tsx / register.tsx    Log in and create an account
  cart.tsx                    Review the cart and place the order
  (tabs)/_layout.tsx          Bottom tabs + "Carrito" button in the header
  (tabs)/index.tsx            Menu: search, categories, ordering, spice level and pagination
  (tabs)/store.tsx            Store: search, categories, ordering and "only in stock"
  (tabs)/favorites.tsx        The user's favorite dishes
  (tabs)/orders.tsx           My orders (customer) or all orders (admin), with a status filter
  (tabs)/dashboard.tsx        Business dashboard (admin only)
  (tabs)/settings.tsx         Preferences, account data and logout
  dish/[id].tsx               Dish detail: photos, prices, add to cart, admin actions
  dish/form.tsx               Create / edit a dish (admin only)
  product/[id].tsx            Product detail: pick a size, quantity, add to cart, inventory (admin)
  product/form.tsx            Create / edit a product (admin only)
  order/[id].tsx              Order detail: progress, lines, cancel, change status (admin)

src/
  config.ts                   API URL
  theme.ts                    Colors (taken from the logo) and measurements
  types.ts                    Types of the API responses
  api/client.ts               Central fetch: token, JSON/FormData and error handling
  api/auth.ts                 login, register, profile, logout
  api/dishes.ts               Menu endpoints
  api/store.ts                Store endpoints (products, variants, stock)
  api/orders.ts               Orders and statistics
  api/image.ts                How an image is attached when uploading it (web vs. phone)
  context/AuthContext.tsx     Session (token saved in AsyncStorage)
  context/SettingsContext.tsx Preferences saved on the device
  context/CartContext.tsx     Cart: add, change quantity, remove, total
  context/ToastContext.tsx    Short confirmation messages ("Platillo creado", "Se agregó al carrito")
  hooks/useDebounce.ts        Waits until the user stops typing before searching
  hooks/useColumns.ts         How many card columns fit on the screen
  utils/                      Price and date formatting, colors and order of the order statuses
  components/                 Reusable UI pieces (Button, DishCard, ProductCard, Counter...)

assets/                       Business logo and icon
```

## Where each requirement is

| Requirement | Where |
|---|---|
| Authentication | `context/AuthContext.tsx`, `login.tsx`, `register.tsx`, `Stack.Protected` in `app/_layout.tsx` |
| Catalog | `(tabs)/index.tsx` (menu) and `(tabs)/store.tsx` (merch) |
| CRUD | Dishes: `dish/form.tsx` and `dish/[id].tsx`. Products: `product/form.tsx` and `product/[id].tsx` (also creates and deletes sizes) |
| Detail with images | `dish/[id].tsx` and `product/[id].tsx` (main image + gallery) |
| Search and filters | Menu: `?search=`, `?category=`, `?ordering=`, `?max_spice=`. Store: `?search=`, `?category=`, `?in_stock=`. Orders: `?status=` |
| Favorites | API custom action `favorite`, tab `(tabs)/favorites.tsx` |
| Configurable pagination | `components/Paginator.tsx` + `?page_size=` chosen in Settings (applies to menu, store, favorites and orders) |
| Settings | `(tabs)/settings.tsx` + `context/SettingsContext.tsx` |
| Error handling | `api/client.ts` (`ApiError`), `components/States.tsx`, per-field errors in forms, red toasts |
| UI/UX | Logo colors in `theme.ts`, buttons with text, confirmation toasts, loading / empty / error states |

API custom actions used by the app: `favorite`, `my_favorites`, `toggle_availability` (dishes and products),
`adjust_stock`, `low_stock`, `cancel` and `change_status` (orders).

## How an order travels

1. On the detail of a dish or product, "Agregar al carrito" saves the line in `CartContext`
   (only on the device, it does not touch the API yet).
2. In `cart.tsx`, "Hacer pedido" converts the cart with `toApiLines()` and calls `createOrder()`
   from `api/orders.ts`, which does `POST /api/orders/`.
3. Django checks every line, calculates prices and deducts inventory inside a transaction.
   If something is short, it returns an error (for example "Solo quedan 2 de Gorra - Negra"), nothing is saved
   and the app shows the message in the cart.
4. If it works, the cart is emptied and `order/[id].tsx` opens. The admin moves it forward with `change_status`
   and the customer sees the progress in "Mis pedidos".
