from decimal import Decimal

from django.conf import settings
from django.db import models

# Note: verbose_name values stay in Spanish on purpose. They are the labels shown to the
# business in the Django admin and in validation messages, not part of the code itself.


class Supplier(models.Model):
    name = models.CharField('nombre', max_length=100, unique=True)
    phone = models.CharField('teléfono', max_length=20, blank=True)
    notes = models.CharField('notas', max_length=200, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'proveedor'
        verbose_name_plural = 'proveedores'

    def __str__(self):
        return self.name


class Supply(models.Model):
    """Ingredients, packaging and material to make merch."""

    class Type(models.TextChoices):
        INGREDIENT = 'ingredient', 'Ingrediente'
        PACKAGING = 'packaging', 'Empaque / desechables'
        MATERIAL = 'material', 'Material para merch'

    class Unit(models.TextChoices):
        KG = 'kg', 'Kilogramos'
        L = 'l', 'Litros'
        PCS = 'pcs', 'Piezas'

    name = models.CharField('nombre', max_length=120, unique=True)
    type = models.CharField('tipo', max_length=12, choices=Type.choices, default=Type.INGREDIENT)
    unit = models.CharField('unidad', max_length=4, choices=Unit.choices, default=Unit.KG)
    current_stock = models.DecimalField('stock actual', max_digits=12, decimal_places=3, default=0)
    min_stock = models.DecimalField('stock mínimo', max_digits=12, decimal_places=3, default=0,
                                    help_text='Si el stock baja de esto, se marca como "bajo stock"')
    unit_cost = models.DecimalField('costo unitario', max_digits=8, decimal_places=2, default=0)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='supplies', verbose_name='proveedor')
    active = models.BooleanField('activo', default=True)

    class Meta:
        ordering = ['type', 'name']
        verbose_name = 'insumo'
        verbose_name_plural = 'insumos'

    @property
    def low_stock(self):
        return self.current_stock <= self.min_stock

    def __str__(self):
        return f'{self.name} ({self.current_stock:g} {self.get_unit_display().lower()})'


class InventoryMovement(models.Model):
    class Type(models.TextChoices):
        IN = 'in', 'Entrada'
        OUT = 'out', 'Salida'
        ADJUSTMENT = 'adjustment', 'Ajuste'

    supply = models.ForeignKey(Supply, on_delete=models.CASCADE, related_name='movements', verbose_name='insumo')
    type = models.CharField('tipo', max_length=10, choices=Type.choices)
    quantity = models.DecimalField('cantidad', max_digits=12, decimal_places=3)
    resulting_stock = models.DecimalField('stock resultante', max_digits=12, decimal_places=3)
    reason = models.CharField('motivo', max_length=150, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                             verbose_name='usuario')
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        ordering = ['-created', '-id']
        verbose_name = 'movimiento de inventario'
        verbose_name_plural = 'movimientos de inventario'

    def __str__(self):
        return f'{self.get_type_display()} {self.quantity:g} de {self.supply.name}'


class MenuCategory(models.Model):
    name = models.CharField('nombre', max_length=80, unique=True)
    description = models.TextField('descripción', blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'categoría del menú'
        verbose_name_plural = 'categorías del menú'

    def __str__(self):
        return self.name


class Dish(models.Model):
    name = models.CharField('nombre', max_length=120, unique=True)
    description = models.TextField('descripción', blank=True)
    category = models.ForeignKey(MenuCategory, on_delete=models.PROTECT, related_name='dishes',
                                 verbose_name='categoría')
    image = models.ImageField('imagen', upload_to='dishes/', null=True, blank=True)
    spice = models.PositiveSmallIntegerField('picante', default=0, help_text='0 = no pica, 3 = muy picoso')
    featured = models.BooleanField('destacado', default=False)
    available = models.BooleanField('disponible', default=True)
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        ordering = ['-featured', 'name']
        verbose_name = 'platillo'
        verbose_name_plural = 'platillos'

    def __str__(self):
        return self.name


class Presentation(models.Model):
    """Tostada, Tostito, 1/2 L, 1 L..."""
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name='presentations', verbose_name='platillo')
    name = models.CharField('nombre', max_length=60)
    price = models.DecimalField('precio', max_digits=8, decimal_places=2)

    class Meta:
        unique_together = ('dish', 'name')
        ordering = ['price']
        verbose_name = 'presentación'
        verbose_name_plural = 'presentaciones'

    @property
    def possible_servings(self):
        """How many can be prepared with the current inventory (None = no recipe)."""
        uses = [r for r in self.recipe.all() if r.quantity > 0]
        if not uses:
            return None
        return min(int(r.supply.current_stock // r.quantity) for r in uses)

    @property
    def available_now(self):
        servings = self.possible_servings
        return self.dish.available and (servings is None or servings >= 1)

    def __str__(self):
        return f'{self.dish.name} - {self.name}'


class RecipeItem(models.Model):
    """How much supply ONE unit of this presentation uses."""
    presentation = models.ForeignKey(Presentation, on_delete=models.CASCADE, related_name='recipe',
                                     verbose_name='presentación')
    supply = models.ForeignKey(Supply, on_delete=models.PROTECT, related_name='recipe_uses', verbose_name='insumo')
    quantity = models.DecimalField('cantidad', max_digits=10, decimal_places=3)

    class Meta:
        unique_together = ('presentation', 'supply')
        verbose_name = 'ingrediente de receta'
        verbose_name_plural = 'receta'

    def __str__(self):
        return f'{self.presentation}: {self.quantity:g} {self.supply.get_unit_display().lower()} de {self.supply.name}'


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites',
                             verbose_name='usuario')
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name='favorites', verbose_name='platillo')
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        unique_together = ('user', 'dish')
        verbose_name = 'favorito'
        verbose_name_plural = 'favoritos'

    def __str__(self):
        return f'{self.user} ♥ {self.dish}'


