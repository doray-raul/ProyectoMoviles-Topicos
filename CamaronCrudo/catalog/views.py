from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import BooleanField, DecimalField, Exists, F, Min, OuterRef, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import DishFilter, ProductFilter, SupplyFilter
from .models import (Dish, Favorite, InventoryMovement, MenuCategory, Order, OrderItem, Photo, Presentation,
                     Product, ProductVariant, RecipeItem, Review, StoreCategory, Supplier, Supply)
from .permissions import IsAdminOrReadOnly, IsOwnerOrReadOnly
from .serializers import (AdjustmentSerializer, DishSerializer, MenuCategorySerializer, MovementSerializer,
                          OrderSerializer, PhotoSerializer, PresentationSerializer, ProductSerializer,
                          QuantitySerializer, RecipeItemSerializer, RegisterSerializer, ReviewSerializer,
                          StockAdjustmentSerializer, StoreCategorySerializer, SupplierSerializer,
                          SupplySerializer, UserSerializer, VariantSerializer)
from .services import record_movement, restore_order

T = InventoryMovement.Type
IMAGE_PARSERS = [MultiPartParser, FormParser, JSONParser]


class RegisterView(generics.CreateAPIView):
    """POST /api/register/ -> creates a new user and returns their token.

    The token is returned right away so the app can log in directly
    after signing up, without asking for the username and password again.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        data = dict(serializer.data, token=token.key)
        return Response(data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveAPIView):
    """GET /api/profile/ -> data of the authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Sesión cerrada: el token ya no sirve. Haz login para obtener uno nuevo.'})


class UserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin,
                  viewsets.GenericViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['is_staff', 'is_active']
    search_fields = ['username', 'email']

    def destroy(self, request, *args, **kwargs):
        if self.get_object() == request.user:
            raise ValidationError('No puedes borrar tu propio usuario.')
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def create_admin(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        user.is_staff = user.is_superuser = True
        user.save(update_fields=['is_staff', 'is_superuser'])
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def _set_role(self, request, admin):
        user = self.get_object()
        if not admin and user == request.user:
            raise ValidationError('No puedes quitarte tu propio rol de admin.')
        user.is_staff = user.is_superuser = admin
        user.save(update_fields=['is_staff', 'is_superuser'])
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'])
    def make_admin(self, request, pk=None):
        return self._set_role(request, True)

    @action(detail=True, methods=['post'])
    def remove_admin(self, request, pk=None):
        return self._set_role(request, False)


class ApiRoot(APIView):
    """GET /api/ -> index with every section."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        b = request.build_absolute_uri
        return Response({
            'register': b('/api/register/'), 'login': b('/api/login/'), 'logout': b('/api/logout/'),
            'profile': b('/api/profile/'), 'users (admin)': b('/api/users/'),
            'menu (food)': b('/api/menu/dishes/'),
            'store (merch)': b('/api/store/products/'),
            'inventory (admin)': b('/api/inventory/supplies/'),
            'photos (gallery)': b('/api/photos/'),
            'orders': b('/api/orders/'),
            'stats (admin)': b('/api/stats/'),
        })


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAdminUser]
    search_fields = ['name', 'notes']


class SupplyViewSet(viewsets.ModelViewSet):
    queryset = Supply.objects.select_related('supplier')
    serializer_class = SupplySerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_class = SupplyFilter
    search_fields = ['name', 'supplier__name']
    ordering_fields = ['name', 'current_stock', 'unit_cost']

    def _move(self, request, movement_type, serializer_class):
        supply = self.get_object()
        ser = serializer_class(data=request.data)
        ser.is_valid(raise_exception=True)
        movement = record_movement(supply.pk, movement_type, ser.validated_data['quantity'],
                                   ser.validated_data['reason'], request.user)
        return Response(MovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def stock_in(self, request, pk=None):
        """POST /api/inventory/supplies/{id}/stock_in/  {"quantity": 5, "reason": "Compra"}"""
        return self._move(request, T.IN, QuantitySerializer)

    @action(detail=True, methods=['post'])
    def stock_out(self, request, pk=None):
        """POST /api/inventory/supplies/{id}/stock_out/  {"quantity": 1, "reason": "Merma"}"""
        return self._move(request, T.OUT, QuantitySerializer)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """POST /api/inventory/supplies/{id}/adjust/  {"quantity": 12} (physical count)"""
        return self._move(request, T.ADJUSTMENT, AdjustmentSerializer)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        supply = self.get_object()
        return Response(MovementSerializer(supply.movements.all()[:50], many=True).data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """GET /api/inventory/supplies/low_stock/ -> what needs to be bought."""
        qs = self.get_queryset().filter(current_stock__lte=F('min_stock'), active=True)
        return Response(self.get_serializer(qs, many=True).data)


class MovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related('supply', 'user')
    serializer_class = MovementSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['supply', 'type']
    ordering_fields = ['created']


class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'description']


class DishViewSet(viewsets.ModelViewSet):
    queryset = (Dish.objects.select_related('category')
                .prefetch_related('presentations__recipe__supply', 'reviews__user', 'photos')
                .annotate(base_price=Min('presentations__price'))
                .order_by('-featured', 'name'))
    serializer_class = DishSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = IMAGE_PARSERS
    filterset_class = DishFilter
    search_fields = ['name', 'description', 'category__name', 'presentations__recipe__supply__name']
    ordering_fields = ['name', 'created', 'base_price']

    def get_queryset(self):
        """Adds to each dish whether it is a favorite of the user making the request.

        It is solved with a subquery (Exists) inside the same list query,
        instead of asking the database once per dish.
        """
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated:
            favorites = Favorite.objects.filter(user=user, dish=OuterRef('pk'))
            return qs.annotate(marked_favorite=Exists(favorites))
        return qs.annotate(marked_favorite=Value(False, output_field=BooleanField()))

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def favorite(self, request, pk=None):
        """POST /api/menu/dishes/{id}/favorite/ -> toggles the favorite."""
        dish = self.get_object()
        _, created = Favorite.objects.get_or_create(user=request.user, dish=dish)
        if not created:
            Favorite.objects.filter(user=request.user, dish=dish).delete()
        return Response({'dish': dish.id, 'is_favorite': created})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_favorites(self, request):
        """GET /api/menu/dishes/my_favorites/ -> the user's favorites, paginated like the catalog."""
        qs = self.filter_queryset(self.get_queryset().filter(favorites__user=request.user))
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def toggle_availability(self, request, pk=None):
        """POST /api/menu/dishes/{id}/toggle_availability/ -> toggles "available"."""
        dish = self.get_object()
        dish.available = not dish.available
        dish.save(update_fields=['available'])
        return Response({'id': dish.id, 'available': dish.available})


class PresentationViewSet(viewsets.ModelViewSet):
    queryset = Presentation.objects.select_related('dish').prefetch_related('recipe__supply')
    serializer_class = PresentationSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['dish']
    ordering_fields = ['price']


class RecipeItemViewSet(viewsets.ModelViewSet):
    queryset = RecipeItem.objects.select_related('supply', 'presentation__dish')
    serializer_class = RecipeItemSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['presentation', 'supply']


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('user', 'dish')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_fields = ['dish', 'rating']
    ordering_fields = ['rating', 'created']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StoreCategoryViewSet(viewsets.ModelViewSet):
    queryset = StoreCategory.objects.all()
    serializer_class = StoreCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (Product.objects.select_related('category').prefetch_related('variants', 'photos')
                .annotate(base_price=Min('variants__price'))
                .order_by('-featured', 'name'))
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = IMAGE_PARSERS
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'category__name', 'variants__sku']
    ordering_fields = ['name', 'created', 'base_price']

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def toggle_availability(self, request, pk=None):
        product = self.get_object()
        product.available = not product.available
        product.save(update_fields=['available'])
        return Response({'id': product.id, 'available': product.available})


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related('product')
    serializer_class = VariantSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['product']
    search_fields = ['sku', 'product__name', 'name']
    ordering_fields = ['price', 'stock']

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def adjust_stock(self, request, pk=None):
        """POST /api/store/variants/{id}/adjust_stock/  {"quantity": 10}  or  {"quantity": -2}"""
        ser = StockAdjustmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            v = ProductVariant.objects.select_for_update().get(pk=pk)
            new_stock = v.stock + ser.validated_data['quantity']
            if new_stock < 0:
                raise ValidationError({'quantity': f'Solo hay {v.stock} en stock.'})
            v.stock = new_stock
            v.save(update_fields=['stock'])
        return Response({'id': v.id, 'sku': v.sku, 'stock': v.stock, 'low_stock': v.low_stock})

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """GET /api/store/variants/low_stock/ -> merch that needs restocking."""
        qs = self.get_queryset().filter(stock__lte=F('min_stock'))
        return Response(self.get_serializer(qs, many=True).data)


