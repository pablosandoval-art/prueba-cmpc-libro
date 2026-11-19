import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { AUDIT_LOGS, auditPage } from '../../../test/fixtures'
import { renderApp, signIn } from '../../../test/render'
import { API, requests, server } from '../../../test/server'
import { useAuthStore } from '../../auth/auth.store'
import { useAuditStore } from '../store/audit.store'

describe('AuditPage (auditoría)', () => {
  beforeEach(signIn)

  it('aparece como pestaña junto a Catálogo y lleva a la pantalla', async () => {
    const { user, router } = await renderApp('/books')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(nav).getByRole('link', { name: 'Auditoría' }))
    expect(await screen.findByRole('heading', { name: 'Auditoría' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/audit')
    expect(within(nav).getByRole('link', { name: 'Auditoría' })).toHaveAttribute('aria-current', 'page')
  })

  it('lista las operaciones con acción, entidad, registro, usuario y resumen', async () => {
    await renderApp('/audit')
    expect(await screen.findByText('3 operaciones')).toBeInTheDocument()
    expect(requests.audit.credentials).toBe('include')
    expect(Object.fromEntries(new URL(requests.audit.url).searchParams)).toEqual({ page: '1', limit: '10' })

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    const first = within(rows[0])
    expect(first.getByText('Edición')).toBeInTheDocument()
    expect(first.getByRole('button', { name: 'Cien años de soledad' })).toBeInTheDocument()
    expect(first.getByText('Precio, Disponibilidad')).toBeInTheDocument()
    expect(first.getByText('Administrador')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Creación')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Registro nuevo')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Eliminación')).toBeInTheDocument()
    expect(rows).toHaveLength(3)
    // El alto es constante: la tabla completa la página (10 filas) con filas en blanco ocultas.
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(10)
  })

  it('abre el detalle de una edición con la tabla antes → después', async () => {
    const { user } = await renderApp('/audit')
    await user.click(await screen.findByRole('button', { name: 'Cien años de soledad' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edición de libro' })
    expect(within(dialog).getByText('Campos modificados')).toBeInTheDocument()
    const price = within(dialog).getByRole('row', { name: /Precio/ })
    expect(within(price).getByText('$18.990')).toBeInTheDocument()
    expect(within(price).getByText('$19.990')).toBeInTheDocument()
    expect(within(dialog).getByRole('row', { name: /Disponibilidad/ })).toHaveTextContent('1420')
    expect(within(dialog).queryByRole('row', { name: /Título/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('muestra el registro completo en una creación y en una baja', async () => {
    const { user } = await renderApp('/audit')
    await screen.findByText('3 operaciones')
    await user.click(screen.getByRole('button', { name: /^Ver cambios: creación de autor/ }))
    let dialog = await screen.findByRole('dialog', { name: 'Creación de autor' })
    expect(within(dialog).getByText('Datos del registro creado')).toBeInTheDocument()
    expect(within(dialog).getByRole('row', { name: /Nombre/ })).toHaveTextContent('Clarice Lispector')
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^Ver cambios: eliminación de libro/ }))
    dialog = await screen.findByRole('dialog', { name: 'Eliminación de libro' })
    expect(within(dialog).getByText('Datos del registro eliminado')).toBeInTheDocument()
    expect(within(dialog).getByRole('row', { name: /Título/ })).toHaveTextContent('Rayuela')
    expect(within(dialog).getByRole('row', { name: /Eliminado el/ })).toBeInTheDocument()
  })

  it('avisa si una edición no cambió nada visible', async () => {
    const log = { ...AUDIT_LOGS[0], after: { ...AUDIT_LOGS[0].before, updatedAt: 'otra' } }
    server.use(http.get(`${API}/audit-logs`, () => HttpResponse.json(auditPage([log]))))
    const { user } = await renderApp('/audit')
    await user.click(await screen.findByRole('button', { name: 'Cien años de soledad' }))
    expect(await screen.findByText('Esta edición no modificó ningún campo visible.')).toBeInTheDocument()
  })

  it('filtra por acción y entidad, lo refleja en la URL y limpia los filtros', async () => {
    const { user, router } = await renderApp('/audit')
    await screen.findByText('3 operaciones')
    await user.selectOptions(screen.getByLabelText('Acción'), 'Creación')
    await waitFor(() => expect(router.state.location.search).toBe('?action=CREATE'))
    await waitFor(() => expect(new URL(requests.audit.url).searchParams.get('action')).toBe('CREATE'))
    expect(await screen.findByText('1 operación')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Entidad'), 'Autor')
    await waitFor(() => expect(router.state.location.search).toBe('?action=CREATE&entity=Author'))
    await waitFor(() => expect(new URL(requests.audit.url).searchParams.get('entityType')).toBe('Author'))

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(router.state.location.search).toBe('')
    expect(await screen.findByText('3 operaciones')).toBeInTheDocument()
  })

  it('filtra por rango de fechas enviando el día local completo', async () => {
    const { router } = await renderApp('/audit')
    await screen.findByText('3 operaciones')
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-18' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-19' } })
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-11-18&to=2026-11-19'))
    await waitFor(() => expect(new URL(requests.audit.url).searchParams.get('to')).not.toBeNull())
    const params = new URL(requests.audit.url).searchParams
    expect(new Date(params.get('from')!).getTime()).toBe(new Date(2026, 10, 18).getTime())
    expect(new Date(params.get('to')!).getTime()).toBe(new Date(2026, 10, 19, 23, 59, 59, 999).getTime())
    // Cada selector limita al otro para no armar un rango invertido.
    expect(screen.getByLabelText('Desde')).toHaveAttribute('max', '2026-11-19')
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('min', '2026-11-18')
  })

  it('pagina en el servidor', async () => {
    server.use(
      http.get(`${API}/audit-logs`, ({ request }) => {
        requests.audit = request
        const p = Number(new URL(request.url).searchParams.get('page') ?? 1)
        return HttpResponse.json(auditPage(AUDIT_LOGS, 25, p))
      }),
    )
    const { user, router } = await renderApp('/audit')
    await user.click(await screen.findByRole('button', { name: 'Página 3' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=3'))
    await waitFor(() => expect(new URL(requests.audit.url).searchParams.get('page')).toBe('3'))
  })

  it('muestra un estado vacío, distinto si hay filtros activos', async () => {
    server.use(http.get(`${API}/audit-logs`, () => HttpResponse.json(auditPage([]))))
    const view = await renderApp('/audit')
    expect(await screen.findByText('Aún no hay operaciones registradas.')).toBeInTheDocument()
    view.unmount()
    useAuditStore.getState().reset()

    await renderApp('/audit?action=DELETE')
    expect(
      await screen.findByText('Ninguna operación coincide con los filtros. Prueba quitando alguno.'),
    ).toBeInTheDocument()
  })

  it('informa del error y permite reintentar', async () => {
    server.use(
      http.get(
        `${API}/audit-logs`,
        () => HttpResponse.json({ statusCode: 500, message: 'Falla del servidor' }, { status: 500 }),
        {
          once: true,
        },
      ),
    )
    const { user } = await renderApp('/audit')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('3 operaciones')).toBeInTheDocument()
  })

  it('mantiene a la vista el resultado anterior (atenuado) mientras llega el nuevo', async () => {
    const { user } = await renderApp('/audit')
    await screen.findByText('3 operaciones')
    server.use(
      http.get(`${API}/audit-logs`, async () => {
        await delay(150)
        return HttpResponse.json(auditPage([]))
      }),
    )
    await user.selectOptions(screen.getByLabelText('Acción'), 'Eliminación')
    expect(await screen.findByRole('progressbar', { name: 'Actualizando listado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cien años de soledad' })).toBeInTheDocument()
    expect(
      await screen.findByText('Ninguna operación coincide con los filtros. Prueba quitando alguno.'),
    ).toBeInTheDocument()
  })

  it('descarta la caché al cerrar sesión', async () => {
    await renderApp('/audit')
    await screen.findByText('3 operaciones')
    expect(Object.keys(useAuditStore.getState().lists)).toEqual(['all'])
    useAuthStore.getState().logout()
    expect(useAuditStore.getState().lists).toEqual({})
  })
})
