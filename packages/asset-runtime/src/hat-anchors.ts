/**
 * Hat stacking logic
 * 
 * Rules:
 * - Each hat has anchor points per frame
 * - Hats stack from bottom to top
 * - Each hat's position = previous hat's top anchor + offset
 * - No fixed upper limit on stack height
 * - Auto-scale/scroll/cache strategy for tall stacks (HAT-STACK-001)
 */

export interface HatAnchor {
  hatId: string;
  baseX: number;
  baseY: number;
  stackOffsetY: number; // how much to offset the next hat above
}

export interface StackedHat {
  hatId: string;
  x: number;
  y: number;
  scale: number;
}

/**
 * Resolve hat positions for a given stack (bottom to top order).
 */
export function resolveHatAnchors(
  hats: HatAnchor[],
  characterHeadY: number,
): StackedHat[] {
  const result: StackedHat[] = [];
  let currentY = characterHeadY;

  for (const hat of hats) {
    result.push({
      hatId: hat.hatId,
      x: hat.baseX,
      y: currentY - hat.baseY,
      scale: 1, // integer scale enforced at render time
    });
    currentY -= hat.stackOffsetY;
  }

  return result;
}
