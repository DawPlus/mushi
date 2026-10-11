import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/dashboard/Feature'

export const Route = createFileRoute('/dashboard')({ component: Feature })
