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
/** Characters visible in the first scene's scale and fume-hood readouts. */
export const GLYPHS = '0123456789.- gms/';

/** Font faces used by the initial room's canvas labels; scene mounting can await these. */
export const canvasFontsReady: Promise<unknown> =
  typeof document === 'undefined' || !document.fonts
    ? Promise.resolve()
    : Promise.all(
        ['400 32px Inter', '500 32px Inter', '700 32px Inter', '700 32px Poppins'].map((font) =>
          document.fonts.load(font, 'Aa0 Аа Өө Үү'),
        ),
      ).catch(() => undefined);
