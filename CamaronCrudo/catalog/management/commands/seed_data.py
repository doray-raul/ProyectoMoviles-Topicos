from decimal import Decimal as D

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from catalog.models import (Dish, MenuCategory, Presentation, Product, ProductVariant, RecipeItem, StoreCategory,
                            Supplier, Supply)

# Short aliases for the supply types and units used in the SUPPLIES table
ING, PKG, MAT = Supply.Type.INGREDIENT, Supply.Type.PACKAGING, Supply.Type.MATERIAL
KG, L, PCS = Supply.Unit.KG, Supply.Unit.L, Supply.Unit.PCS

SUPPLIERS = ['Pescadería del Puerto', 'Abarrotes La Central', 'Mayorista de Textiles', 'Bebidas y Envases del Norte']

# (name, type, unit, current stock, minimum stock, unit cost, index in SUPPLIERS)
SUPPLIES = [
    ('Camarón', ING, KG, 25, 4, 220, 0), ('Pescado', ING, KG, 15, 3, 120, 0),
    ('Pulpo', ING, KG, 8, 2, 260, 0), ('Callo de hacha', ING, KG, 6, 1, 380, 0),
    ('Limón', ING, KG, 20, 4, 25, 1), ('Pepino', ING, KG, 12, 3, 20, 1),
    ('Cebolla morada', ING, KG, 10, 2, 22, 1), ('Chile serrano', ING, KG, 3, D('0.5'), 45, 1),
    ('Chile de árbol', ING, KG, 2, D('0.3'), 120, 1), ('Chile habanero', ING, KG, 1, D('0.3'), 110, 1),
    ('Cilantro', ING, KG, 2, D('0.3'), 60, 1), ('Jitomate', ING, KG, 8, 2, 28, 1),
    ('Aguacate', ING, KG, 10, 2, 70, 1), ('Mango', ING, KG, 6, 1, 35, 1),
    ('Ajo', ING, KG, 2, D('0.3'), 80, 1), ('Pan molido', ING, KG, 4, 1, 40, 1),
    ('Carne de cerdo (carnitas)', ING, KG, 15, 3, 160, 1), ('Cuerito', ING, KG, 5, 1, 90, 1),
    ('Trompa', ING, KG, 4, 1, 85, 1), ('Chamoy', ING, L, D('0.5'), 1, 70, 1),
    ('Salsa macha', ING, L, 3, D('0.5'), 180, 1), ('Clamato', ING, L, 10, 2, 45, 3),
    ('Jamaica', ING, KG, 2, D('0.3'), 120, 1), ('Cerveza', ING, PCS, 120, 24, 16, 3),
    ('Refresco', ING, PCS, 80, 20, 12, 3), ('Tostadas', ING, PCS, 200, 50, D('1.5'), 1),
    ('Bolsa de Tostitos', ING, PCS, 80, 20, 18, 1), ('Envase 1/2 L', PKG, PCS, 60, 10, 4, 3),
    ('Envase 1 L', PKG, PCS, 60, 10, 6, 3), ('Playera lisa blanca', MAT, PCS, 60, 10, 85, 2),
    ('Playera lisa negra', MAT, PCS, 60, 10, 90, 2), ('Gorra lisa', MAT, PCS, 40, 8, 70, 2),
    ('Mandil liso', MAT, PCS, 30, 6, 110, 2), ('Taza blanca lisa', MAT, PCS, 48, 12, 35, 2),
    ('Termo liso', MAT, PCS, 30, 6, 130, 2), ('Vinil adhesivo', MAT, PCS, 100, 20, 8, 2),
    ('Tinta de serigrafía', MAT, L, 3, D('0.5'), 350, 2), ('Hilo para bordado', MAT, PCS, 15, 3, 25, 2),
]

# Recipes: how much of each supply ONE base serving uses (quantities in the supply unit)
AGUACHILE_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Pepino', '0.030'), ('Cebolla morada', '0.015'),
                    ('Chile serrano', '0.005'), ('Cilantro', '0.003')]
FISH_CEVICHE_RECIPE = [('Pescado', '0.050'), ('Limón', '0.030'), ('Jitomate', '0.030'), ('Cebolla morada', '0.015'),
                       ('Cilantro', '0.003')]
