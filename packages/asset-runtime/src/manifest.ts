/**
 * Action Pack Manifest schema and validator
 */
export interface ActionManifest {
  id: string;
  version: number;
  characterId: string;
  actions: ActionDef[];
  spriteSheet: {
    src: string;
    frameWidth: number;
    frameHeight: number;
    baseScale: number; // must be integer
  };
}

export interface ActionDef {
  name: string;
  frames: number[];
  fps: number;
  loop: boolean;
  hatAnchorFrame?: Record<number, { x: number; y: number }>;
}

/**
 * Validate a manifest object.
 * Returns list of error messages (empty = valid).
 */
export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== 'object') {
    errors.push('Manifest must be a non-null object');
    return errors;
  }

  const m = manifest as Record<string, unknown>;

  if (!m.id || typeof m.id !== 'string') errors.push('Missing or invalid id');
  if (typeof m.version !== 'number') errors.push('Missing or invalid version');
  if (!m.characterId) errors.push('Missing characterId');
  if (!Array.isArray(m.actions) || m.actions.length === 0) errors.push('actions must be non-empty array');

  const sheet = m.spriteSheet as Record<string, unknown> | undefined;
  if (!sheet) {
    errors.push('Missing spriteSheet');
  } else {
    if (typeof sheet.frameWidth !== 'number' || sheet.frameWidth <= 0)
      errors.push('Invalid spriteSheet.frameWidth');
    if (typeof sheet.baseScale !== 'number' || sheet.baseScale % 1 !== 0)
      errors.push('spriteSheet.baseScale must be an integer');
  }

  return errors;
}
