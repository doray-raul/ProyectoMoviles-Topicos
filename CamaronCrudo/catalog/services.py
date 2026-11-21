from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from .models import InventoryMovement, ProductVariant, Supply

T = InventoryMovement.Type


@transaction.atomic
def record_movement(supply_id, movement_type, quantity, reason='', user=None):
    """The only way to change the stock of a supply (it keeps a history)."""
    supply = Supply.objects.select_for_update().get(pk=supply_id)
    quantity = Decimal(quantity)
    if movement_type == T.IN:
        new_stock = supply.current_stock + quantity
    elif movement_type == T.OUT:
        if quantity > supply.current_stock:
            raise ValidationError({'stock': (
                f'Stock insuficiente de "{supply.name}": hay {supply.current_stock:g} '
                f'{supply.get_unit_display().lower()} y se necesitan {quantity:g}.')})
        new_stock = supply.current_stock - quantity
    else:
        new_stock = quantity
    supply.current_stock = new_stock
    supply.save(update_fields=['current_stock'])
    return InventoryMovement.objects.create(
        supply=supply, type=movement_type, quantity=quantity, resulting_stock=new_stock, reason=reason, user=user)


def deduct_item(order, item, user):
    """Deducts the inventory of an order line and returns the unit price.
    Food: uses the supplies of the recipe. Merch: lowers the stock of the variant."""
    quantity = item['quantity']
    if item.get('presentation'):
        presentation = item['presentation']
        for r in presentation.recipe.select_related('supply'):
            record_movement(r.supply_id, T.OUT, r.quantity * quantity,
                            f'Pedido #{order.pk}: {quantity} x {presentation}', user)
        return presentation.price
    variant = ProductVariant.objects.select_for_update().get(pk=item['product_variant'].pk)
    if quantity > variant.stock:
        raise ValidationError({'items': f'Solo quedan {variant.stock} de "{variant}".'})
    variant.stock -= quantity
    variant.save(update_fields=['stock'])
    return variant.price


def restore_order(order, user):
    """Gives back all the stock of an order (cancellation)."""
    for item in order.items.select_related('presentation', 'product_variant'):
        if item.presentation_id:
            for r in item.presentation.recipe.select_related('supply'):
                record_movement(r.supply_id, T.IN, r.quantity * item.quantity,
                                f'Cancelación pedido #{order.pk}', user)
        else:
            ProductVariant.objects.filter(pk=item.product_variant_id).update(
                stock=F('stock') + item.quantity)
