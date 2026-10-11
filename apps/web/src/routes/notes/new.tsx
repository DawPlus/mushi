import { createFileRoute } from '@tanstack/react-router'
import { NoteEditor } from '../../features/notes/notes-pages'

export const Route = createFileRoute('/notes/new')({ component: () => <NoteEditor /> })
