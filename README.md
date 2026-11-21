# El Camarón Crudo

Final project: an Expo mobile/web app that talks to a Django REST Framework API.

| Folder | What it is | Runs with |
|---|---|---|
| `CamaronCrudo/` | REST API (Django + Django REST Framework), SQLite database, admin panel | Python 3.12+ |
| `ProyectoFinalMoviles/` | App (Expo + React Native + TypeScript) | Node.js 20 LTS+ |

The code and comments are in English; the user interface is in Spanish.

## Quick start (Windows / PowerShell)

**1. API** - in `CamaronCrudo` (first time only):

```
powershell -ExecutionPolicy Bypass -File .\setup_environment.ps1
.\.venv\Scripts\Activate.ps1
python manage.py seed_data
```

**2. App** - in `ProyectoFinalMoviles` (first time only):

```
npm install
```

**3. Every time** - two terminals:

```
# Terminal 1, in CamaronCrudo
.\.venv\Scripts\Activate.ps1
python manage.py runserver

# Terminal 2, in ProyectoFinalMoviles
npm run web
```

Test users: `admin / admin12345` and `cliente / cliente12345`.

If PowerShell says that running scripts is disabled, run first:
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`

More details in each folder's README.
