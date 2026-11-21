import django_filters
from django.db.models import F

from .models import Dish, Product, Supply


class SupplyFilter(django_filters.FilterSet):
    low_stock = django_filters.BooleanFilter(method='filter_low_stock')

    def filter_low_stock(self, queryset, name, value):
        low = queryset.filter(current_stock__lte=F('min_stock'))
        return low if value else queryset.exclude(pk__in=low.values('pk'))

    class Meta:
        model = Supply
        fields = ['type', 'supplier', 'active', 'low_stock']


class DishFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='presentations__price', lookup_expr='gte', distinct=True)
    max_price = django_filters.NumberFilter(field_name='presentations__price', lookup_expr='lte', distinct=True)
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='iexact')
    max_spice = django_filters.NumberFilter(field_name='spice', lookup_expr='lte')
    supply = django_filters.CharFilter(field_name='presentations__recipe__supply__name',
                                       lookup_expr='icontains', distinct=True)

    class Meta:
        model = Dish
        fields = ['available', 'featured', 'category', 'min_price', 'max_price', 'max_spice', 'supply']


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='variants__price', lookup_expr='gte', distinct=True)
    max_price = django_filters.NumberFilter(field_name='variants__price', lookup_expr='lte', distinct=True)
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='iexact')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')

    def filter_in_stock(self, queryset, name, value):
        with_stock = queryset.filter(variants__stock__gt=0).distinct()
        return with_stock if value else queryset.exclude(pk__in=with_stock.values('pk'))

    class Meta:
        model = Product
        fields = ['available', 'featured', 'category', 'min_price', 'max_price', 'in_stock']
