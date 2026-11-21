# Sets up the API virtual environment on this computer.
#
# Why it exists: the .venv folder cannot be copied from one PC to another, because it stores
# the path of the Python of whoever created it. If it is copied, it stops working and the terminal
# ends up using the global Python (without Django REST Framework installed).
#
# Usage (from the CamaronCrudo folder):
#   powershell -ExecutionPolicy Bypass -File .\setup_environment.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# 1. Delete the old environment if it exists
if (Test-Path '.venv') {
    Write-Host 'Borrando el entorno virtual anterior...'
    Remove-Item '.venv' -Recurse -Force
}

# 2. Create a new one with the Python of this PC.
#    The Windows "py" launcher is preferred; if it is not there, "python" is used.
Write-Host 'Creando el entorno virtual...'
if (Get-Command py -ErrorAction SilentlyContinue) {
    py -m venv .venv
} else {
    python -m venv .venv
}

# 3. Install the dependencies using the pip of the new environment (not the global one)
$python = '.\.venv\Scripts\python.exe'
Write-Host 'Instalando dependencias...'
& $python -m pip install --upgrade pip
& $python -m pip install -r requirements.txt

# 4. Apply the migrations in case a table is missing
& $python manage.py migrate

Write-Host ''
Write-Host 'Listo. Para levantar la API:'
Write-Host '  .\.venv\Scripts\Activate.ps1'
Write-Host '  python manage.py runserver'
