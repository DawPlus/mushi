import type { ComponentProps } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '../ui/button'
import { RippleButton } from '../ui/ripple-button'
import { cn } from '../../lib/utils'

type AppButtonProps = ComponentProps<typeof RippleButton> &
  VariantProps<typeof buttonVariants>

export function AppButton({
  className,
  variant = 'default',
  size = 'default',
  rippleColor,
  ...props
}: AppButtonProps) {
  return (
    <RippleButton
      className={cn(buttonVariants({ variant, size }), className)}
      rippleColor={rippleColor}
      {...props}
    />
  )
}
