import { createFileRoute } from '@tanstack/react-router'
import { BentoHome } from '../features/system/bento-home'

export const Route = createFileRoute('/')({ component: BentoHome })
