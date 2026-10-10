import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/projects/Feature'

export const Route = createFileRoute('/projects')({ component: Feature })
