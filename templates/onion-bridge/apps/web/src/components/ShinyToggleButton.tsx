type InteractiveHoverToggleProps = {
  label: string
  on: boolean
  busy?: boolean
  disabled?: boolean
  title?: string
  className?: string
  onToggle: () => void
}

/**
 * Magic UI Interactive Hover Button–inspired runtime toggle.
 * Rest: status dot + "Tunnel"/"Dev". Hover: slides to ON/OFF action.
 * https://magicui.design/docs/components/interactive-hover-button
 */
export function ShinyToggleButton({
  label,
  on,
  busy = false,
  disabled = false,
  title,
  className = '',
  onToggle,
}: InteractiveHoverToggleProps) {
  const locked = disabled || busy
  const action = on ? 'OFF' : 'ON'

  return (
    <button
      type="button"
      className={[
        'ob-hover-toggle',
        on ? 'is-on' : 'is-off',
        busy ? 'is-busy' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={on}
      aria-label={`${label} ${on ? '켜짐' : '꺼짐'}`}
      title={title || `${label}: ${on ? 'ON' : 'OFF'}`}
      disabled={locked}
      onClick={(event) => {
        event.stopPropagation()
        if (!locked) onToggle()
      }}
    >
      <span className="ob-hover-toggle-rest">
        <span className="ob-hover-toggle-dot" aria-hidden="true" />
        <span className="ob-hover-toggle-label">{label}</span>
      </span>
      <span className="ob-hover-toggle-hover" aria-hidden="true">
        <span className="ob-hover-toggle-action">{action}</span>
        <svg
          className="ob-hover-toggle-arrow"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 8h9M8.5 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
