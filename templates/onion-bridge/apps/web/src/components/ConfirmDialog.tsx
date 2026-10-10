import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'accent' | 'danger' | 'ok'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  tone = 'accent',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const descId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Freeze background hit-testing/hover while confirm is open. Portal covers
  // paint order, but sticky :hover on the Tunnel card can still light up.
  useLayoutEffect(() => {
    if (!open) return
    const shell = document.querySelector('.ob-shell')
    document.body.classList.add('ob-modal-open')
    shell?.setAttribute('inert', '')
    return () => {
      document.body.classList.remove('ob-modal-open')
      shell?.removeAttribute('inert')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 20)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (!busy) onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown, true)
      previous?.focus?.()
    }
  }, [open, busy, onCancel])

  // Portal to body so fixed overlay escapes AnimatedItem transforms,
  // ob-active-slot isolation, and later sibling cards painting above.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="ob-confirm-root" role="presentation">
          <motion.button
            type="button"
            className="ob-confirm-backdrop"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.16 }}
            onClick={() => {
              if (!busy) onCancel()
            }}
          />
          <motion.div
            className={`ob-confirm-dialog ob-confirm-${tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 id={titleId} className="ob-confirm-title">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="ob-confirm-desc">
                {description}
              </p>
            ) : null}
            <div className="ob-confirm-actions">
              <button
                type="button"
                className="ob-btn ob-btn-ghost"
                disabled={busy}
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={[
                  'ob-btn',
                  tone === 'danger'
                    ? 'ob-btn-danger'
                    : tone === 'ok'
                      ? 'ob-btn-primary ob-btn-ok'
                      : 'ob-btn-primary',
                ].join(' ')}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? '처리 중…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
