from rest_framework.pagination import PageNumberPagination


class ConfigurablePagination(PageNumberPagination):
    """Page-number pagination where the client decides how many items it wants.

    Example: /api/menu/dishes/?page=2&page_size=20
    If page_size is not sent, 10 are used, and never more than 50 per page are returned
    so nobody can request the whole database at once.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
