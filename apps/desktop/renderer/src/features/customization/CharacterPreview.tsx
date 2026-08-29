import type { ShopItem } from '../economy/types'
import styles from './CustomizationScreen.module.css'

interface CharacterPreviewProps {
  /** The currently equipped character */
  character: ShopItem | undefined
  /** Equipped hats, ordered bottom → top */
  hats: ShopItem[]
}

/**
 * Pixel-art preview of the current character with stacked hats.
 * Hats render bottom-to-top above the character sprite.
 * Uses integer-multiple scaling for crisp pixel rendering.
 */
export function CharacterPreview({ character, hats }: CharacterPreviewProps) {
  return (
    <div className={styles.previewCanvas}>
      {/* Hat stack (renders above the character) */}
      {hats.length > 0 && (
        <div className={styles.previewHatStack}>
          {hats.map((hat) => (
            <span key={hat.id} className={styles.previewHat} role="img" aria-label={hat.name}>
              {hat.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Character */}
      <div className={styles.previewCharacter}>
        {character ? (
          <span
            className={styles.previewCharacterEmoji}
            role="img"
            aria-label={character.name}
          >
            {character.emoji}
          </span>
        ) : (
          <img
            className="pixel-art"
            src="/assets/capybara/idle.png"
            alt="水豚"
            width={96}
            height={96}
          />
        )}
      </div>

      {/* Character name */}
      <span className={styles.previewCharName}>
        {character?.name ?? '水豚'}
      </span>
    </div>
  )
}
