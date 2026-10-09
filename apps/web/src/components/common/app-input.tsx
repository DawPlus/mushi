import { useId, type ComponentProps } from 'react'
import { Input } from '../ui/input'

type AppInputProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
}

export function AppInput({ label, error, id, 'aria-describedby': describedBy, ...props }: AppInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <Input id={inputId} aria-invalid={Boolean(error)} aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined} {...props} />
      {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
