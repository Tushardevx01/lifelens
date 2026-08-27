/**
 * LifeLens AI – Design Token: Shadows
 *
 * Subtle elevation shadows that avoid the heavy Material-style look.
 * Use these objects spread into component StyleSheet entries.
 */

const shadow = (
  elevation: number,
  opacity: number,
  radius: number,
  offsetY: number,
) => ({
  boxShadow: `0px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
  elevation,
});

export const shadows = {
  none: {},

  /** Very subtle card lift */
  sm: shadow(2, 0.12, 4, 1),

  /** Standard card shadow */
  md: shadow(4, 0.18, 8, 2),

  /** Elevated surface / modal */
  lg: shadow(8, 0.24, 14, 4),

  /** Floating navigation bar */
  float: shadow(16, 0.40, 20, 8),
} as const;
