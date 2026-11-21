from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import (Dish, InventoryMovement, MenuCategory, Order, OrderItem, Photo, Presentation, Product,
                     ProductVariant, RecipeItem, Review, StoreCategory, Supplier, Supply)
from .services import deduct_item


def check_image(image):
    """Max 2 MB and only JPG / PNG / WEBP (used for dishes, products and the gallery)."""
    if image:
        if image.size > settings.MAX_UPLOAD_SIZE:
            raise serializers.ValidationError('La imagen no debe pesar más de 2 MB.')
        content_type = getattr(image, 'content_type', '')
        if content_type and content_type not in ('image/jpeg', 'image/png', 'image/webp'):
            raise serializers.ValidationError('Solo se permiten imágenes JPG, PNG o WEBP.')
    return image


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese correo.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'is_active', 'date_joined']


class SupplierSerializer(serializers.ModelSerializer):
    total_supplies = serializers.IntegerField(source='supplies.count', read_only=True)

    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'notes', 'total_supplies']


class SupplySerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), source='supplier',
        write_only=True, required=False, allow_null=True)
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Supply
        fields = ['id', 'name', 'type', 'unit', 'current_stock', 'min_stock',
                  'unit_cost', 'low_stock', 'supplier', 'supplier_id', 'active']

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError('El nombre es muy corto.')
        return value.strip()

    def _not_negative(self, value, field_label):
        if value < 0:
            raise serializers.ValidationError(f'{field_label} no puede ser negativo.')
        return value

    def validate_current_stock(self, value):
        return self._not_negative(value, 'El stock')

    def validate_min_stock(self, value):
        return self._not_negative(value, 'El stock mínimo')

    def validate_unit_cost(self, value):
        return self._not_negative(value, 'El costo')


class MovementSerializer(serializers.ModelSerializer):
    supply = serializers.StringRelatedField()
    user = serializers.StringRelatedField()

    class Meta:
        model = InventoryMovement
        fields = ['id', 'supply', 'type', 'quantity', 'resulting_stock', 'reason', 'user', 'created']


class QuantitySerializer(serializers.Serializer):
    """Body for stock in / stock out."""
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal('0.001'))
    reason = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')


class AdjustmentSerializer(serializers.Serializer):
    """Body for an adjustment (physical count): sets the stock to that quantity."""
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal('0'))
    reason = serializers.CharField(max_length=150, required=False, allow_blank=True, default='Conteo físico')


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ['id', 'dish', 'product', 'image', 'description', 'created']

    def validate_image(self, image):
        return check_image(image)

    def validate(self, data):
        # In a partial PATCH, the fields that are not sent are taken from the existing photo
        dish = data.get('dish', getattr(self.instance, 'dish', None))
        product = data.get('product', getattr(self.instance, 'product', None))
        if bool(dish) == bool(product):
            raise serializers.ValidationError('La foto debe ser de un "platillo" O de un "producto" (solo uno).')
        return data


class NestedPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ['id', 'image', 'description']


class MenuCategorySerializer(serializers.ModelSerializer):
    total_dishes = serializers.IntegerField(source='dishes.count', read_only=True)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'description', 'total_dishes']


class RecipeItemSerializer(serializers.ModelSerializer):
    supply_name = serializers.CharField(source='supply.name', read_only=True)
    unit = serializers.CharField(source='supply.unit', read_only=True)

    class Meta:
        model = RecipeItem
        fields = ['id', 'presentation', 'supply', 'supply_name', 'unit', 'quantity']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a 0.')
        return value

    def validate_supply(self, supply):
        if supply.type == Supply.Type.MATERIAL:
            raise serializers.ValidationError('Un material de merch no puede usarse en una receta de comida.')
        return supply


class NestedRecipeSerializer(serializers.ModelSerializer):
    supply_name = serializers.CharField(source='supply.name', read_only=True)
    unit = serializers.CharField(source='supply.unit', read_only=True)

    class Meta:
        model = RecipeItem
        fields = ['id', 'supply_name', 'quantity', 'unit']


class PresentationSerializer(serializers.ModelSerializer):
    recipe = NestedRecipeSerializer(many=True, read_only=True)
    possible_servings = serializers.IntegerField(read_only=True)
    available_now = serializers.BooleanField(read_only=True)

    class Meta:
        model = Presentation
        fields = ['id', 'dish', 'name', 'price', 'available_now', 'possible_servings', 'recipe']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio debe ser mayor a 0.')
        return value


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'dish', 'user', 'rating', 'comment', 'created']

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('La calificación debe estar entre 1 y 5.')
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and request.method == 'POST':
            if Review.objects.filter(dish=data['dish'], user=request.user).exists():
                raise serializers.ValidationError('Ya reseñaste este platillo.')
        return data


class NestedReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = Review
        fields = ['id', 'user', 'rating', 'comment', 'created']


class DishSerializer(serializers.ModelSerializer):
    category = MenuCategorySerializer(read_only=True)
    presentations = PresentationSerializer(many=True, read_only=True)
    photos = NestedPhotoSerializer(many=True, read_only=True)
    reviews = NestedReviewSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=MenuCategory.objects.all(), source='category', write_only=True)

    price_from = serializers.SerializerMethodField()
    available_now = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Dish
        fields = ['id', 'name', 'description', 'image', 'photos', 'spice', 'featured', 'available',
                  'available_now', 'created', 'category', 'category_id', 'price_from',
                  'presentations', 'average_rating', 'is_favorite', 'reviews']

    def get_price_from(self, obj):
        prices = [p.price for p in obj.presentations.all()]
        return min(prices) if prices else None

    def get_available_now(self, obj):
        return any(p.available_now for p in obj.presentations.all())

    def get_average_rating(self, obj):
        # Reviews are already prefetched (prefetch_related in the view), so the average is computed in memory
        ratings = [r.rating for r in obj.reviews.all()]
        if not ratings:
            return None
        return round(sum(ratings) / len(ratings), 2)

    def get_is_favorite(self, obj):
        # The view adds "marked_favorite" with a subquery, so there is no extra query per dish.
        # If the object does not come from that query (for example, just created) it is checked directly.
        if hasattr(obj, 'marked_favorite'):
            return obj.marked_favorite
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()
        return False

    def validate_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError('El nombre debe tener al menos 3 caracteres.')
        return value.strip()

    def validate_spice(self, value):
        if not 0 <= value <= 3:
            raise serializers.ValidationError('El nivel de picante va de 0 a 3.')
        return value

    def validate_image(self, image):
        return check_image(image)


class StoreCategorySerializer(serializers.ModelSerializer):
    total_products = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = StoreCategory
        fields = ['id', 'name', 'description', 'total_products']


class VariantSerializer(serializers.ModelSerializer):
    low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'product', 'name', 'sku', 'price', 'stock', 'min_stock', 'low_stock']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio debe ser mayor a 0.')
        return value

    def validate_sku(self, value):
        return value.strip().upper()


class NestedVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'sku', 'price', 'stock']


class StockAdjustmentSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(help_text='Positivo = entra stock, negativo = sale')

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError('La cantidad no puede ser 0.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    category = StoreCategorySerializer(read_only=True)
    variants = NestedVariantSerializer(many=True, read_only=True)
    photos = NestedPhotoSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=StoreCategory.objects.all(), source='category', write_only=True)
    price_from = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'image', 'photos', 'featured', 'available', 'created',
                  'category', 'category_id', 'price_from', 'total_stock', 'variants']

    def get_price_from(self, obj):
        prices = [v.price for v in obj.variants.all()]
        return min(prices) if prices else None

    def get_total_stock(self, obj):
        return sum(v.stock for v in obj.variants.all())

    def validate_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError('El nombre debe tener al menos 3 caracteres.')
        return value.strip()

    def validate_image(self, image):
        return check_image(image)


class OrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'presentation', 'product_variant', 'name', 'type',
                  'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['unit_price']

    def validate_quantity(self, value):
        if not 1 <= value <= 20:
            raise serializers.ValidationError('La cantidad debe estar entre 1 y 20.')
        return value

    def validate(self, data):
        presentation, variant = data.get('presentation'), data.get('product_variant')
        if bool(presentation) == bool(variant):
            raise serializers.ValidationError(
                'Cada renglón debe llevar "presentation" (comida) O "product_variant" (merch), solo uno.')
        if presentation and not presentation.available_now:
            raise serializers.ValidationError(f'"{presentation}" no está disponible por ahora.')
        if variant and not variant.product.available:
            raise serializers.ValidationError(f'"{variant.product}" no está disponible por ahora.')
        return data


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    user = serializers.StringRelatedField(read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'status', 'note', 'items', 'total', 'created']
        read_only_fields = ['status']

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('El pedido debe tener al menos un producto.')
        return items

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item in items:
            price = deduct_item(order, item, order.user)
            OrderItem.objects.create(
                order=order, presentation=item.get('presentation'),
                product_variant=item.get('product_variant'),
                quantity=item['quantity'], unit_price=price)
        return order
