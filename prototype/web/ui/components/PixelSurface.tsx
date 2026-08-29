import type { PropsWithChildren } from 'react'
import styles from './PixelSurface.module.css'

interface PixelSurfaceProps extends PropsWithChildren {
  className?: string
  innerClassName?: string
  ariaLabel?: string
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export function PixelSurface({
  children,
  className,
  innerClassName,
  ariaLabel
}: PixelSurfaceProps) {
  return (
    <section className={joinClassNames(styles.frame, className)} aria-label={ariaLabel}>
      <div className={joinClassNames(styles.inner, innerClassName)}>{children}</div>
    </section>
  )
}
