import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { SelectedImage } from '@/api/image';
import { colors, spacing, radius } from '@/theme';

interface Props {
  currentImage: string | null; // the one already saved on the server (when editing)
  newImage: SelectedImage | null; // the one the user just picked
  onPick: (image: SelectedImage) => void;
  error?: string;
}

/** Box to pick a photo from the gallery, with a preview. Used by the dish and product forms. */
export function ImageSelector({ currentImage, newImage, onPick, error }: Props) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // se comprime un poco porque la API acepta máximo 2 MB
    });
    if (result.canceled) return;

    const file = result.assets[0];
    onPick({
      uri: file.uri,
      name: file.fileName ?? 'image.jpg',
      type: file.mimeType ?? 'image/jpeg',
    });
  }

  const preview = newImage?.uri ?? currentImage;

  return (
    <View style={styles.container}>
      <Pressable onPress={pick} style={styles.selector} accessibilityRole="button">
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="cloud-upload-outline" size={36} color={colors.secondary} />
            <Text style={styles.emptyText}>Toca aquí para subir una foto</Text>
          </View>
        )}
      </Pressable>
      {preview ? (
        <Button text="Cambiar foto" icon="image-outline" variant="outline" small onPress={pick} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.m,
  },
  selector: {
    borderRadius: radius.m,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.secondary,
    backgroundColor: colors.secondarySoft,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  empty: {
    aspectRatio: 16 / 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});
