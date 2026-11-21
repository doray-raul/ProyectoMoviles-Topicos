from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """Anyone can see the menu and the store; only the admin can change them."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_staff)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Only the author (or an admin) can edit or delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user or request.user.is_staff
