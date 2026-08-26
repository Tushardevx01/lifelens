/**
 * LifeLens AI – Design Token: Spacing
 *
 * Base-4 spacing scale.  Primary screen horizontal padding: 20-24 px.
 */

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
  xxxxxxl: 64,
} as const;

export type SpacingToken = keyof typeof spacing;
