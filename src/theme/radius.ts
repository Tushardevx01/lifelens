/**
 * LifeLens AI – Design Token: Border Radius
 *
 * Generous rounded corners give the premium consumer-app feel.
 */

export const radius = {
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  xxxl:  28,
  hero:  32,
  full:  9999,
} as const;

export type RadiusToken = keyof typeof radius;