CARNITAS_RECIPE = [('Carne de cerdo (carnitas)', '0.070')]
CUERITO_RECIPE = [('Cuerito', '0.030'), ('Trompa', '0.030')]
GREEN_RECIPE = AGUACHILE_RECIPE + [('Aguacate', '0.020')]
RED_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Chile de árbol', '0.006'), ('Pepino', '0.030'),
              ('Cebolla morada', '0.015')]
BLACK_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Salsa macha', '0.010'), ('Cebolla morada', '0.015')]
MANGO_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Mango', '0.040'), ('Chile habanero', '0.004'),
                ('Cebolla morada', '0.015')]
MIXED_RECIPE = [('Camarón', '0.030'), ('Pulpo', '0.030'), ('Limón', '0.030'), ('Pepino', '0.030'),
                ('Chile serrano', '0.005')]
SCALLOP_RECIPE = [('Callo de hacha', '0.050'), ('Limón', '0.030'), ('Pepino', '0.030'), ('Chile serrano', '0.005')]
DIABLO_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Chile habanero', '0.006'), ('Chile de árbol', '0.006'),
                 ('Salsa macha', '0.010')]
SHRIMP_CEVICHE_RECIPE = [('Camarón', '0.050'), ('Limón', '0.030'), ('Jitomate', '0.030'), ('Cebolla morada', '0.015'),
                         ('Cilantro', '0.003')]
MIXED_CEVICHE_RECIPE = [('Pescado', '0.025'), ('Camarón', '0.025'), ('Limón', '0.030'), ('Jitomate', '0.030'),
                        ('Cebolla morada', '0.015')]
OCTOPUS_RECIPE = [('Pulpo', '0.050'), ('Limón', '0.030'), ('Cebolla morada', '0.015'), ('Chile serrano', '0.005')]


def scaled_recipe(base, factor, extras):
    """Multiplies a base recipe by a factor and adds extra supplies (tostadas, containers...)."""
    return [(name, (D(qty) * D(str(factor))).quantize(D('0.001'))) for name, qty in base] + extras


def standard_presentations(base, tostada_price, tostito_price, half_liter_price=None, liter_price=None):
    """Usual presentations of an aguachile or ceviche: Tostada, Tostito and optionally 1/2 L and 1 L."""
    result = [('Tostada', tostada_price, scaled_recipe(base, 1, [('Tostadas', 1)])),
              ('Tostito', tostito_price, scaled_recipe(base, 1.6, [('Bolsa de Tostitos', 1)]))]
    if half_liter_price:
        result.append(('1/2 L (incluye tostadas)', half_liter_price, scaled_recipe(base, 4, [('Tostadas', 6), ('Envase 1/2 L', 1)])))
    if liter_price:
        result.append(('1 L (incluye tostadas)', liter_price, scaled_recipe(base, 8, [('Tostadas', 12), ('Envase 1 L', 1)])))
    return result


def order_presentations(base, small, large, small_price, large_price,
                        small_name='Orden 6 pzas', large_name='Orden 12 pzas'):
    """Small and large order of the same dish (the large one uses twice the recipe)."""
    return [(small_name, small_price, scaled_recipe(base, 1, [])), (large_name, large_price, scaled_recipe(base, 2, []))]


# Menu category names (shown in the app)
AGUACHILES_AND_CEVICHES, SNACKS, SPECIAL_AGUACHILES = 'Aguachiles y Ceviches', 'Antojitos', 'Aguachiles Especiales'
CEVICHES_AND_COCKTAILS, SEAFOOD, DRINKS = 'Ceviches y Cocteles', 'Mariscos al Momento', 'Bebidas'