class PhotoViewSet(viewsets.ModelViewSet):
    """Extra real photos. Anyone can see them; only the admin uploads them (multipart)."""
    queryset = Photo.objects.select_related('dish', 'product')
    serializer_class = PhotoSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = IMAGE_PARSERS
    filterset_fields = ['dish', 'product']


class OrderViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                   mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Each customer only sees their own orders; the admin sees all of them."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']
    ordering_fields = ['created']

    def get_queryset(self):
        qs = (Order.objects.select_related('user')
              .prefetch_related('items__presentation__dish', 'items__product_variant__product'))
        user = self.request.user
        return qs if user.is_staff else qs.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != Order.Status.PENDING:
            raise ValidationError('Solo se pueden cancelar pedidos pendientes.')
        with transaction.atomic():
            restore_order(order, request.user)
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])
        return Response({'id': order.id, 'status': order.status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def change_status(self, request, pk=None):
        """POST /api/orders/{id}/change_status/  {"status": "ready"}"""
        order = self.get_object()
        new_status = request.data.get('status')
        if new_status not in Order.Status.values:
            raise ValidationError({'status': f'Opciones: {", ".join(Order.Status.values)}'})
        if order.status == Order.Status.CANCELLED:
            raise ValidationError('Un pedido cancelado no se puede reactivar.')
        with transaction.atomic():
            if new_status == Order.Status.CANCELLED:
                restore_order(order, request.user)
            order.status = new_status
            order.save(update_fields=['status'])
        return Response({'id': order.id, 'status': order.status})


class StatsView(APIView):
    """GET /api/stats/ -> business summary (admin only)."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        valid_items = OrderItem.objects.exclude(order__status=Order.Status.CANCELLED)
        revenue = OrderItem.objects.filter(order__status=Order.Status.DELIVERED).aggregate(
            t=Sum(F('unit_price') * F('quantity'), output_field=DecimalField()))['t'] or 0
        top = (valid_items.annotate(item_name=Coalesce('presentation__dish__name',
                                                       'product_variant__product__name'))
               .values('item_name').annotate(sold=Sum('quantity')).order_by('-sold')[:5])
        return Response({
            'orders_by_status': {s: Order.objects.filter(status=s).count() for s in Order.Status.values},
            'delivered_revenue': revenue,
            'best_sellers': [{'name': row['item_name'], 'sold': row['sold']} for row in top],
            'low_stock_supplies': Supply.objects.filter(current_stock__lte=F('min_stock'), active=True).count(),
            'low_stock_merch': ProductVariant.objects.filter(stock__lte=F('min_stock')).count(),
        })
