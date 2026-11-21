import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { toggleFavorite, listFavorites } from '@/api/dishes';
import { Loading, EmptyState, ErrorMessage } from '@/components/States';
import { Paginator } from '@/components/Paginator';
import { DishCard } from '@/components/DishCard';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColumns } from '@/hooks/useColumns';
import { MAX_WIDTH, colors, spacing } from '@/theme';
import { Page, Dish } from '@/types';

export default function FavoritesScreen() {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const columns = useColumns();

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Dish> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [settings.pageSize]);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await listFavorites(page, settings.pageSize);
      // If the last favorite of a page was removed, go back to the previous page
      if (data.results.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [page, settings.pageSize]);

  // Reload every time the tab is opened, in case favorites were marked in the menu
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function removeFavorite(dish: Dish) {
    try {
      await toggleFavorite(dish.id);
      showToast(`${dish.name} se quitó de tus favoritos`);
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!result) return <Loading text="Cargando tus favoritos..." />;

  const totalPages = Math.max(1, Math.ceil(result.count / settings.pageSize));

  return (
    <FlatList
      key={`columnas-${columns}`}
      style={styles.screen}
      data={result.results}
      numColumns={columns}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={[styles.content, styles.list]}
      ListHeaderComponent={
        result.count > 0 ? (
          <View style={styles.header}>
            <Text style={styles.title}>
              {result.count === 1 ? '1 platillo guardado' : `${result.count} platillos guardados`}
            </Text>
            <Text style={styles.text}>Toca "Guardado" en cualquier platillo para quitarlo de esta lista.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={[styles.cell, { width: `${100 / columns}%` as const }]}>
          <DishCard
            dish={item}
            onPress={() => router.push(`/dish/${item.id}`)}
            onFavorite={() => removeFavorite(item)}
          />
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="heart-outline"
          title="Aún no guardas ningún platillo"
          text='En el menú, toca el botón "Guardar" de los platillos que más te gusten y aparecerán aquí.'
          buttonText="Ir al menú"
          onButtonPress={() => router.navigate('/')}
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
  list: {
    padding: spacing.s,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.m,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  text: {
    fontSize: 14,
    color: colors.textMuted,
  },
  cell: {
    padding: spacing.s,
  },
});
