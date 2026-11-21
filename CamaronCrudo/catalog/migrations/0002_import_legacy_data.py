"""Copies the data of the old Spanish-named app ("catalogo") into the new tables.

Before the code was translated to English, the app was called "catalogo" and its tables
were named catalogo_platillo, catalogo_pedido, etc. This migration copies every row into the
new catalog_* tables (keeping the same ids, so all relations stay valid) and translates the
stored choice values (for example "pendiente" -> "pending").

It only runs when the old tables exist and the new ones are still empty, so on a fresh
database it does nothing. The old tables are left untouched as a backup.
"""
from django.db import migrations

# (new table, new columns, SELECT expression over the old table, old table)
COPIES = [
    ('catalog_menucategory', 'id, name, description',
     'id, nombre, descripcion', 'catalogo_categoriamenu'),
    ('catalog_storecategory', 'id, name, description',
     'id, nombre, descripcion', 'catalogo_categoriatienda'),
    ('catalog_supplier', 'id, name, phone, notes',
     'id, nombre, telefono, notas', 'catalogo_proveedor'),
    ('catalog_supply', 'id, name, type, unit, current_stock, min_stock, unit_cost, active, supplier_id',
     "id, nombre, "
     "CASE tipo WHEN 'ingrediente' THEN 'ingredient' WHEN 'empaque' THEN 'packaging' ELSE tipo END, "
     "CASE unidad WHEN 'pza' THEN 'pcs' ELSE unidad END, "
     "stock_actual, stock_minimo, costo_unitario, activo, proveedor_id", 'catalogo_insumo'),
    ('catalog_inventorymovement', 'id, type, quantity, resulting_stock, reason, created, supply_id, user_id',
     "id, CASE tipo WHEN 'entrada' THEN 'in' WHEN 'salida' THEN 'out' WHEN 'ajuste' THEN 'adjustment' ELSE tipo END, "
     "cantidad, stock_resultante, motivo, creado, insumo_id, usuario_id", 'catalogo_movimientoinventario'),
    ('catalog_dish', 'id, name, description, image, spice, featured, available, created, category_id',
     'id, nombre, descripcion, imagen, picante, destacado, disponible, creado, categoria_id', 'catalogo_platillo'),
    ('catalog_presentation', 'id, name, price, dish_id',
     'id, nombre, precio, platillo_id', 'catalogo_presentacion'),
    ('catalog_recipeitem', 'id, quantity, supply_id, presentation_id',
     'id, cantidad, insumo_id, presentacion_id', 'catalogo_recetaitem'),
    ('catalog_favorite', 'id, created, user_id, dish_id',
     'id, creado, usuario_id, platillo_id', 'catalogo_favorito'),
    ('catalog_review', 'id, rating, comment, created, dish_id, user_id',
     'id, calificacion, comentario, creado, platillo_id, usuario_id', 'catalogo_resena'),
    ('catalog_product', 'id, name, description, image, featured, available, created, category_id',
     'id, nombre, descripcion, imagen, destacado, disponible, creado, categoria_id', 'catalogo_producto'),
    ('catalog_productvariant', 'id, name, sku, price, stock, min_stock, product_id',
     'id, nombre, sku, precio, stock, stock_minimo, producto_id', 'catalogo_varianteproducto'),
    ('catalog_photo', 'id, image, description, created, dish_id, product_id',
     'id, imagen, descripcion, creado, platillo_id, producto_id', 'catalogo_foto'),
    ('catalog_order', 'id, status, note, created, user_id',
     "id, CASE estado WHEN 'pendiente' THEN 'pending' WHEN 'preparando' THEN 'preparing' "
     "WHEN 'listo' THEN 'ready' WHEN 'entregado' THEN 'delivered' WHEN 'cancelado' THEN 'cancelled' "
     "ELSE estado END, nota, creado, usuario_id", 'catalogo_pedido'),
    ('catalog_orderitem', 'id, quantity, unit_price, order_id, presentation_id, product_variant_id',
     'id, cantidad, precio_unitario, pedido_id, presentacion_id, variante_producto_id', 'catalogo_itempedido'),
]


def import_legacy_data(apps, schema_editor):
    connection = schema_editor.connection
    existing = set(connection.introspection.table_names())
    if 'catalogo_categoriamenu' not in existing:
        return  # fresh database: nothing to import
    with connection.cursor() as cursor:
        cursor.execute('SELECT COUNT(*) FROM catalog_menucategory')
        if cursor.fetchone()[0]:
            return  # the new tables already have data
        for new_table, new_columns, select, old_table in COPIES:
            if old_table in existing:
                cursor.execute(f'INSERT INTO {new_table} ({new_columns}) SELECT {select} FROM {old_table}')


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(import_legacy_data, migrations.RunPython.noop),
    ]
