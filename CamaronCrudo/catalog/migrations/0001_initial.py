import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MenuCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, unique=True, verbose_name='nombre')),
                ('description', models.TextField(blank=True, verbose_name='descripción')),
            ],
            options={
                'verbose_name': 'categoría del menú',
                'verbose_name_plural': 'categorías del menú',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='StoreCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, unique=True, verbose_name='nombre')),
                ('description', models.TextField(blank=True, verbose_name='descripción')),
            ],
            options={
                'verbose_name': 'categoría de la tienda',
                'verbose_name_plural': 'categorías de la tienda',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Supplier',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='nombre')),
                ('phone', models.CharField(blank=True, max_length=20, verbose_name='teléfono')),
                ('notes', models.CharField(blank=True, max_length=200, verbose_name='notas')),
            ],
            options={
                'verbose_name': 'proveedor',
                'verbose_name_plural': 'proveedores',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Supply',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='nombre')),
                ('type', models.CharField(choices=[('ingredient', 'Ingrediente'), ('packaging', 'Empaque / desechables'), ('material', 'Material para merch')], default='ingredient', max_length=12, verbose_name='tipo')),
                ('unit', models.CharField(choices=[('kg', 'Kilogramos'), ('l', 'Litros'), ('pcs', 'Piezas')], default='kg', max_length=4, verbose_name='unidad')),
                ('current_stock', models.DecimalField(decimal_places=3, default=0, max_digits=12, verbose_name='stock actual')),
                ('min_stock', models.DecimalField(decimal_places=3, default=0, help_text='Si el stock baja de esto, se marca como "bajo stock"', max_digits=12, verbose_name='stock mínimo')),
                ('unit_cost', models.DecimalField(decimal_places=2, default=0, max_digits=8, verbose_name='costo unitario')),
                ('active', models.BooleanField(default=True, verbose_name='activo')),
                ('supplier', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='supplies', to='catalog.supplier', verbose_name='proveedor')),
            ],
            options={
                'verbose_name': 'insumo',
                'verbose_name_plural': 'insumos',
                'ordering': ['type', 'name'],
            },
        ),
        migrations.CreateModel(
            name='InventoryMovement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('in', 'Entrada'), ('out', 'Salida'), ('adjustment', 'Ajuste')], max_length=10, verbose_name='tipo')),
                ('quantity', models.DecimalField(decimal_places=3, max_digits=12, verbose_name='cantidad')),
                ('resulting_stock', models.DecimalField(decimal_places=3, max_digits=12, verbose_name='stock resultante')),
                ('reason', models.CharField(blank=True, max_length=150, verbose_name='motivo')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('supply', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movements', to='catalog.supply', verbose_name='insumo')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='usuario')),
            ],
            options={
                'verbose_name': 'movimiento de inventario',
                'verbose_name_plural': 'movimientos de inventario',
                'ordering': ['-created', '-id'],
            },
        ),
        migrations.CreateModel(
            name='Dish',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='nombre')),
                ('description', models.TextField(blank=True, verbose_name='descripción')),
                ('image', models.ImageField(blank=True, null=True, upload_to='dishes/', verbose_name='imagen')),
                ('spice', models.PositiveSmallIntegerField(default=0, help_text='0 = no pica, 3 = muy picoso', verbose_name='picante')),
                ('featured', models.BooleanField(default=False, verbose_name='destacado')),
                ('available', models.BooleanField(default=True, verbose_name='disponible')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dishes', to='catalog.menucategory', verbose_name='categoría')),
            ],
            options={
                'verbose_name': 'platillo',
                'verbose_name_plural': 'platillos',
                'ordering': ['-featured', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Presentation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=60, verbose_name='nombre')),
                ('price', models.DecimalField(decimal_places=2, max_digits=8, verbose_name='precio')),
                ('dish', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='presentations', to='catalog.dish', verbose_name='platillo')),
            ],
            options={
                'verbose_name': 'presentación',
                'verbose_name_plural': 'presentaciones',
                'ordering': ['price'],
                'unique_together': {('dish', 'name')},
            },
        ),
        migrations.CreateModel(
            name='RecipeItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=3, max_digits=10, verbose_name='cantidad')),
                ('presentation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recipe', to='catalog.presentation', verbose_name='presentación')),
                ('supply', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='recipe_uses', to='catalog.supply', verbose_name='insumo')),
            ],
            options={
                'verbose_name': 'ingrediente de receta',
                'verbose_name_plural': 'receta',
                'unique_together': {('presentation', 'supply')},
            },
        ),
        migrations.CreateModel(
            name='Favorite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('dish', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorites', to='catalog.dish', verbose_name='platillo')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorites', to=settings.AUTH_USER_MODEL, verbose_name='usuario')),
            ],
            options={
                'verbose_name': 'favorito',
                'verbose_name_plural': 'favoritos',
                'unique_together': {('user', 'dish')},
            },
        ),
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.PositiveSmallIntegerField(verbose_name='calificación')),
                ('comment', models.TextField(blank=True, verbose_name='comentario')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('dish', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='catalog.dish', verbose_name='platillo')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to=settings.AUTH_USER_MODEL, verbose_name='usuario')),
            ],
            options={
                'verbose_name': 'reseña',
                'verbose_name_plural': 'reseñas',
                'ordering': ['-created'],
                'unique_together': {('dish', 'user')},
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='nombre')),
                ('description', models.TextField(blank=True, verbose_name='descripción')),
                ('image', models.ImageField(blank=True, null=True, upload_to='store/', verbose_name='imagen')),
                ('featured', models.BooleanField(default=False, verbose_name='destacado')),
                ('available', models.BooleanField(default=True, verbose_name='disponible')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='products', to='catalog.storecategory', verbose_name='categoría')),
            ],
            options={
                'verbose_name': 'producto',
                'verbose_name_plural': 'productos',
                'ordering': ['-featured', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ProductVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Ej. M, XG, Negra', max_length=60, verbose_name='nombre')),
                ('sku', models.CharField(max_length=30, unique=True, verbose_name='SKU')),
                ('price', models.DecimalField(decimal_places=2, max_digits=8, verbose_name='precio')),
                ('stock', models.PositiveIntegerField(default=0, verbose_name='stock')),
                ('min_stock', models.PositiveIntegerField(default=3, verbose_name='stock mínimo')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='catalog.product', verbose_name='producto')),
            ],
            options={
                'verbose_name': 'variante (talla/color)',
                'verbose_name_plural': 'variantes (talla/color)',
                'ordering': ['product', 'id'],
                'unique_together': {('product', 'name')},
            },
        ),
        migrations.CreateModel(
            name='Photo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='gallery/', verbose_name='imagen')),
                ('description', models.CharField(blank=True, max_length=120, verbose_name='descripción')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('dish', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='catalog.dish', verbose_name='platillo')),
                ('product', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='catalog.product', verbose_name='producto')),
            ],
            options={
                'verbose_name': 'foto',
                'verbose_name_plural': 'galería de fotos',
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pendiente'), ('preparing', 'Preparando'), ('ready', 'Listo para recoger'), ('delivered', 'Entregado'), ('cancelled', 'Cancelado')], default='pending', max_length=12, verbose_name='estado')),
                ('note', models.CharField(blank=True, help_text='Ej. sin cebolla, bien picoso', max_length=200, verbose_name='nota')),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='creado')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to=settings.AUTH_USER_MODEL, verbose_name='usuario')),
            ],
            options={
                'verbose_name': 'pedido',
                'verbose_name_plural': 'pedidos',
                'ordering': ['-created'],
            },
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveSmallIntegerField(default=1, verbose_name='cantidad')),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=8, verbose_name='precio unitario')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='catalog.order', verbose_name='pedido')),
                ('presentation', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='catalog.presentation', verbose_name='presentación')),
                ('product_variant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='catalog.productvariant', verbose_name='variante de producto')),
            ],
            options={
                'verbose_name': 'renglón del pedido',
                'verbose_name_plural': 'renglones del pedido',
            },
        ),
    ]
