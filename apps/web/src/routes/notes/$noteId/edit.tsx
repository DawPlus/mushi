import { createFileRoute } from '@tanstack/react-router'
import { NoteEditor } from '../../../features/notes/notes-pages'

export const Route = createFileRoute('/notes/$noteId/edit')({
  component: () => {
    const { noteId } = Route.useParams()
    return <NoteEditor id={noteId} />
  },
})
