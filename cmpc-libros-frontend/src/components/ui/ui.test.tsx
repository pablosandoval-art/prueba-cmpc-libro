import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { notify } from '../../features/notifications/toast.store'
import { Button } from './Button'
import { SelectField, TextField } from './Field'
import { Modal } from './Modal'
import { EmptyState, ErrorState } from './States'
import { Toaster } from './Toaster'
import { Toggle } from './Toggle'

describe('Button', () => {
  it('muestra estado de carga y se deshabilita', () => {
    render(<Button loading>Guardar</Button>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('TextField / SelectField', () => {
  it('asocia la etiqueta y anuncia el error', () => {
    render(<TextField label="Título" error="Ingresa el título" />)
    const input = screen.getByLabelText('Título')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ingresa el título')
  })

  it('muestra la ayuda cuando no hay error', () => {
    render(
      <SelectField label="Género" hint="Elige uno">
        <option>Ficción</option>
      </SelectField>,
    )
    expect(screen.getByLabelText('Género')).toHaveAccessibleDescription('Elige uno')
  })
})

describe('Toggle', () => {
  it('es un switch accesible', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Sólo con stock" checked={false} onChange={onChange} />)
    const toggle = screen.getByRole('switch', { name: 'Sólo con stock' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Modal', () => {
  it('abre como diálogo y se cierra con el botón', async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open onClose={onClose} title="Detalle" footer={<button>Acción</button>}>
        contenido
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Detalle' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
    rerender(
      <Modal open={false} onClose={onClose} title="Detalle">
        contenido
      </Modal>,
    )
    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
  })

  it('Esc (cancel) y clic en el fondo cierran', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Detalle">
        contenido
      </Modal>,
    )
    const dialog = document.querySelector('dialog')!
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
    dialog.click()
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('Toaster', () => {
  it('muestra notificaciones y permite cerrarlas', async () => {
    render(<Toaster />)
    notify.error('Algo falló')
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo falló')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    expect(screen.queryByText('Algo falló')).not.toBeInTheDocument()
  })
})

describe('States', () => {
  it('ErrorState ofrece reintentar', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Sin conexión" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('EmptyState muestra el mensaje', () => {
    render(<EmptyState title="Sin resultados">Prueba otro filtro</EmptyState>)
    expect(screen.getByText('Prueba otro filtro')).toBeInTheDocument()
  })
})
