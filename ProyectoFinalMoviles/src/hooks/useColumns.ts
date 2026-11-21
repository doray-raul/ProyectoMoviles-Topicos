import { useWindowDimensions } from 'react-native';

import { MAX_WIDTH } from '@/theme';

/**
 * How many card columns fit according to the screen width.
 * On a phone it is 1; in the browser, with a large window, up to 3.
 */
export function useColumns() {
  const { width } = useWindowDimensions();
  const availableWidth = Math.min(width, MAX_WIDTH);
  if (availableWidth >= 900) return 3;
  if (availableWidth >= 600) return 2;
  return 1;
}
