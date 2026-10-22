/** Locally bundled fonts for troika <Text> (no CDN requests). */
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import interSemibold from '@fontsource/inter/files/inter-latin-600-normal.woff?url';
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import poppinsBold from '@fontsource/poppins/files/poppins-latin-700-normal.woff?url';

export const FONTS = {
  regular: interRegular,
  semibold: interSemibold,
  bold: interBold,
  display: poppinsBold,
} as const;

/** Characters to pre-generate SDF glyphs for, so first appearance of text does not stall. */
export const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?+-−×÷=()[]/%°&’\'"→←↑↓·•₂₃₄⁻¹⁹μΔπηρ';
