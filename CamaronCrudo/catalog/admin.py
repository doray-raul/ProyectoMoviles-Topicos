from django.contrib import admin
from django.utils.html import format_html

from .models import (Dish, Favorite, InventoryMovement, MenuCategory, Order, OrderItem, Photo, Presentation,
                     Product, ProductVariant, RecipeItem, Review, StoreCategory, Supplier, Supply)


@admin.display(description='Imagen')
def thumbnail(obj):
    if obj.image:
        return format_html('<img src="{}" width="50" style="border-radius:6px">', obj.image.url)
    return '—'


class PresentationInline(admin.TabularInline):
    model = Presentation
    extra = 1


class RecipeInline(admin.TabularInline):
    model = RecipeItem
    extra = 1


class ReviewInline(admin.TabularInline):
    model = Review
    extra = 0


class DishPhotoInline(admin.TabularInline):
    model = Photo
    fk_name = 'dish'
    extra = 1
    exclude = ['product']


class ProductPhotoInline(admin.TabularInline):
    model = Photo
    fk_name = 'product'
    extra = 1
    exclude = ['dish']


class VariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


class MovementInline(admin.TabularInline):
    model = InventoryMovement
    extra = 0
    max_num = 0
    can_delete = False
    readonly_fields = ['type', 'quantity', 'resulting_stock', 'reason', 'user', 'created']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'spice', 'featured', 'available', thumbnail]
    list_filter = ['category', 'available', 'featured']
    list_editable = ['featured', 'available']
    search_fields = ['name', 'description']
    inlines = [PresentationInline, DishPhotoInline, ReviewInline]


@admin.register(Presentation)
class PresentationAdmin(admin.ModelAdmin):
    list_display = ['dish', 'name', 'price', 'servings']
    list_filter = ['dish__category']
    search_fields = ['dish__name']
    inlines = [RecipeInline]

    @admin.display(description='Se pueden preparar')
    def servings(self, obj):
        p = obj.possible_servings
        return 'sin receta' if p is None else p


admin.site.register(Favorite)
admin.site.register(Review)


@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'total_stock', 'featured', 'available', thumbnail]
    list_filter = ['category', 'available', 'featured']
    list_editable = ['featured', 'available']
    search_fields = ['name']
    inlines = [VariantInline, ProductPhotoInline]

    @admin.display(description='Stock total')
    def total_stock(self, obj):
        return sum(v.stock for v in obj.variants.all())


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['product', 'name', 'sku', 'price', 'stock', 'min_stock', 'is_low']
    list_filter = ['product__category']
    list_editable = ['price', 'stock']
    search_fields = ['sku', 'product__name']

    @admin.display(boolean=True, description='¿Bajo stock?')
    def is_low(self, obj):
        return obj.low_stock


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'notes']
    search_fields = ['name']


@admin.register(Supply)
class SupplyAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'current_stock', 'unit', 'min_stock', 'is_low', 'supplier', 'active']
    list_filter = ['type', 'supplier', 'active']
    list_editable = ['min_stock', 'active']
    search_fields = ['name']
    inlines = [MovementInline]

    @admin.display(boolean=True, description='¿Bajo stock?')
    def is_low(self, obj):
        return obj.low_stock


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ['created', 'supply', 'type', 'quantity', 'resulting_stock', 'reason', 'user']
    list_filter = ['type', 'supply__type']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total_display', 'created']
    list_filter = ['status']
    list_editable = ['status']
    inlines = [OrderItemInline]
    actions = ['mark_preparing', 'mark_ready', 'mark_delivered']

    @admin.display(description='Total')
    def total_display(self, obj):
        return f'${obj.total}'

    @admin.action(description='Marcar como PREPARANDO')
    def mark_preparing(self, request, queryset):
        queryset.update(status=Order.Status.PREPARING)

    @admin.action(description='Marcar como LISTO')
    def mark_ready(self, request, queryset):
        queryset.update(status=Order.Status.READY)

    @admin.action(description='Marcar como ENTREGADO')
    def mark_delivered(self, request, queryset):
        queryset.update(status=Order.Status.DELIVERED)


admin.site.site_header = 'El Camarón Crudo - Administración'
admin.site.site_title = 'El Camarón Crudo'

# Sections of the admin home page: (title shown to the business, model class names)
SECTIONS = [
    ('🍤 Menú (Comida)', ['MenuCategory', 'Dish', 'Presentation', 'Favorite', 'Review']),
    ('👕 Tienda (Productos)', ['StoreCategory', 'Product', 'ProductVariant']),
    ('📦 Inventario (Materiales)', ['Supplier', 'Supply', 'InventoryMovement']),
    ('🧾 Ventas (Pedidos)', ['Order']),
]

_original_get_app_list = admin.site.get_app_list


def _grouped_app_list(request, app_label=None):
    """Groups the models of the admin home page into the business sections above."""
    app_list = _original_get_app_list(request, app_label)
    if app_label:
        return app_list
    models_by_name = {m['object_name']: m for app in app_list for m in app['models']}
    sections = []
    for i, (title, names) in enumerate(SECTIONS):
        group = [models_by_name.pop(n) for n in names if n in models_by_name]
        if group:
            sections.append({'name': title, 'app_label': f'section{i}', 'app_url': '/admin/',
                             'has_module_perms': True, 'models': group})
    # Whatever is left (users, groups, tokens) goes into an "accounts" section
    if models_by_name:
        sections.append({'name': '👤 Cuentas', 'app_label': 'accounts', 'app_url': '/admin/',
                         'has_module_perms': True, 'models': list(models_by_name.values())})
    return sections


admin.site.get_app_list = _grouped_app_list
