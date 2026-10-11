import { createFileRoute } from '@tanstack/react-router'
import { NotesList } from '../../features/notes/notes-pages'

export const Route = createFileRoute('/notes/')({ component: NotesList })
