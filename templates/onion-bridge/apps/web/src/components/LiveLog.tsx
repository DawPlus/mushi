import { useEffect, useRef } from 'react'

type LiveLogProps = {
  lines: string[]
  live?: boolean
  className?: string
  onCopy?: () => void
}

/** Auto-scrolling log pane for active bridges. */
export function LiveLog({
  lines,
  live = false,
  className = '',
  onCopy,
}: LiveLogProps) {
  const preRef = useRef<HTMLPreElement>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    const node = preRef.current
    if (!node || !stickRef.current) return
    node.scrollTop = node.scrollHeight
  }, [lines])

  function onScroll() {
    const node = preRef.current
    if (!node) return
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight
    stickRef.current = distance < 48
  }

  const text = lines.length > 0 ? lines.join('\n') : live ? '로그 대기 중…' : '아직 로그 없음.'

  return (
    <div className={`ob-live-log ${live ? 'is-live' : ''} ${className}`.trim()}>
      <div className="ob-live-log-bar">
        <span className="ob-live-log-label">
          {live ? (
            <>
              <span className="ob-live-dot" aria-hidden="true" />
              LIVE LOG
            </>
          ) : (
            'LOG'
          )}
        </span>
        <button
          type="button"
          className="ob-btn ob-btn-ghost ob-btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(lines.join('\n') || text)
            onCopy?.()
          }}
        >
          복사
        </button>
      </div>
      <pre ref={preRef} className="ob-log ob-log-live" onScroll={onScroll}>
        {text}
      </pre>
    </div>
  )
}
