import io
import json
import shutil
import tempfile

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.test import Client
from django.test.utils import override_settings
from PIL import Image

from catalog.models import Dish, Product, ProductVariant, Supply

HOST = '127.0.0.1'


def png(filename='prueba.png'):
    """Small in-memory PNG image used to test uploads."""
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), 'red').save(buf, 'PNG')
    return SimpleUploadedFile(filename, buf.getvalue(), 'image/png')


class Command(BaseCommand):
    help = 'Comprueba automáticamente los 10 puntos del proyecto (no deja datos en la base)'

    def handle(self, *args, **kwargs):
        if not Dish.objects.exists():
            self.stderr.write('No hay datos. Primero corre: python manage.py seed_data')
            return
        tmp = tempfile.mkdtemp()
        try:
            # Everything runs inside a transaction that is rolled back at the end,
            # and uploaded images go to a temporary folder, so nothing is left behind.
            with override_settings(MEDIA_ROOT=tmp), transaction.atomic():
                results = self.run_checks()
                transaction.set_rollback(True)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        self.print_results(results)

    def post(self, url, data, headers=None):
        return self.client.post(url, json.dumps(data), content_type='application/json', **(headers or {}))

    def token(self, username):
        r = self.client.post('/api/login/', {'username': username, 'password': 'verif12345'})
        return {'HTTP_AUTHORIZATION': 'Token ' + r.json()['token']}

    def run_checks(self):
        self.client = Client(HTTP_HOST=HOST)
        self.admin_client = Client(HTTP_HOST=HOST)
        admin = User.objects.create_superuser('verif_admin', 'va@test.com', 'verif12345')
        User.objects.create_user('verif_cliente', 'vc@test.com', 'verif12345')
        self.admin_client.force_login(admin)
        self.customer_auth, self.admin_auth = self.token('verif_cliente'), self.token('verif_admin')
        self.dish = Dish.objects.filter(name='Aguachile').first() or Dish.objects.first()
        self.presentation = self.dish.presentations.first()
        self.variant = ProductVariant.objects.first()
        points = [
            ('1. Autenticación', self.check_authentication), ('2. Modelos y relaciones', self.check_models),
            ('3. Panel de administración', self.check_admin), ('4. Serializers anidados', self.check_serializers),
            ('5. Búsqueda y filtros', self.check_filters), ('6. Vistas', self.check_views),
            ('7. Validaciones', self.check_validations), ('8. Subir archivos (imágenes)', self.check_uploads),
            ('9. Custom Action (status, favoritos)', self.check_custom_actions), ('10. Settings', self.check_settings),
        ]
        output = []
        for title, fn in points:
            try:
                checks = fn()
            except Exception as e:
                checks = [(f'Error inesperado: {type(e).__name__}: {e}', False)]
            output.append((title, checks))
        return output

    def check_authentication(self):
        c, customer = self.client, self.customer_auth
        r = self.post('/api/register/', {'username': 'verif_nuevo', 'password': 'clave12345', 'email': 'vn@test.com'})
        return [
            ('Registro de usuario nuevo', r.status_code == 201),
            ('Login devuelve un token', 'token' in c.post('/api/login/', {'username': 'verif_cliente', 'password': 'verif12345'}).json()),
            ('Perfil sin token responde 401', c.get('/api/profile/').status_code == 401),
            ('Perfil con token responde 200', c.get('/api/profile/', **customer).status_code == 200),
        ]

    def check_models(self):
        c = self.client
        d = c.get(f'/api/menu/dishes/{self.dish.id}/').json()
        product = c.get('/api/store/products/').json()['results'][0]
        supply = self.admin_client.get('/api/inventory/supplies/').json()['results'][0]
        return [
            ('Platillo -> Categoría (llave foránea)', isinstance(d['category'], dict)),
            ('Platillo -> Presentaciones (uno a muchos)', len(d['presentations']) > 0),
            ('Presentación -> Receta -> Insumo (une comida con inventario)', len(d['presentations'][0]['recipe']) > 0),
            ('Producto -> Variantes con SKU y stock', len(product['variants']) > 0),
            ('Insumo -> Proveedor', supply['supplier'] is not None),
        ]

    def check_admin(self):
        ac = self.admin_client
        html = ac.get('/admin/').content.decode()
        sections = ['Menú (Comida)', 'Tienda (Productos)', 'Inventario (Materiales)', 'Ventas (Pedidos)']
        out = [(f'Sección "{s}" en el panel', s in html) for s in sections]
        for model, label in [('dish', 'platillo'), ('product', 'producto'), ('supply', 'insumo'), ('order', 'pedido')]:
            out.append((f'Lista de {label} en el admin', ac.get(f'/admin/catalog/{model}/').status_code == 200))
        out.append(('Formulario de platillo con presentaciones y fotos', ac.get('/admin/catalog/dish/add/').status_code == 200))
        return out

    def check_serializers(self):
        c = self.client
        d = c.get(f'/api/menu/dishes/{self.dish.id}/').json()
        product = c.get('/api/store/products/').json()['results'][0]
        self.variant.stock = max(self.variant.stock, 5)
        self.variant.save()
        r = self.post('/api/orders/', {'items': [{'presentation': self.presentation.id, 'quantity': 1},
                                                 {'product_variant': self.variant.id, 'quantity': 1}]},
                      self.customer_auth)
        items = r.json().get('items', [])
        return [
            ('Platillo trae categoría, presentaciones, receta y fotos anidadas',
             all(k in d for k in ['category', 'presentations', 'photos']) and 'recipe' in d['presentations'][0]),
            ('Producto trae categoría, variantes y fotos anidadas', all(k in product for k in ['category', 'variants', 'photos'])),
            ('Pedido se crea con renglones anidados (comida + merch)', r.status_code == 201 and len(items) == 2),
            ('Pedido calcula el total', r.status_code == 201 and float(r.json()['total']) > 0),
        ]

    def check_filters(self):
        c = self.client
        word = self.dish.name.split()[0]
        prices = [p['price_from'] for p in c.get('/api/menu/dishes/?ordering=base_price').json()['results']]
        store_category = c.get('/api/store/categories/').json()['results'][0]['name']
        count = lambda url: c.get(url).json()['count']
        return [
            (f'Búsqueda ?search={word}', count(f'/api/menu/dishes/?search={word}') > 0),
            (f'Filtro por categoría ({self.dish.category.name})', count(f'/api/menu/dishes/?category={self.dish.category.name}') > 0),
            ('Filtro por precio máximo', count('/api/menu/dishes/?max_price=60') > 0),
            ('Filtro por ingrediente (?supply=camar)', count('/api/menu/dishes/?supply=camar') > 0),
            ('Ordenar por precio', prices == sorted(prices)),
            ('Tienda: filtro por categoría', count(f'/api/store/products/?category={store_category}') > 0),
            ('Tienda: solo con stock', count('/api/store/products/?in_stock=true') > 0),
            ('Inventario: filtro por tipo de material', self.admin_client.get('/api/inventory/supplies/?type=material').json()['count'] > 0),
            ('Paginación activa', 'results' in c.get('/api/menu/dishes/').json()),
        ]

    def check_views(self):
        c = self.client
        stats = self.admin_client.get('/api/stats/')
        return [
            ('Índice de la API en la raíz (/)', c.get('/').status_code == 200),
            ('ViewSets: menú, tienda, inventario y pedidos', all(
                c.get(u).status_code == 200 for u in ['/api/menu/dishes/', '/api/store/products/'])
                and self.admin_client.get('/api/inventory/supplies/').status_code == 200),
            ('Vista genérica: perfil del usuario', c.get('/api/profile/', **self.customer_auth).status_code == 200),
            ('APIView: estadísticas para admin', stats.status_code == 200 and 'best_sellers' in stats.json()),
            ('Estadísticas bloqueadas para clientes (403)', c.get('/api/stats/', **self.customer_auth).status_code == 403),
            ('Inventario bloqueado para clientes (403)', c.get('/api/inventory/supplies/', **self.customer_auth).status_code == 403),
        ]

    def check_validations(self):
        customer, admin = self.customer_auth, self.admin_auth
        self.variant.stock = 2
        self.variant.save()
        return [
            ('Picante fuera de 0-3 rechazado', self.post('/api/menu/dishes/', {'name': 'Verif Malo', 'category_id': self.dish.category_id, 'spice': 9}, admin).status_code == 400),
            ('Calificación fuera de 1-5 rechazada', self.post('/api/menu/reviews/', {'dish': self.dish.id, 'rating': 9}, customer).status_code == 400),
            ('Precio negativo rechazado', self.post('/api/menu/presentations/', {'dish': self.dish.id, 'name': 'X', 'price': '-5'}, admin).status_code == 400),
            ('SKU repetido rechazado', self.post('/api/store/variants/', {'product': self.variant.product_id, 'name': 'Otra', 'sku': self.variant.sku, 'price': '100'}, admin).status_code == 400),
            ('Pedido vacío rechazado', self.post('/api/orders/', {'items': []}, customer).status_code == 400),
            ('Pedido sin stock suficiente rechazado', self.post('/api/orders/', {'items': [{'product_variant': self.variant.id, 'quantity': 5}]}, customer).status_code == 400),
            ('Renglón con comida y merch a la vez rechazado', self.post('/api/orders/', {'items': [{'presentation': self.presentation.id, 'product_variant': self.variant.id, 'quantity': 1}]}, customer).status_code == 400),
        ]

    def check_uploads(self):
        c, customer, admin = self.client, self.customer_auth, self.admin_auth
        r = c.post('/api/menu/dishes/', {'name': 'Verif Foto', 'category_id': self.dish.category_id, 'spice': 1, 'image': png()}, **admin)
        bad = c.post('/api/menu/dishes/', {'name': 'Verif Txt', 'category_id': self.dish.category_id, 'image': SimpleUploadedFile('a.txt', b'hola', 'text/plain')}, **admin)
        photo = c.post('/api/photos/', {'dish': self.dish.id, 'description': 'verif', 'image': png('g.png')}, **admin)
        without_owner = c.post('/api/photos/', {'description': 'x', 'image': png('h.png')}, **admin)
        as_customer = c.post('/api/photos/', {'dish': self.dish.id, 'image': png('i.png')}, **customer)
        product = c.post('/api/store/products/', {'name': 'Verif Producto', 'category_id': Product.objects.first().category_id, 'image': png('p.png')}, **admin)
        return [
            ('Platillo con imagen (multipart)', r.status_code == 201 and bool(r.json()['image'])),
            ('Producto de tienda con imagen', product.status_code == 201 and bool(product.json()['image'])),
            ('Foto de galería subida', photo.status_code == 201),
            ('Archivo que no es imagen rechazado', bad.status_code == 400),
            ('Foto sin platillo ni producto rechazada', without_owner.status_code == 400),
            ('Cliente no puede subir fotos (403)', as_customer.status_code == 403),
        ]

    def check_custom_actions(self):
        c, customer, admin = self.client, self.customer_auth, self.admin_auth
        fav1 = c.post(f'/api/menu/dishes/{self.dish.id}/favorite/', **customer).json()['is_favorite']
        fav2 = c.post(f'/api/menu/dishes/{self.dish.id}/favorite/', **customer).json()['is_favorite']
        s1 = c.post(f'/api/menu/dishes/{self.dish.id}/toggle_availability/', **admin).json()['available']
        s2 = c.post(f'/api/menu/dishes/{self.dish.id}/toggle_availability/', **admin).json()['available']
        supply = Supply.objects.filter(name='Camarón').first() or Supply.objects.first()
        before = supply.current_stock
        stock_in = self.post(f'/api/inventory/supplies/{supply.id}/stock_in/', {'quantity': '2', 'reason': 'verif'}, admin)
        supply.refresh_from_db()
        stock_out = self.post(f'/api/inventory/supplies/{supply.id}/stock_out/', {'quantity': '99999'}, admin)
        self.variant.stock = 10
        self.variant.save()
        adjusted = self.post(f'/api/store/variants/{self.variant.id}/adjust_stock/', {'quantity': 5}, admin).json().get('stock')
        recipe_supply = self.presentation.recipe.first().supply
        initial = recipe_supply.current_stock
        order = self.post('/api/orders/', {'items': [{'presentation': self.presentation.id, 'quantity': 2}]}, customer).json()
        recipe_supply.refresh_from_db()
        used = recipe_supply.current_stock < initial
        cancelled = c.post(f'/api/orders/{order["id"]}/cancel/', **customer).json()
        recipe_supply.refresh_from_db()
        order2 = self.post('/api/orders/', {'items': [{'presentation': self.presentation.id, 'quantity': 1}]}, customer).json()
        status_by_admin = self.post(f'/api/orders/{order2["id"]}/change_status/', {'status': 'preparing'}, admin)
        status_by_customer = self.post(f'/api/orders/{order2["id"]}/change_status/', {'status': 'ready'}, customer)
        return [
            ('Favorito: marca y desmarca', fav1 is True and fav2 is False),
            ('Status del platillo: cambia disponible/agotado', s1 != s2),
            ('Inventario: entrada de insumo', stock_in.status_code == 201 and supply.current_stock == before + 2),
            ('Inventario: salida mayor al stock rechazada', stock_out.status_code == 400),
            ('Tienda: ajustar stock de una variante', adjusted == 15),
            ('Pedido descuenta insumos de la receta', used),
            ('Cancelar pedido regresa el stock', cancelled.get('status') == 'cancelled' and recipe_supply.current_stock == initial),
            ('Admin cambia el estado de un pedido', status_by_admin.status_code == 200),
            ('Cliente no puede cambiar el estado (403)', status_by_customer.status_code == 403),
        ]

    def check_settings(self):
        rf = settings.REST_FRAMEWORK
        return [
            ('rest_framework, authtoken, django_filters y catalog instalados', all(
                a in settings.INSTALLED_APPS for a in ['rest_framework', 'rest_framework.authtoken', 'django_filters', 'catalog'])),
            ('Autenticación por token configurada', any('TokenAuthentication' in a for a in rf['DEFAULT_AUTHENTICATION_CLASSES'])),
            ('Permisos por defecto configurados', bool(rf.get('DEFAULT_PERMISSION_CLASSES'))),
            ('Filtros, búsqueda y orden configurados', len(rf['DEFAULT_FILTER_BACKENDS']) == 3),
            ('Paginación configurada', rf.get('PAGE_SIZE') == 10),
            ('Carpeta de imágenes (MEDIA) configurada', bool(settings.MEDIA_URL)),
            ('Idioma y zona horaria de México', settings.LANGUAGE_CODE == 'es-mx' and settings.TIME_ZONE == 'America/Mexico_City'),
        ]

    def print_results(self, results):
        passed = 0
        self.stdout.write('')
        for title, checks in results:
            ok = all(v for _, v in checks)
            passed += ok
            self.stdout.write((self.style.SUCCESS if ok else self.style.ERROR)(f'[{"OK" if ok else "FALLO"}] {title}'))
            for description, v in checks:
                self.stdout.write(f'      {"+" if v else "-"} {description}')
        self.stdout.write('')
        style = self.style.SUCCESS if passed == 10 else self.style.WARNING
        self.stdout.write(style(f'Puntos cumplidos: {passed}/10'))
        self.stdout.write('(Las pruebas no dejan datos en tu base.)')
