type StatusTone = 'online' | 'offline' | 'unknown' | 'error' | 'loading'

const toneClass: Record<StatusTone, string> = {
  online: 'bg-success/15 text-success',
  offline: 'bg-muted text-muted-foreground',
  unknown: 'bg-info/15 text-info-foreground',
  error: 'border border-destructive/40 bg-destructive/15 text-destructive',
  loading: 'bg-warning/20 text-warning-foreground',
}

const dotClass: Record<StatusTone, string> = {
  online: 'bg-success animate-pulse',
  offline: 'bg-muted-foreground',
  unknown: 'bg-info',
  error: 'bg-destructive',
  loading: 'bg-warning',
}

export function StatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${toneClass[tone]}`}>
      <span className={`size-2 shrink-0 rounded-full ${dotClass[tone]}`} aria-hidden="true" />
      {label}
    </span>
  )
}
