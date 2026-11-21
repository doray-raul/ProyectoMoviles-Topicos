from django.db.models import ProtectedError
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def _first_message(value):
    """Finds the first text inside an error structure (dict or nested list).

    Empty entries are skipped: in an order with several lines, the ones without errors
    arrive as {} and the useful message may be in the second or third one.
    """
    if isinstance(value, dict):
        values = list(value.values())
    elif isinstance(value, list):
        values = value
    else:
        return str(value)
    for v in values:
        message = _first_message(v)
        if message:
            return message
    return ''


def error_handler(exc, context):
    """Gives every API error the same shape:

        {"message": "text to show", "fields": {"name": ["..."]}, "status": 400}

    - message: always has a text ready to show to the user.
    - fields: errors per form field (empty if the error is not about a field).
    This way the mobile app does not have to guess whether it gets "detail", "non_field_errors" or a field.
    """
    # Deleting something other records use (on_delete=PROTECT) raises ProtectedError,
    # which DRF does not know and would end up as a 500 error. It is turned into a clear 400.
    if isinstance(exc, ProtectedError):
        exc = ValidationError('No se puede eliminar porque otros registros dependen de él '
                              '(por ejemplo, pedidos). Puedes marcarlo como no disponible.')

    response = exception_handler(exc, context)
    if response is None:
        # Unhandled error (500): let it through so Django shows it in DEBUG mode
        return None

    data = response.data
    if isinstance(data, dict) and list(data.keys()) == ['detail']:
        fields = {}
    elif isinstance(data, dict):
        fields = {k: v for k, v in data.items() if k != 'non_field_errors'}
    else:
        fields = {}

    response.data = {
        'message': _first_message(data) or 'La petición no es válida.',
        'fields': fields,
        'status': response.status_code,
    }
    return response
