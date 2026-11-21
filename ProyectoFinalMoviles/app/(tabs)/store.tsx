import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { listStoreCategories, listProducts } from '@/api/store';
import { CartBar } from '@/components/CartButton';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Loading, EmptyState, ErrorMessage } from '@/components/States';
import { Paginator } from '@/components/Paginator';
import { ProductCard } from '@/components/ProductCard';
import { SORT_OPTIONS, useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useColumns } from '@/hooks/useColumns';
import { useDebounce } from '@/hooks/useDebounce';
import { MAX_WIDTH, colors, spacing, radius } from '@/theme';
import { StoreCategory, Page, Product } from '@/types';

/** Merch store: t-shirts, caps, mugs... and also shrimp by the kilo. */
export default function StoreScreen() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const columns = useColumns();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(settings.defaultOrdering);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [result, setResult] = useState<Page<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);
  const lastRequest = useRef(0);

  useEffect(() => {
    setOrdering(settings.defaultOrdering);
  }, [settings.defaultOrdering]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, ordering, inStockOnly, settings.pageSize]);

  useEffect(() => {
    listStoreCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    // Same trick as in the Menu: responses from old requests are ignored
    const stepNumber = ++lastRequest.current;
    setLoading(true);
    setError('');
    try {
      const data = await listProducts({
        search: debouncedSearch,
        category,
        ordering,
        inStockOnly,
        page,
        pageSize: settings.pageSize,
      });
      if (stepNumber === lastRequest.current) setResult(data);
    } catch (e) {
      if (stepNumber === lastRequest.current) setError(getErrorMessage(e));
    } finally {
      if (stepNumber === lastRequest.current) setLoading(false);
    }
  }, [debouncedSearch, category, ordering, inStockOnly, page, settings.pageSize]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function clearFilters() {
    setSearch('');
    setCategory(null);
    setOrdering(settings.defaultOrdering);
    setInStockOnly(false);
  }

  const extraFilters = (ordering !== settings.defaultOrdering ? 1 : 0) + (inStockOnly ? 1 : 0);
  const hasFilters = extraFilters > 0 || category !== null || search.trim() !== '';
  const totalPages = result ? Math.max(1, Math.ceil(result.count / settings.pageSize)) : 1;
  const filtersVisible = showFilters || extraFilters > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.content}>
          <View style={styles.greeting}>
            <View style={styles.flex}>
              <Text style={styles.title}>Tienda oficial</Text>
              <Text style={styles.subtitle}>Llévate la marca: gorras, playeras, tazas y más.</Text>
            </View>
            {isAdmin && (
              <Button
                text="Agregar producto"
                icon="add-circle-outline"
                small
                onPress={() => router.push('/product/form')}
              />
            )}
          </View>

          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar producto o SKU..."
                placeholderTextColor="#A3A7AD"
                style={styles.searchInput}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={() => setShowFilters((v) => !v)}
              accessibilityRole="button"
              style={[styles.filtersButton, filtersVisible && styles.filtersButtonActive]}
            >
              <Ionicons name="options-outline" size={18} color={filtersVisible ? colors.white : colors.secondary} />
              <Text style={[styles.filtersButtonText, filtersVisible && styles.textWhite]}>
                {extraFilters > 0 ? `Filtros (${extraFilters})` : 'Filtros'}
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip text="Toda la tienda" active={category === null} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <Chip key={c.id} text={c.name} active={category === c.name} onPress={() => setCategory(c.name)} />
            ))}
          </ScrollView>

          {showFilters && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Ordenar por</Text>
              <View style={styles.options}>
                {SORT_OPTIONS.map((o) => (
                  <Chip key={o.value} text={o.text} active={ordering === o.value} onPress={() => setOrdering(o.value)} />
                ))}
              </View>
              <View style={styles.row}>
                <Text style={[styles.flex, styles.panelTitle]}>Solo productos con existencias</Text>
                <Switch
                  value={inStockOnly}
                  onValueChange={setInStockOnly}
                  trackColor={{ true: colors.secondary, false: colors.border }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.panelButtons}>
                <Button text="Limpiar filtros" icon="refresh" variant="outline" small onPress={clearFilters} />
                <Button text="Listo" variant="secondary" small onPress={() => setShowFilters(false)} />
              </View>
            </View>
          )}
        </View>
      </View>

      {error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : !result ? (
        <Loading text="Abriendo la tienda..." />
      ) : (
        <FlatList
          key={`columnas-${columns}`}
          data={result.results}
          numColumns={columns}
          keyExtractor={(p) => String(p.id)}
          style={loading && styles.refreshing}
          contentContainerStyle={[styles.content, styles.list]}
          ListHeaderComponent={
            result.count > 0 ? (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {result.count === 1 ? '1 producto' : `${result.count} productos`}
                </Text>
                {hasFilters && (
                  <Pressable onPress={clearFilters} hitSlop={6}>
                    <Text style={styles.link}>Quitar filtros</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.cell, { width: `${100 / columns}%` as const }]}>
              <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bag-handle-outline"
              title="No encontramos productos"
              text="Prueba con otra palabra o quita algunos filtros."
              buttonText={hasFilters ? 'Quitar filtros' : undefined}
              onButtonPress={clearFilters}
            />
          }
          ListFooterComponent={
            <Paginator page={page} totalPages={totalPages} totalItems={result.count} onChange={setPage} />
          }
        />
      )}

      <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
  },
  topBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingHorizontal: spacing.l,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    height: 46,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  filtersButtonActive: {
    backgroundColor: colors.secondary,
  },
  filtersButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  textWhite: {
    color: colors.white,
  },
  chips: {
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  panel: {
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
    padding: spacing.m,
    gap: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.secondarySoft,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.secondary,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  panelButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.s,
    flexGrow: 1,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingTop: spacing.s,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  cell: {
    padding: spacing.s,
  },
  refreshing: {
    opacity: 0.5,
  },
});
