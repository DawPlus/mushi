import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/automation/Feature'

export const Route = createFileRoute('/automation')({ component: Feature })
