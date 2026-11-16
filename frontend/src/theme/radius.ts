/**
 * LifeLens AI – Design Token: Border Radius
 *
 * Generous rounded corners and pill contours for a warm, modern aesthetic:
 *   - Small cards & tags: 16-18px
 *   - Regular cards & inputs: 22-24px
 *   - Hero cards & containers: 28-32px
 *   - Pills & circular buttons: 9999px (full)
 */

export const radius = {
  xs:    8,
  sm:    14,
  md:    18,
  lg:    24,
  xl:    28,
  xxl:   32,
  xxxl:  36,
  hero:  40,
  full:  9999,
} as const;

export type RadiusToken = keyof typeof radius;
