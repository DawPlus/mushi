import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/opportunities/Feature'

export const Route = createFileRoute('/opportunities')({ component: Feature })
