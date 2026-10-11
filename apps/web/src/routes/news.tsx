import { createFileRoute } from '@tanstack/react-router'
import Feature from '../features/news/Feature'

export const Route = createFileRoute('/news')({ component: Feature })
