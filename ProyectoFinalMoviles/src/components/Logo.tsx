import { Image } from 'react-native';

// Business images stored in /assets
const FULL_LOGO = require('../../assets/logo.png');
const ICON = require('../../assets/icon.png');

/** Full logo (shrimp, name and sign). It has a dark background, used on the login screen. */
export function FullLogo({ width = 260 }: { width?: number }) {
  // The original image is 716 x 636, the aspect ratio is kept
  return <Image source={FULL_LOGO} style={{ width, height: width * (636 / 716) }} resizeMode="contain" />;
}

/** Just the shrimp inside a circle. Used in headers. */
export function ShrimpIcon({ size = 36 }: { size?: number }) {
  return <Image source={ICON} style={{ width: size, height: size }} />;
}
