import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/terminal/Feature'

export const Route = createFileRoute('/terminal')({ component: Feature })
