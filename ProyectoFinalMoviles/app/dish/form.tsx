import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError, getErrorMessage } from '@/api/client';
import { SelectedImage } from '@/api/image';
import { createPresentation, deleteDish, saveDish, listMenuCategories, getDish } from '@/api/dishes';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Chip } from '@/components/Chip';
import { ErrorBanner, Loading, ErrorMessage } from '@/components/States';
import { FormStep } from '@/components/FormStep';
import { ImageSelector } from '@/components/ImageSelector';
import { useToast } from '@/context/ToastContext';
import { colors, spacing, SPICE_NAMES } from '@/theme';
import { MenuCategory } from '@/types';

type FieldErrors = Partial<Record<'name' | 'category' | 'image' | 'presentation' | 'price' | 'spice', string>>;

/**
 * Form to create and edit dishes (admin only).
 * - Without an "id" parameter: creates a new dish and its first presentation with a price.
 * - With an "id": loads the dish and saves the changes with PATCH.
 */
export default function DishFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { showToast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [spice, setSpice] = useState(0);
  const [featured, setFeatured] = useState(false);
  const [available, setAvailable] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null); // the one already on the server
  const [newImage, setNewImage] = useState<SelectedImage | null>(null);
  const [presentation, setPresentation] = useState('Orden');
  const [price, setPrice] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  // Loads the categories and, when editing, the current data of the dish
  useEffect(() => {
    async function loadData() {
      try {
        setCategories(await listMenuCategories());
        if (id) {
          const p = await getDish(Number(id));
          setName(p.name);
          setDescription(p.description);
          setCategoryId(p.category.id);
          setSpice(p.spice);
          setFeatured(p.featured);
          setAvailable(p.available);
          setCurrentImage(p.image);
        }
      } catch (e) {
        setLoadError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  /** Same rules the API validates, checked before sending to warn the user sooner. */
  function validate(): FieldErrors {
    const updated: FieldErrors = {};
    if (name.trim().length < 3) updated.name = 'El nombre debe tener al menos 3 caracteres.';
    if (!categoryId) updated.category = 'Elige una categoría.';
    if (!isEditing) {
      if (!presentation.trim()) updated.presentation = 'Escribe cómo se vende (por ejemplo: Orden).';
      const value = Number(price);
      if (!price || Number.isNaN(value) || value <= 0) updated.price = 'Escribe un precio mayor a 0.';
    }
    return updated;
  }

  async function handleSave() {
    const found = validate();
    setErrors(found);
    setGeneralError('');
    if (Object.keys(found).length > 0 || !categoryId) {
      setGeneralError('Revisa los campos marcados en rojo.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveDish(
        { name, description, categoryId, spice, featured, available, image: newImage },
        id ? Number(id) : undefined,
      );

      if (!isEditing) {
        // The price lives in the presentation, so it is created right after the dish
        try {
          await createPresentation(saved.id, presentation, price);
        } catch (e) {
          // If the price could not be saved, the dish is deleted so it is not left half-done
          await deleteDish(saved.id).catch(() => undefined);
          if (e instanceof ApiError) {
            setErrors({ presentation: e.fields.name?.[0], price: e.fields.price?.[0] });
          }
          setGeneralError(getErrorMessage(e));
          setSaving(false);
          return;
        }
        showToast(`${saved.name} se agregó al menú`);
        router.replace(`/dish/${saved.id}`);
        return;
      }
      showToast('Los cambios se guardaron');
      router.back();
    } catch (e) {
      // Field errors sent by Django are shown under each field
      if (e instanceof ApiError && Object.keys(e.fields).length > 0) {
        setErrors({
          name: e.fields.name?.[0],
          category: e.fields.category_id?.[0],
          image: e.fields.image?.[0],
          spice: e.fields.spice?.[0],
        });
      }
      setGeneralError(getErrorMessage(e));
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorMessage message={loadError} />;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isEditing ? 'Editar platillo' : 'Agregar platillo' }} />

      <View>
        <Text style={styles.title}>{isEditing ? 'Editar platillo' : 'Agregar un platillo nuevo'}</Text>
        <Text style={styles.help}>
          {isEditing
            ? 'Cambia lo que necesites y presiona "Guardar cambios".'
            : 'Llena los pasos y presiona "Agregar al menú". Los campos con * son obligatorios.'}
        </Text>
      </View>

      {generalError ? <ErrorBanner message={generalError} /> : null}

      <FormStep stepNumber={1} title="Foto del platillo" help="Opcional. JPG, PNG o WEBP de máximo 2 MB.">
        <ImageSelector
          currentImage={currentImage}
          newImage={newImage}
          error={errors.image}
          onPick={(image) => {
            setNewImage(image);
            setErrors((e) => ({ ...e, image: undefined }));
          }}
        />
      </FormStep>

      <FormStep stepNumber={2} title="Información">
        <TextField
          label="Nombre *"
          placeholder="Ejemplo: Tostada de camarón"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Ingredientes, cómo se sirve, para cuántas personas..."
        />
      </FormStep>

      <FormStep stepNumber={3} title="Categoría y picante">
        <Text style={styles.label}>Categoría *</Text>
        <View style={styles.options}>
          {categories.map((c) => (
            <Chip key={c.id} text={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}

        <Text style={[styles.label, styles.spaced]}>¿Qué tanto pica?</Text>
        <View style={styles.options}>
          {SPICE_NAMES.map((text, level) => (
            <Chip key={text} text={text} active={spice === level} onPress={() => setSpice(level)} />
          ))}
        </View>
        {errors.spice ? <Text style={styles.error}>{errors.spice}</Text> : null}
      </FormStep>

      <FormStep stepNumber={4} title="Visibilidad en el menú">
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Destacado</Text>
            <Text style={styles.help}>Se muestra con una etiqueta amarilla para llamar la atención.</Text>
          </View>
          <Switch
            value={featured}
            onValueChange={setFeatured}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Disponible</Text>
            <Text style={styles.help}>Si lo apagas, aparece como "No disponible" y no se puede pedir.</Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </FormStep>

      {!isEditing && (
        <FormStep
          stepNumber={5}
          title="Precio"
          help="Cada platillo se vende en presentaciones (Orden, Tostada, 1/2 litro...). Aquí se crea la primera; las demás se agregan desde el panel de Django."
        >
          <View style={styles.fieldsRow}>
            <View style={styles.flex}>
              <TextField
                label="Presentación *"
                value={presentation}
                onChangeText={setPresentation}
                error={errors.presentation}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Precio (MXN) *"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                error={errors.price}
              />
            </View>
          </View>
        </FormStep>
      )}

      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button text="Cancelar" variant="outline" onPress={() => router.back()} disabled={saving} />
        </View>
        <View style={styles.flex}>
          <Button
            text={isEditing ? 'Guardar cambios' : 'Agregar al menú'}
            icon="checkmark"
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.l,
    gap: spacing.l,
    paddingBottom: spacing.xl * 2,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  spaced: {
    marginTop: spacing.s,
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
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  help: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.m,
  },
});