# (name, description, category, spice level, featured, presentations)
MENU = [
    ('Aguachile', 'El clásico de la casa: enchila pero no envenena.', AGUACHILES_AND_CEVICHES, 2, True, standard_presentations(AGUACHILE_RECIPE, 45, 80, 150, 250)),
    ('Ceviche de pescado', 'Pescado fresco curtido en limón.', AGUACHILES_AND_CEVICHES, 1, True, standard_presentations(FISH_CEVICHE_RECIPE, 45, 80, 130, 220)),
    ('Carnitas', 'Carnitas estilo Jerez.', SNACKS, 0, False, standard_presentations(CARNITAS_RECIPE, 45, 80)),
    ('Tostilokos', 'Tostitos preparados con todo.', SNACKS, 2, False,
     [('Tostito', 70, [('Bolsa de Tostitos', 1), ('Pepino', D('0.050')), ('Limón', D('0.020')), ('Chamoy', D('0.030'))])]),
    ('Cuerito, trompa o combinado', 'A elegir: cuerito, trompa o combinado.', SNACKS, 1, False,
     [('Tostada', 30, scaled_recipe(CUERITO_RECIPE, 1, [('Tostadas', 1)])), ('Tostito', 50, scaled_recipe(CUERITO_RECIPE, 1.6, [('Bolsa de Tostitos', 1)]))]),

    ('Aguachile Verde', 'Con aguacate y chile serrano.', SPECIAL_AGUACHILES, 2, True, standard_presentations(GREEN_RECIPE, 55, 95, 170, 290)),
    ('Aguachile Rojo', 'Chile de árbol y limón.', SPECIAL_AGUACHILES, 3, True, standard_presentations(RED_RECIPE, 55, 95, 170, 290)),
    ('Aguachile Negro', 'Con salsa macha de la casa.', SPECIAL_AGUACHILES, 2, True, standard_presentations(BLACK_RECIPE, 60, 100, 180, 310)),
    ('Aguachile de Mango Habanero', 'Dulce y picoso.', SPECIAL_AGUACHILES, 3, False, standard_presentations(MANGO_RECIPE, 60, 100, 180, 310)),
    ('Aguachile Mixto', 'Camarón y pulpo.', SPECIAL_AGUACHILES, 2, False, standard_presentations(MIXED_RECIPE, 65, 110, 190, 330)),
    ('Aguachile de Callo', 'Callo de hacha fresco.', SPECIAL_AGUACHILES, 1, False, standard_presentations(SCALLOP_RECIPE, 75, 125, 210, 370)),
    ('Aguachile Diablo', 'Habanero, árbol y salsa macha. Solo valientes.', SPECIAL_AGUACHILES, 3, False, standard_presentations(DIABLO_RECIPE, 60, 100, 180, 310)),

    ('Ceviche de camarón', 'Camarón curtido con jitomate y cilantro.', CEVICHES_AND_COCKTAILS, 1, True, standard_presentations(SHRIMP_CEVICHE_RECIPE, 55, 95, 170, 290)),
    ('Ceviche mixto', 'Pescado y camarón.', CEVICHES_AND_COCKTAILS, 1, False, standard_presentations(MIXED_CEVICHE_RECIPE, 50, 90, 150, 260)),
    ('Tostada de pulpo', 'Pulpo con cebolla y chile serrano.', CEVICHES_AND_COCKTAILS, 1, False, standard_presentations(OCTOPUS_RECIPE, 65, 110)),
    ('Coctel de camarón', 'Con salsa roja y aguacate.', CEVICHES_AND_COCKTAILS, 0, True,
     [('Chico', 120, [('Camarón', D('0.080')), ('Clamato', D('0.150')), ('Aguacate', D('0.030')), ('Envase 1/2 L', 1)]),
      ('Grande', 180, [('Camarón', D('0.140')), ('Clamato', D('0.250')), ('Aguacate', D('0.050')), ('Envase 1 L', 1)])]),
    ('Campechano', 'Camarón, pulpo y callo.', CEVICHES_AND_COCKTAILS, 0, False,
     [('Chico', 140, [('Camarón', D('0.050')), ('Pulpo', D('0.040')), ('Clamato', D('0.150')), ('Envase 1/2 L', 1)]),
      ('Grande', 210, [('Camarón', D('0.090')), ('Pulpo', D('0.070')), ('Clamato', D('0.250')), ('Envase 1 L', 1)])]),

    ('Camarones a la diabla', 'Bañados en salsa picosa.', SEAFOOD, 3, False,
     [('Orden 6 pzas', 160, [('Camarón', D('0.150')), ('Chile de árbol', D('0.010')), ('Salsa macha', D('0.020'))]),
      ('Orden 12 pzas', 290, [('Camarón', D('0.300')), ('Chile de árbol', D('0.020')), ('Salsa macha', D('0.040'))])]),
    ('Camarones empanizados', 'Crujientes, con aderezo.', SEAFOOD, 0, False,
     [('Orden 6 pzas', 150, [('Camarón', D('0.150')), ('Pan molido', D('0.050'))]),
      ('Orden 12 pzas', 280, [('Camarón', D('0.300')), ('Pan molido', D('0.100'))])]),
    ('Camarones al ajillo', 'Con mantequilla y ajo.', SEAFOOD, 1, False,
     [('Orden 6 pzas', 155, [('Camarón', D('0.150')), ('Ajo', D('0.015'))]),
      ('Orden 12 pzas', 285, [('Camarón', D('0.300')), ('Ajo', D('0.030'))])]),

    ('Michelada', 'Con clamato, limón y escarchado.', DRINKS, 1, False,
     [('Chica', 60, [('Cerveza', 1), ('Clamato', D('0.150')), ('Limón', D('0.020'))]),
      ('Grande', 90, [('Cerveza', 2), ('Clamato', D('0.250')), ('Limón', D('0.030'))])]),
    ('Clamato preparado', 'Con limón y chile.', DRINKS, 1, False,
     [('Vaso', 45, [('Clamato', D('0.250')), ('Limón', D('0.020'))])]),
    ('Agua de jamaica', 'Fresca y natural.', DRINKS, 0, False,
     [('Vaso', 25, [('Jamaica', D('0.010'))]), ('Litro', 60, [('Jamaica', D('0.040'))])]),
    ('Agua de pepino y limón', 'Refrescante.', DRINKS, 0, False,
     [('Vaso', 25, [('Pepino', D('0.050')), ('Limón', D('0.030'))]),
      ('Litro', 60, [('Pepino', D('0.200')), ('Limón', D('0.100'))])]),
    ('Cerveza', 'Botella bien fría.', DRINKS, 0, False, [('Botella', 40, [('Cerveza', 1)])]),
    ('Refresco', 'Lata.', DRINKS, 0, False, [('Lata', 25, [('Refresco', 1)])]),
]