class Review(models.Model):
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name='reviews', verbose_name='platillo')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews',
                             verbose_name='usuario')
    rating = models.PositiveSmallIntegerField('calificación')
    comment = models.TextField('comentario', blank=True)
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        unique_together = ('dish', 'user')
        ordering = ['-created']
        verbose_name = 'reseña'
        verbose_name_plural = 'reseñas'

    def __str__(self):
        return f'{self.dish} - {self.rating}★'


class StoreCategory(models.Model):
    name = models.CharField('nombre', max_length=80, unique=True)
    description = models.TextField('descripción', blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'categoría de la tienda'
        verbose_name_plural = 'categorías de la tienda'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField('nombre', max_length=120, unique=True)
    description = models.TextField('descripción', blank=True)
    category = models.ForeignKey(StoreCategory, on_delete=models.PROTECT, related_name='products',
                                 verbose_name='categoría')
    image = models.ImageField('imagen', upload_to='store/', null=True, blank=True)
    featured = models.BooleanField('destacado', default=False)
    available = models.BooleanField('disponible', default=True)
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        ordering = ['-featured', 'name']
        verbose_name = 'producto'
        verbose_name_plural = 'productos'

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    """Size / color: each one with its own price, SKU and stock."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants', verbose_name='producto')
    name = models.CharField('nombre', max_length=60, help_text='Ej. M, XG, Negra')
    sku = models.CharField('SKU', max_length=30, unique=True)
    price = models.DecimalField('precio', max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField('stock', default=0)
    min_stock = models.PositiveIntegerField('stock mínimo', default=3)

    class Meta:
        unique_together = ('product', 'name')
        ordering = ['product', 'id']
        verbose_name = 'variante (talla/color)'
        verbose_name_plural = 'variantes (talla/color)'

    @property
    def low_stock(self):
        return self.stock <= self.min_stock

    def __str__(self):
        return f'{self.product.name} - {self.name}'


class Photo(models.Model):
    """Gallery: extra real photos of a dish OR of a product."""
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, null=True, blank=True, related_name='photos',
                             verbose_name='platillo')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, related_name='photos',
                                verbose_name='producto')
    image = models.ImageField('imagen', upload_to='gallery/')
    description = models.CharField('descripción', max_length=120, blank=True)
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'foto'
        verbose_name_plural = 'galería de fotos'

    def __str__(self):
        return f'Foto de {self.dish or self.product}'


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        PREPARING = 'preparing', 'Preparando'
        READY = 'ready', 'Listo para recoger'
        DELIVERED = 'delivered', 'Entregado'
        CANCELLED = 'cancelled', 'Cancelado'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders',
                             verbose_name='usuario')
    status = models.CharField('estado', max_length=12, choices=Status.choices, default=Status.PENDING)
    note = models.CharField('nota', max_length=200, blank=True, help_text='Ej. sin cebolla, bien picoso')
    created = models.DateTimeField('creado', auto_now_add=True)

    class Meta:
        ordering = ['-created']
        verbose_name = 'pedido'
        verbose_name_plural = 'pedidos'

    @property
    def total(self):
        return sum((i.subtotal for i in self.items.all()), Decimal('0'))

    def __str__(self):
        return f'Pedido #{self.pk} - {self.user} ({self.get_status_display()})'


class OrderItem(models.Model):
    """Each line is ONE food presentation OR one merch variant."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='pedido')
    presentation = models.ForeignKey(Presentation, on_delete=models.PROTECT, null=True, blank=True,
                                     verbose_name='presentación')
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True,
                                        verbose_name='variante de producto')
    quantity = models.PositiveSmallIntegerField('cantidad', default=1)
    unit_price = models.DecimalField('precio unitario', max_digits=8, decimal_places=2)

    class Meta:
        verbose_name = 'renglón del pedido'
        verbose_name_plural = 'renglones del pedido'

    @property
    def type(self):
        return 'food' if self.presentation_id else 'merch'

    @property
    def name(self):
        return str(self.presentation) if self.presentation_id else str(self.product_variant)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f'{self.quantity} x {self.name}'
