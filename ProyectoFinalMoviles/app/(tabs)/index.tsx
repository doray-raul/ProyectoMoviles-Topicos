import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { toggleFavorite, listMenuCategories, listDishes } from '@/api/dishes';
import { CartBar } from '@/components/CartButton';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Loading, EmptyState, ErrorMessage } from '@/components/States';
import { Paginator } from '@/components/Paginator';
import { DishCard } from '@/components/DishCard';
import { SORT_OPTIONS, useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useColumns } from '@/hooks/useColumns';
import { useDebounce } from '@/hooks/useDebounce';
import { MAX_WIDTH, colors, spacing, radius } from '@/theme';
import { MenuCategory, Page, Dish } from '@/types';

const SPICE_LEVELS = [
  { value: null, text: 'Cualquiera' },
  { value: 0, text: 'Sin picante' },
  { value: 1, text: 'Hasta poco' },
  { value: 2, text: 'Hasta medio' },
];

export default function MenuScreen() {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const columns = useColumns();

  // Filters chosen by the user
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(settings.defaultOrdering);
  const [maxSpice, setMaxSpice] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Data coming from the API
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [result, setResult] = useState<Page<Dish> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);

  // Each request gets a number; if an old response arrives (the user kept typing) it is ignored
  const lastRequest = useRef(0);

  // If the settings change (in the Settings tab) they are applied here
  useEffect(() => {
    setOrdering(settings.defaultOrdering);
  }, [settings.defaultOrdering]);

  // Any filter change goes back to the first page
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, ordering, maxSpice, settings.pageSize, settings.showUnavailable]);

  useEffect(() => {
    listMenuCategories()
      .then(setCategories)
      .catch(() => setCategories([])); // if they fail, the chips are simply not shown
  }, []);

  const load = useCallback(async () => {
    const stepNumber = ++lastRequest.current;
    setLoading(true);
    setError('');
    try {
      const data = await listDishes({
        search: debouncedSearch,
        category,
        ordering,
        maxSpice,
        availableOnly: !settings.showUnavailable,
        page,
        pageSize: settings.pageSize,
      });
      if (stepNumber === lastRequest.current) setResult(data);
    } catch (e) {
      if (stepNumber === lastRequest.current) setError(getErrorMessage(e));
    } finally {
      if (stepNumber === lastRequest.current) setLoading(false);
    }
  }, [debouncedSearch, category, ordering, maxSpice, page, settings.pageSize, settings.showUnavailable]);

  // useFocusEffect reloads when coming back to this tab (for example, after editing
  // a dish) and also every time a filter changes, because "load" changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Marks or unmarks a favorite and updates only that card, without reloading the whole list. */
  async function handleFavorite(dish: Dish) {
    try {
      const { is_favorite } = await toggleFavorite(dish.id);
      setResult((current) =>
        current
          ? { ...current, results: current.results.map((p) => (p.id === dish.id ? { ...p, is_favorite } : p)) }
          : current,
      );
      showToast(is_favorite ? `${dish.name} se guardó en tus favoritos` : 'Se quitó de tus favoritos');
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  }

  function clearFilters() {
    setSearch('');
    setCategory(null);
    setOrdering(settings.defaultOrdering);
    setMaxSpice(null);
  }

  // How many extra filters (the ones in the panel) are active, to show it on the "Filtros" button
  const extraFilters = (ordering !== settings.defaultOrdering ? 1 : 0) + (maxSpice !== null ? 1 : 0);
  const hasFilters = extraFilters > 0 || category !== null || search.trim() !== '';
  const totalPages = result ? Math.max(1, Math.ceil(result.count / settings.pageSize)) : 1;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.content}>
          {/* Greeting and, for admins, the button to add dishes */}
          <View style={styles.greeting}>
            <View style={styles.greetingTexts}>
              <Text style={styles.greetingTitle}>Hola, {user?.username}</Text>
              <Text style={styles.greetingText}>¿Qué se te antoja hoy?</Text>
            </View>
            {isAdmin && (
              <Button
                text="Agregar platillo"
                icon="add-circle-outline"
                small
                onPress={() => router.push('/dish/form')}
              />
            )}
          </View>

          <View style={styles.searchRow}>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar platillo o ingrediente..."
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
              style={[styles.filtersButton, (showFilters || extraFilters > 0) && styles.filtersButtonActive]}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={showFilters || extraFilters > 0 ? colors.white : colors.secondary}
              />
              <Text style={[styles.filtersButtonText, (showFilters || extraFilters > 0) && styles.textWhite]}>
                {extraFilters > 0 ? `Filtros (${extraFilters})` : 'Filtros'}
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip text="Todo el menú" active={category === null} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <Chip
                key={c.id}
                text={c.name}
                active={category === c.name}
                onPress={() => setCategory(c.name)}
              />
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
              <Text style={styles.panelTitle}>Nivel de picante</Text>
              <View style={styles.options}>
                {SPICE_LEVELS.map((n) => (
                  <Chip
                    key={n.text}
                    text={n.text}
                    active={maxSpice === n.value}
                    onPress={() => setMaxSpice(n.value)}
                  />
                ))}
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
        <Loading text="Preparando el menú..." />
      ) : (
        <FlatList
          // Changing the number of columns on the fly is not allowed, that is why the "key" changes
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
                  {result.count === 1 ? '1 platillo encontrado' : `${result.count} platillos encontrados`}
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
              <DishCard
                dish={item}
                onPress={() => router.push(`/dish/${item.id}`)}
                onFavorite={() => handleFavorite(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No encontramos platillos"
              text="Prueba con otra palabra o quita algunos filtros."
              buttonText={hasFilters ? 'Quitar filtros' : undefined}
              onButtonPress={clearFilters}
            />
          }
          ListFooterComponent={
            <Paginator
              page={page}
              totalPages={totalPages}
              totalItems={result.count}
              onChange={setPage}
            />
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
    justifyContent: 'space-between',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
  },
  greetingTexts: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  greetingText: {
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
