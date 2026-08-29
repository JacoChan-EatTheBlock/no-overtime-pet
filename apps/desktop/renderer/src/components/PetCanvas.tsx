/**
 * PetCanvas — React component wrapping the PixiJS pet engine.
 *
 * Manages the full lifecycle:
 *   mount  → PetEngine.init + loadCharacter
 *   update → action / hat changes
 *   hide   → pause rendering (CPU → ~0 %)
 *   unmount → dispose all GPU resources
 *
 * Usage:
 *   <PetCanvas
 *     manifest={capybaraManifest}
 *     assetBasePath="/assets/characters/capybara/1.0.0/"
 *     action="IDLE"
 *     intensity={1}
 *     hats={[coffeeHatManifest]}
 *     hatUrls={["/assets/hats/coffee-cup/1.0.0/texture.webp"]}
 *     width={256}
 *     height={256}
 *     scale={2}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PetEngine,
  type CharacterManifest,
  type HatManifest,
  type PetAction,
  type PetEngineCallbacks,
} from '../engine';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PetCanvasProps {
  /** Character manifest JSON (from asset pipeline). */
  manifest: CharacterManifest;
  /** Base URL prefix for the character's texture files. */
  assetBasePath: string;

  /** Current PetAction to display. */
  action?: PetAction;
  /** Typing intensity (1–3). */
  intensity?: 1 | 2 | 3;

  /** Ordered list of hat manifests (bottom → top). */
  hats?: HatManifest[];
  /** Matching texture URLs for each hat. */
  hatUrls?: string[];

  /** Integer scale factor. Auto-detected if omitted. */
  scale?: number;
  /** Display width (CSS px). */
  width?: number;
  /** Display height (CSS px). */
  height?: number;
  /** Transparent background (overlay mode). Default true. */
  transparent?: boolean;
  /** Max FPS. Default 30. */
  maxFps?: number;
  /** Pause rendering. */
  paused?: boolean;
  /** Additional CSS class for the wrapper div. */
  className?: string;

  /** Callback when a sprite event frame fires. */
  onEventFrame?: PetEngineCallbacks['onEventFrame'];
  /** Callback when a non-looping animation finishes. */
  onAnimationComplete?: PetEngineCallbacks['onAnimationComplete'];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PetCanvas({
  manifest,
  assetBasePath,
  action = 'IDLE',
  intensity = 1,
  hats,
  hatUrls,
  scale,
  width,
  height,
  transparent = true,
  maxFps = 30,
  paused = false,
  className,
  onEventFrame,
  onAnimationComplete,
}: PetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PetEngine | null>(null);
  const [ready, setReady] = useState(false);

  // Stable reference to callbacks.
  const callbacksRef = useRef<PetEngineCallbacks>({});
  callbacksRef.current = { onEventFrame, onAnimationComplete };

  // ── Init / teardown ────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;

    const engine = new PetEngine(
      {
        assetBasePath,
        scale,
        transparent,
        maxFps,
        logicalWidth: width ? undefined : manifest.canvas.width,
        logicalHeight: height ? undefined : manifest.canvas.height,
      },
      {
        onEventFrame: (...args) => callbacksRef.current.onEventFrame?.(...args),
        onAnimationComplete: (...args) =>
          callbacksRef.current.onAnimationComplete?.(...args),
      },
    );

    engineRef.current = engine;

    (async () => {
      try {
        await engine.init(el);
        if (disposed) {
          engine.dispose();
          return;
        }

        await engine.loadCharacter(manifest);
        if (disposed) {
          engine.dispose();
          return;
        }

        setReady(true);
      } catch (err) {
        console.error('[PetCanvas] initialisation failed:', err);
      }
    })();

    return () => {
      disposed = true;
      engine.dispose();
      engineRef.current = null;
      setReady(false);
    };
    // Only re-init when manifest identity or base path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest.characterId, manifest.assetVersion, assetBasePath]);

  // ── Action updates ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;
    engineRef.current?.setAction(action, intensity);
  }, [ready, action, intensity]);

  // ── Hat updates ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;

    const engine = engineRef.current;
    if (!engine) return;

    const hatStack = engine.hatStack;

    // Reconcile: clear and re-push.
    // A smarter diff could be added later.
    hatStack.clearHats();

    if (hats && hatUrls) {
      const count = Math.min(hats.length, hatUrls.length);
      (async () => {
        for (let i = 0; i < count; i++) {
          await engine.addHat(hats[i], hatUrls[i]);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hats, hatUrls]);

  // ── Pause / resume ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;
    if (paused) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.resume();
    }
  }, [ready, paused]);

  // ── Resize ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        engineRef.current?.resize(w, h);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  // ── Render ─────────────────────────────────────────────────────────────

  const style: React.CSSProperties = {
    width: width ?? manifest.canvas.width * (scale ?? 2),
    height: height ?? manifest.canvas.height * (scale ?? 2),
    imageRendering: 'pixelated',
    overflow: 'hidden',
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      data-testid="pet-canvas"
    />
  );
}