# (name, description, category, featured, [(variant, SKU, price, stock), ...])
STORE = [
    ('Playera El Camarón Crudo', 'Playera blanca con el logo del camarón.', 'Playeras', True,
     [('CH', 'PLY-CH', 250, 10), ('M', 'PLY-M', 250, 15), ('G', 'PLY-G', 250, 15), ('XG', 'PLY-XG', 260, 8)]),
    ('Playera Enchila Pero No Envenena', 'Playera negra con la frase de la casa.', 'Playeras', True,
     [('CH', 'PEN-CH', 270, 8), ('M', 'PEN-M', 270, 12), ('G', 'PEN-G', 270, 12), ('XG', 'PEN-XG', 280, 6)]),
    ('Playera Camarón Roja', 'Playera roja oversize.', 'Playeras', False,
     [('M', 'PCR-M', 280, 10), ('G', 'PCR-G', 280, 10), ('XG', 'PCR-XG', 290, 5)]),
    ('Gorra El Camarón Crudo', 'Gorra bordada, ajustable.', 'Gorras', True,
     [('Negra', 'GOR-NEG', 200, 12), ('Roja', 'GOR-ROJ', 200, 12)]),
    ('Gorra Trucker', 'Malla trasera, logo al frente.', 'Gorras', False,
     [('Negra', 'GTR-NEG', 190, 10), ('Blanca', 'GTR-BLA', 190, 10)]),
    ('Gorra Dad Hat', 'Estilo clásico, color arena.', 'Gorras', False, [('Arena', 'GDH-ARE', 210, 8)]),
    ('Mandil El Camarón Crudo', 'Mandil negro con logo bordado.', 'Mandiles', True,
     [('Negro', 'MAN-NEG', 260, 10), ('Rojo', 'MAN-ROJ', 260, 8)]),
    ('Mandil Parrillero', 'Mandil largo con bolsa grande.', 'Mandiles', False, [('Único', 'MAP-UNI', 300, 6)]),
    ('Taza El Camarón Crudo', 'Taza de cerámica 11 oz.', 'Tazas y Termos', True,
     [('Blanca', 'TAZ-BLA', 120, 24), ('Negra', 'TAZ-NEG', 130, 18)]),
    ('Taza Mágica', 'Revela el camarón con líquido caliente.', 'Tazas y Termos', False, [('Negra', 'TMG-NEG', 160, 12)]),
    ('Termo 20 oz', 'Acero inoxidable con logo.', 'Tazas y Termos', False,
     [('Negro', 'TER-NEG', 280, 10), ('Rojo', 'TER-ROJ', 280, 10)]),
    ('Vaso Michelero', 'Vaso grande para tu michelada.', 'Tazas y Termos', False, [('Único', 'VMI-UNI', 90, 30)]),
    ('Pack de stickers', '5 stickers del camarón.', 'Logos y Stickers', False, [('Pack 5 pzas', 'STK-5', 30, 50)]),
    ('Sticker Logo Grande', 'Vinil resistente al agua.', 'Logos y Stickers', False, [('15 cm', 'STL-15', 45, 40)]),
    ('Parche Bordado Logo', 'Parche para gorras y mochilas.', 'Logos y Stickers', False, [('Único', 'PAR-UNI', 60, 30)]),
    ('Llavero Camarón', 'Llavero de acrílico.', 'Logos y Stickers', False, [('Único', 'LLA-UNI', 50, 40)]),
    ('Imán de Refri', 'Imán con el logo.', 'Logos y Stickers', False, [('Único', 'IMA-UNI', 35, 40)]),
    ('Camarón crudo pelado', 'Camarón fresco pelado y limpio.', 'Camarón en Venta', True,
     [('500 g', 'CAM-PEL-500', 190, 20), ('1 kg', 'CAM-PEL-1K', 360, 15)]),
    ('Camarón con cabeza', 'Camarón entero, fresco.', 'Camarón en Venta', False,
     [('500 g', 'CAM-CAB-500', 150, 20), ('1 kg', 'CAM-CAB-1K', 280, 15)]),
    ('Camarón cocido', 'Listo para tu coctel.', 'Camarón en Venta', False,
     [('500 g', 'CAM-COC-500', 210, 12), ('1 kg', 'CAM-COC-1K', 400, 8)]),
    ('Salsa Macha de la Casa', 'Frasco de 250 ml.', 'Camarón en Venta', False, [('250 ml', 'SAL-MAC-250', 120, 25)]),
    ('Kit Aguachile en Casa', '500 g de camarón, limones y salsa.', 'Camarón en Venta', True, [('Kit', 'KIT-AGU', 320, 10)]),
]


