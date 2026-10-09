import type { ComponentProps } from 'react'
import { Button } from '../ui/button'

type AppButtonProps = ComponentProps<typeof Button>

export function AppButton(props: AppButtonProps) {
  return <Button {...props} />
}
