import type { CSSProperties, HTMLAttributes } from 'react'

type As = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'

type KineticTextProps = HTMLAttributes<HTMLElement> & {
  text: string
  as?: As
}

/**
 * Magic UI Kinetic Text — font-weight ripples across characters on hover.
 * https://magicui.design/docs/components/kinetic-text
 */
export function KineticText({
  text,
  as: Tag = 'h1',
  className = '',
  style,
  ...rest
}: KineticTextProps) {
  const mergedStyle = {
    '--hover-padding': 'calc(1em / 12)',
    '--text-stroke-width': 'calc(1em * 125 / 6000)',
    ...style,
  } as CSSProperties

  return (
    <Tag
      {...rest}
      className={`ob-kinetic ${className}`.trim()}
      style={mergedStyle}
    >
      {text.split('').map((letter, index) => (
        <span key={`${letter}-${index}`} className="ob-kinetic-letter" aria-hidden="true">
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
