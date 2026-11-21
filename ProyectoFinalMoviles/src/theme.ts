// Palette and measurements shared by the whole app.
// The colors come from the logo and the wall of El Camarón Crudo:
// charcoal background, shrimp red, sign yellow and the teal of the decoration.

export const colors = {
  primary: '#EF5A35', // shrimp red: main actions
  primaryDark: '#D2441F',
  primarySoft: '#FDE9E3',

  accent: '#FFE23A', // yellow from the "Enchila pero no envenena" sign
  accentSoft: '#FFF8CC',
  textOnAccent: '#3D3200',

  secondary: '#006D77', // teal from the wall: secondary actions and filters
  secondarySoft: '#E0F0F1',

  dark: '#1C1D21', // charcoal: headers and login
  darkLight: '#2B2D33',

  background: '#F7F4EF',
  card: '#FFFFFF',
  text: '#1F2226',
  textMuted: '#6B6F76',
  border: '#E8E2D9',

  success: '#2E7D5B',
  successSoft: '#E3F3EB',
  error: '#C0392B',
  errorSoft: '#FBE9E7',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
};

export const radius = {
  s: 8,
  m: 12,
  l: 16,
};

// In the browser the screen can be very wide; the content is limited to this width and centered
export const MAX_WIDTH = 1000;

// Names for the spice levels (0 to 3), used in filters, cards and the form
export const SPICE_NAMES = ['No pica', 'Poco', 'Medio', 'Mucho'];
