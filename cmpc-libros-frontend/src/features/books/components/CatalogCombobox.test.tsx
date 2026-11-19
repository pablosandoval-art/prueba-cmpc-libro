import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { useState } from 'react'
import { AUTHORS } from '../../../test/fixtures'
import { API, CREATED_CATALOG_ID, requests, server } from '../../../test/server'
import { useToastStore } from '../../notifications/toast.store'
import type { CatalogItem } from '../types'
import { CatalogCombobox } from './CatalogCombobox'

/** Combobox con estado propio, como lo usa el formulario (vía Controller). */
function Harness({
  onChange,
  initial = null,
  error,
}: {
  onChange?: (item: CatalogItem | null) => void
  initial?: CatalogItem | null
  error?: string
}) {
  const [value, setValue] = useState<CatalogItem | null>(initial)
  return (
    <CatalogCombobox
      kind="authors"
      label="Autor"
      noun="el autor"
      value={value}
      error={error}
      onChange={(item) => {
        setValue(item)
        onChange?.(item)
      }}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: 'Autor' })

describe('CatalogCombobox', () => {
  /** Simula la posición del campo en pantalla (jsdom no calcula layout). */
  function placeField(top: number) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 40, y: top, width: 320, height: 40 }),
    )
  }

  it('la lista se posiciona fija bajo el campo (no la recorta un modal) y se abre hacia arriba si no cabe', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    placeField(100)
    render(<Harness />)
    await user.click(input())
    let panel = (await screen.findByRole('listbox')).parentElement!
    expect(panel.style).toMatchObject({ position: 'fixed', left: '40px', width: '320px', top: '144px', bottom: '' })
    expect(screen.getByRole('listbox').style.maxHeight).toBe('256px')

    await user.tab()
    placeField(700)
    await user.click(input())
    panel = (await screen.findByRole('listbox')).parentElement!
    expect(panel.style).toMatchObject({ top: '', bottom: '104px', transformOrigin: 'bottom' })
    // Recolocación al hacer scroll (p. ej. dentro del cuerpo del modal).
    placeField(300)
    window.dispatchEvent(new Event('scroll'))
    expect(panel.style.top).toBe('344px')
  })

  it('al enfocar lista los registros ordenados y cierra al perder el foco', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(input()).toHaveAttribute('aria-expanded', 'false')

    await user.click(input())
    expect(await screen.findByRole('option', { name: AUTHORS[0].name })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(AUTHORS.length)
    expect(input()).toHaveAttribute('aria-expanded', 'true')

    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
  })

  it('filtra mientras se escribe y elige con el ratón', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.type(input(), 'cort')
    await screen.findByRole('option', { name: 'Julio Cortázar' })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2)) // + «Crear…»
    await user.click(screen.getByRole('option', { name: 'Julio Cortázar' }))

    expect(onChange).toHaveBeenCalledWith(AUTHORS[1])
    expect(input()).toHaveValue('Julio Cortázar')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('navega con el teclado: ↓ marca la opción, Enter la elige y Esc cierra', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(input())
    await screen.findByRole('option', { name: AUTHORS[0].name })
    await user.keyboard('{Enter}') // sin opción activa no elige nada ni envía formularios
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(input()).toHaveAttribute('aria-activedescendant', expect.stringMatching(/-opt-1$/))
    expect(screen.getByRole('option', { name: AUTHORS[1].name })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith(AUTHORS[1])

    await user.click(input())
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ofrece crear un nombre nuevo y lo selecciona al crearlo', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.type(input(), '  Vicente   Huidobro ')
    await user.click(await screen.findByRole('option', { name: 'Crear el autor «Vicente Huidobro»' }))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: CREATED_CATALOG_ID, name: 'Vicente Huidobro' }))
    expect(await requests.authorsCreate.json()).toEqual({ name: 'Vicente Huidobro' })
    expect(input()).toHaveValue('Vicente Huidobro')
  })

  it('no ofrece crear si el nombre ya existe (sin distinguir mayúsculas)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), 'isaac ASIMOV')
    await screen.findByRole('option', { name: 'Isaac Asimov' })
    expect(screen.queryByRole('option', { name: /Crear/ })).not.toBeInTheDocument()
  })

  it('escribir no borra la selección; al salir del campo el texto vuelve al valor elegido', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={AUTHORS[1]} onChange={onChange} />)
    expect(input()).toHaveValue('Julio Cortázar')

    await user.type(input(), 'xyz')
    expect(input()).toHaveValue('Julio Cortázarxyz')
    expect(onChange).not.toHaveBeenCalled() // la selección sigue vigente mientras se escribe

    await user.tab()
    expect(input()).toHaveValue('Julio Cortázar')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Esc cancela la edición y restaura el valor elegido', async () => {
    const user = userEvent.setup()
    render(<Harness initial={AUTHORS[1]} />)
    await user.type(input(), 'abc')
    await screen.findByRole('listbox')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input()).toHaveValue('Julio Cortázar')
  })

  it('vaciar el campo y salir quita el valor elegido', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={AUTHORS[1]} onChange={onChange} />)
    await user.clear(input())
    expect(onChange).not.toHaveBeenCalled()
    await user.tab()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('no muestra el error mientras se crea el registro y el campo conserva el foco', async () => {
    server.use(
      http.post(`${API}/authors`, async () => {
        await delay(200)
        return HttpResponse.json({ id: CREATED_CATALOG_ID, name: 'Nuevo Autor' }, { status: 201 })
      }),
    )
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness error="Selecciona o crea un autor" onChange={onChange} />)
    expect(screen.getByText('Selecciona o crea un autor')).toBeInTheDocument()

    await user.type(input(), 'Nuevo Autor')
    await user.click(await screen.findByRole('option', { name: 'Crear el autor «Nuevo Autor»' }))

    // Creando: el error se oculta, el campo no se deshabilita y no pierde el foco.
    await waitFor(() => expect(screen.queryByText('Selecciona o crea un autor')).not.toBeInTheDocument())
    expect(input()).toHaveAttribute('readonly')
    expect(input()).not.toBeDisabled()
    expect(input()).toHaveFocus()
    expect(input()).toHaveAttribute('aria-busy', 'true')

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ id: CREATED_CATALOG_ID, name: 'Nuevo Autor' }))
    expect(input()).toHaveFocus()
    expect(input()).not.toHaveAttribute('readonly')
  })

  it('muestra el error de validación y lo asocia al campo', () => {
    render(<Harness error="Selecciona o crea un autor" />)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription('Selecciona o crea un autor')
  })

  it('si la búsqueda falla lo informa y no ofrece crear', async () => {
    server.use(http.get(`${API}/authors`, () => HttpResponse.json({}, { status: 500 })))
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(input(), 'abc')
    expect(await screen.findByText(/error inesperado/)).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('si falla la creación avisa con una notificación y no selecciona nada', async () => {
    server.use(http.post(`${API}/authors`, () => HttpResponse.json({}, { status: 500 })))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.type(input(), 'Nuevo Autor')
    await user.click(await screen.findByRole('option', { name: 'Crear el autor «Nuevo Autor»' }))

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
    expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error' })
    expect(onChange).not.toHaveBeenCalled()
    expect(input()).not.toBeDisabled()
  })

  it('anuncia la cantidad de resultados a lectores de pantalla', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(input())
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 resultados'))
  })
})
