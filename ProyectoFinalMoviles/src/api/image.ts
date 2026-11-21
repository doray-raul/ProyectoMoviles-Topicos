import { Platform } from 'react-native';

/** Image picked with the selector, before uploading it. */
export interface SelectedImage {
  uri: string;
  name: string;
  type: string;
}

/**
 * Appends the image to the FormData (used by dishes and products).
 * In the browser the picked image is a "blob:" URI, so it is first converted
 * into a real file (Blob). On Android/iOS React Native accepts the { uri, name, type } object.
 */
export async function appendImage(form: FormData, image: SelectedImage) {
  if (Platform.OS === 'web') {
    const file = await (await fetch(image.uri)).blob();
    form.append('image', file, image.name);
  } else {
    form.append('image', { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
  }
}
