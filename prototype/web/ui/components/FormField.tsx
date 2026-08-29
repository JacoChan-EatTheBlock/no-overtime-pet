import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  leadingIcon?: ReactNode
  trailingAction?: ReactNode
}

export function FormField({
  id,
  label,
  leadingIcon,
  trailingAction,
  className,
  ...inputProps
}: FormFieldProps) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        {leadingIcon ? <span className={styles.leadingIcon}>{leadingIcon}</span> : null}
        <input
          id={id}
          className={[styles.input, className].filter(Boolean).join(' ')}
          {...inputProps}
        />
        {trailingAction ? <span className={styles.trailingAction}>{trailingAction}</span> : null}
      </span>
    </label>
  )
}
