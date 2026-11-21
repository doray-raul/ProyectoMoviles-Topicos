import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError, getErrorMessage } from '@/api/client';
import { SelectedImage } from '@/api/image';
import {
  createVariant,
  VariantInput,
  deleteProduct,
  saveProduct,
  listStoreCategories,
  getProduct,
} from '@/api/store';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Chip } from '@/components/Chip';
import { ErrorBanner, Loading, ErrorMessage } from '@/components/States';
import { FormStep } from '@/components/FormStep';
import { ImageSelector } from '@/components/ImageSelector';
import { useToast } from '@/context/ToastContext';
import { colors, spacing } from '@/theme';
import { StoreCategory } from '@/types';

type FieldErrors = Partial<
  Record<'name' | 'category' | 'image' | 'variantName' | 'variantSku' | 'variantPrice' | 'variantStock', string>
>;

/**
 * Form to create and edit store products (admin only).
 * It works the same as the dish form:
 * - Without an "id" it creates the product and its first size/color (variant) with price and stock.
 * - With an "id" it edits the product data; sizes are managed from the detail screen.
 */
export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const { showToast } = useToast();

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [featured, setFeatured] = useState(false);
  const [available, setAvailable] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<SelectedImage | null>(null);
  const [variant, setVariant] = useState<VariantInput>({ name: 'Única', sku: '', price: '', stock: '' });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setCategories(await listStoreCategories());
        if (id) {
          const p = await getProduct(Number(id));
          setName(p.name);
          setDescription(p.description);
          setCategoryId(p.category.id);
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

  function validate(): FieldErrors {
    const updated: FieldErrors = {};
    if (name.trim().length < 3) updated.name = 'El nombre debe tener al menos 3 caracteres.';
    if (!categoryId) updated.category = 'Elige una categoría.';
    if (!isEditing) {
      if (!variant.name.trim()) updated.variantName = 'Escribe la talla o el color (o "Única").';
      if (!variant.sku.trim()) updated.variantSku = 'Escribe un código único, por ejemplo GOR-NEG.';
      if (!(Number(variant.price) > 0)) updated.variantPrice = 'Escribe un precio mayor a 0.';
      if (variant.stock && !(Number(variant.stock) >= 0)) updated.variantStock = 'Escribe un número.';
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
      const saved = await saveProduct(
        { name, description, categoryId, featured, available, image: newImage },
        id ? Number(id) : undefined,
      );

      if (!isEditing) {
        // Price and stock live in the variant, so it is created right after the product
        try {
          await createVariant(saved.id, variant);
        } catch (e) {
          // If the variant fails (for example, a repeated SKU) the product is deleted so it is not left half-done
          await deleteProduct(saved.id).catch(() => undefined);
          if (e instanceof ApiError) {
            setErrors({
              variantName: e.fields.name?.[0],
              variantSku: e.fields.sku?.[0],
              variantPrice: e.fields.price?.[0],
              variantStock: e.fields.stock?.[0],
            });
          }
          setGeneralError(getErrorMessage(e));
          setSaving(false);
          return;
        }
        showToast(`${saved.name} se agregó a la tienda`);
        router.replace(`/product/${saved.id}`);
        return;
      }
      showToast('Los cambios se guardaron');
      router.back();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length > 0) {
        setErrors({
          name: e.fields.name?.[0],
          category: e.fields.category_id?.[0],
          image: e.fields.image?.[0],
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
      <Stack.Screen options={{ title: isEditing ? 'Editar producto' : 'Agregar producto' }} />

      <View>
        <Text style={styles.title}>{isEditing ? 'Editar producto' : 'Agregar un producto a la tienda'}</Text>
        <Text style={styles.help}>
          {isEditing
            ? 'Cambia lo que necesites y presiona "Guardar cambios". Las tallas y el stock se manejan desde el detalle.'
            : 'Llena los pasos y presiona "Agregar a la tienda". Los campos con * son obligatorios.'}
        </Text>
      </View>

      {generalError ? <ErrorBanner message={generalError} /> : null}

      <FormStep stepNumber={1} title="Foto del producto" help="Opcional. JPG, PNG o WEBP de máximo 2 MB.">
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
          placeholder="Ejemplo: Gorra El Camarón Crudo"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <TextField
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Material, medidas, colores..."
        />
        <Text style={styles.label}>Categoría *</Text>
        <View style={styles.options}>
          {categories.map((c) => (
            <Chip key={c.id} text={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </View>
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      </FormStep>

      <FormStep stepNumber={3} title="Visibilidad en la tienda">
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Destacado</Text>
            <Text style={styles.help}>Aparece primero y con una etiqueta amarilla.</Text>
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
            <Text style={styles.help}>Si lo apagas, se ve en la tienda pero no se puede comprar.</Text>
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
          stepNumber={4}
          title="Primera talla o color"
          help='Si el producto solo viene en una presentación, deja "Única". Después puedes agregar más desde el detalle.'
        >
          <View style={styles.fieldsRow}>
            <View style={styles.flex}>
              <TextField
                label="Talla / color *"
                value={variant.name}
                onChangeText={(t) => setVariant({ ...variant, name: t })}
                error={errors.variantName}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Código (SKU) *"
                placeholder="GOR-NEG"
                autoCapitalize="characters"
                value={variant.sku}
                onChangeText={(t) => setVariant({ ...variant, sku: t })}
                error={errors.variantSku}
              />
            </View>
          </View>
          <View style={styles.fieldsRow}>
            <View style={styles.flex}>
              <TextField
                label="Precio (MXN) *"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={variant.price}
                onChangeText={(t) => setVariant({ ...variant, price: t })}
                error={errors.variantPrice}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Piezas en stock"
                placeholder="0"
                keyboardType="number-pad"
                value={variant.stock}
                onChangeText={(t) => setVariant({ ...variant, stock: t })}
                error={errors.variantStock}
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
            text={isEditing ? 'Guardar cambios' : 'Agregar a la tienda'}
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
