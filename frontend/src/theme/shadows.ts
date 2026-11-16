/**
 * LifeLens AI – Design Token: Shadows
 *
 * Warm, soft elevation shadows that match the light off-white & cream aesthetic.
 */

const shadow = (
  elevation: number,
  opacity: number,
  radius: number,
  offsetY: number,
) => ({
  boxShadow: `0px ${offsetY}px ${radius}px rgba(102, 48, 12, ${opacity})`,
  elevation,
});

export const shadows = {
  none: {},

  /** Very subtle card lift */
  sm: shadow(1, 0.04, 6, 2),

  /** Standard card shadow */
  md: shadow(3, 0.06, 12, 4),

  /** Elevated surface / modal */
  lg: shadow(6, 0.08, 18, 6),

  /** Floating navigation bar */
  float: shadow(8, 0.10, 24, 8),
} as const;
