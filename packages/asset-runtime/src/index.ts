/**
 * @not/asset-runtime — Manifest validation & PixiJS resource adapter
 *
 * Responsibilities:
 * - Validate character/hat/action manifests against JSON Schema
 * - Provide typed loaders for PixiJS sprite sheets
 * - Enforce integer-multiple scaling (no blurry interpolation)
 * - Hat anchor point resolution and stacking logic
 */

export { validateManifest, type ActionManifest } from './manifest';
export { resolveHatAnchors, type HatAnchor } from './hat-anchors';
