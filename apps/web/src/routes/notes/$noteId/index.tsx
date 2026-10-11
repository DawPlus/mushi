import { createFileRoute } from '@tanstack/react-router'
import { NoteDetail } from '../../../features/notes/notes-pages'

export const Route = createFileRoute('/notes/$noteId/')({
  component: () => {
    const { noteId } = Route.useParams()
    return <NoteDetail id={noteId} />
  },
})
