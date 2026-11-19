import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { notify } from '../../notifications/toast.store'
import { useBooksStore } from '../store/books.store'
import type { Book } from '../types'

interface DeleteBookDialogProps {
  book: Pick<Book, 'id' | 'title'> | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteBookDialog({ book, onClose, onDeleted }: DeleteBookDialogProps) {
  const deleteBook = useBooksStore((s) => s.deleteBook)
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    if (!book) return
    setDeleting(true)
    try {
      await deleteBook(book.id)
      notify.success(`«${book.title}» se eliminó del catálogo.`)
      onClose()
      onDeleted?.()
    } catch (error) {
      notify.error((error as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={!!book}
      onClose={deleting ? () => {} : onClose}
      title="¿Eliminar este libro?"
      footer={
        <>
          <Button onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed">
        <strong className="font-semibold">«{book?.title}»</strong> dejará de aparecer en el catálogo. La eliminación
        queda registrada en la auditoría.
      </p>
    </Modal>
  )
}
