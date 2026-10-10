import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/agents/Feature'

export const Route = createFileRoute('/agents')({ component: Feature })
