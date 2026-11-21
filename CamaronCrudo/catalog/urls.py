from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register('menu/categories', views.MenuCategoryViewSet)
router.register('menu/dishes', views.DishViewSet)
router.register('menu/presentations', views.PresentationViewSet)
router.register('menu/recipes', views.RecipeItemViewSet)
router.register('menu/reviews', views.ReviewViewSet)
router.register('store/categories', views.StoreCategoryViewSet)
router.register('store/products', views.ProductViewSet)
router.register('store/variants', views.ProductVariantViewSet)
router.register('inventory/suppliers', views.SupplierViewSet)
router.register('inventory/supplies', views.SupplyViewSet)
router.register('inventory/movements', views.MovementViewSet)
router.register('users', views.UserViewSet)
router.register('photos', views.PhotoViewSet)
router.register('orders', views.OrderViewSet, basename='order')

urlpatterns = [
    path('', views.ApiRoot.as_view(), name='api-root'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', obtain_auth_token, name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('stats/', views.StatsView.as_view(), name='stats'),
] + router.urls