class Command(BaseCommand):
    help = 'Carga menú, recetas, inventario, tienda y usuarios de prueba'

    def handle(self, *args, **kwargs):
        # get_or_create / update_or_create make the command safe to run more than once
        suppliers = [Supplier.objects.get_or_create(name=name)[0] for name in SUPPLIERS]
        supplies = {}
        for name, supply_type, unit, stock, minimum, cost, supplier_index in SUPPLIES:
            supplies[name], _ = Supply.objects.get_or_create(name=name, defaults={
                'type': supply_type, 'unit': unit, 'current_stock': stock, 'min_stock': minimum,
                'unit_cost': cost, 'supplier': suppliers[supplier_index]})

        for name, description, category_name, spice, featured, presentations in MENU:
            category = MenuCategory.objects.get_or_create(name=category_name)[0]
            dish, _ = Dish.objects.get_or_create(name=name, defaults={
                'description': description, 'category': category, 'spice': spice, 'featured': featured})
            for presentation_name, price, recipe in presentations:
                presentation, _ = Presentation.objects.update_or_create(
                    dish=dish, name=presentation_name, defaults={'price': price})
                for supply_name, quantity in recipe:
                    RecipeItem.objects.update_or_create(presentation=presentation, supply=supplies[supply_name],
                                                        defaults={'quantity': quantity})

        for name, description, category_name, featured, variants in STORE:
            category = StoreCategory.objects.get_or_create(name=category_name)[0]
            product, _ = Product.objects.get_or_create(name=name, defaults={
                'description': description, 'category': category, 'featured': featured})
            for variant_name, sku, price, stock in variants:
                ProductVariant.objects.update_or_create(product=product, name=variant_name, defaults={
                    'sku': sku, 'price': price, 'stock': stock})

        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@camaroncrudo.com', 'admin12345')
        if not User.objects.filter(username='cliente').exists():
            User.objects.create_user('cliente', 'cliente@camaroncrudo.com', 'cliente12345')

        self.stdout.write(self.style.SUCCESS(
            f'Listo: {Dish.objects.count()} platillos, {Product.objects.count()} productos de tienda, '
            f'{Supply.objects.count()} insumos.'))
        self.stdout.write('Admin: admin / admin12345   |   Cliente: cliente / cliente12345')
