import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { BOOKS } from '../../../test/fixtures'
import { BookCover, GenreStamp, StockRamp } from './BookBits'
import { BooksTable } from './BooksTable'
import { ImageDropzone } from './ImageDropzone'
import { Pagination } from '../../../components/table/Pagination'

describe('BookBits', () => {
  it('BookCover usa la imagen o una tapa tipográfica', () => {
    const { rerender, container } = render(<BookCover title="Rayuela" imageUrl={null} />)
    expect(container).not.toHaveTextContent('Rayuela')
    rerender(<BookCover title="Rayuela" imageUrl={null} size="lg" />)
    expect(container).toHaveTextContent('Rayuela')
    rerender(<BookCover title="Rayuela" imageUrl="/uploads/r.png" size="lg" />)
    expect(screen.getByRole('img', { name: 'Portada de Rayuela' })).toHaveAttribute(
      'src',
      'http://localhost:3000/uploads/r.png',
    )
  })

  it('StockRamp distingue sin stock y stock bajo', () => {
    const { rerender } = render(<StockRamp stock={0} />)
    expect(screen.getByText('Sin stock')).toBeInTheDocument()
    rerender(<StockRamp stock={2} />)
    expect(screen.getByText('en stock', { exact: false })).toBeInTheDocument()
    render(<GenreStamp name="Ficción" muted />)
    expect(screen.getByText('Ficción')).toBeInTheDocument()
  })
})

describe('BooksTable (sobre TableLayout)', () => {
  const IDLE = { firstLoad: false, refreshing: false, stale: false }

  function setup(props: Partial<Parameters<typeof BooksTable>[0]> = {}) {
    const onSort = vi.fn()
    const onDelete = vi.fn()
    const view = render(
      <MemoryRouter>
        <BooksTable books={BOOKS} sort={[]} limit={10} onSort={onSort} onDelete={onDelete} load={IDLE} {...props} />
      </MemoryRouter>,
    )
    return { onSort, onDelete, container: view.container }
  }

  it('muestra los libros con precio y acciones', async () => {
    const { onDelete } = setup()
    expect(screen.getAllByRole('row')).toHaveLength(BOOKS.length + 1)
    expect(screen.getByText('$18.990')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Rayuela' }))
    expect(onDelete).toHaveBeenCalledWith(BOOKS[1])
    expect(screen.getByRole('link', { name: 'Editar Rayuela' })).toHaveAttribute('href', `/${BOOKS[1].id}/edit`)
  })

  it('ordena por columna y muestra prioridad en orden multi-campo', async () => {
    const { onSort } = setup({
      sort: [
        { field: 'price', direction: 'desc' },
        { field: 'title', direction: 'asc' },
      ],
    })
    await userEvent.click(screen.getByRole('button', { name: /^Autor/ }))
    expect(onSort).toHaveBeenCalledWith('author')
    const priceHeader = screen.getByRole('columnheader', { name: /Precio/ })
    expect(priceHeader).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByLabelText('prioridad 1')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Título/ })).toHaveAttribute('aria-sort', 'ascending')
  })

  const hiddenRows = (container: HTMLElement) => container.querySelectorAll('tbody tr[aria-hidden="true"]')

  it('completa la página con filas en blanco: el alto no depende de cuántos resultados hay', () => {
    const { container } = setup({ limit: 10 })
    expect(hiddenRows(container)).toHaveLength(10 - BOOKS.length)
    // Las filas en blanco no son accesibles: lectores de pantalla sólo ven los libros.
    expect(screen.getAllByRole('row')).toHaveLength(BOOKS.length + 1)
  })

  it('no agrega filas en blanco si la página ya está llena', () => {
    const { container } = setup({ limit: BOOKS.length })
    expect(hiddenRows(container)).toHaveLength(0)
  })

  it('el esqueleto de la primera carga tiene tantas filas como la página', () => {
    const { container } = setup({ load: { ...IDLE, firstLoad: true }, limit: 5 })
    expect(hiddenRows(container)).toHaveLength(5)
    expect(screen.queryByText('Rayuela')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('atenúa las filas del resultado anterior y muestra la barra mientras llega el nuevo', () => {
    const { container } = setup({ load: { firstLoad: false, stale: true, refreshing: true } })
    expect(container.querySelector('tbody')).toHaveClass('opacity-55')
    expect(screen.getByRole('progressbar', { name: 'Actualizando listado' })).toBeInTheDocument()
    expect(screen.getByText('Rayuela')).toBeInTheDocument()
  })

  it('sin atenuar cuando los datos están al día', () => {
    const { container } = setup()
    expect(container.querySelector('tbody')).not.toHaveClass('opacity-55')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('muestra un mensaje sobre las filas en blanco cuando no hay resultados', () => {
    const { container } = setup({ books: [], overlay: <p>Sin resultados</p> })
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(hiddenRows(container)).toHaveLength(10)
  })

  it('avisa un error al refrescar sin vaciar la tabla, y reserva el alto del pie', () => {
    const { container } = setup({ refreshError: 'Sin conexión' })
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar: Sin conexión')
    expect(screen.getByText('Rayuela')).toBeInTheDocument()
    expect(container.querySelector('section > div.h-16')).toBeInTheDocument()
  })

  it('muestra el pie cuando se le pasa', () => {
    setup({ footer: <nav aria-label="Paginación de prueba" /> })
    expect(screen.getByRole('navigation', { name: 'Paginación de prueba' })).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('navega entre páginas y cambia el tamaño', async () => {
    const onPage = vi.fn()
    const onLimit = vi.fn()
    render(<Pagination meta={{ page: 2, limit: 10, total: 35, totalPages: 4 }} onPage={onPage} onLimit={onLimit} />)
    expect(screen.getByText('11–20')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Página 4' }))
    expect(onPage.mock.calls).toEqual([[3], [1], [4]])
    await userEvent.selectOptions(screen.getByRole('combobox'), '50')
    expect(onLimit).toHaveBeenCalledWith(50)
  })

  it('con una sola página no muestra navegación', () => {
    render(<Pagination meta={{ page: 1, limit: 10, total: 0, totalPages: 0 }} onPage={vi.fn()} onLimit={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Página siguiente' })).not.toBeInTheDocument()
    expect(screen.getByText('0–0')).toBeInTheDocument()
  })
})

describe('ImageDropzone', () => {
  it('acepta una imagen válida y permite descartarla', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<ImageDropzone file={null} currentUrl={null} onChange={onChange} />)
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/Portada/), file)
    expect(onChange).toHaveBeenCalledWith(file)

    rerender(<ImageDropzone file={file} currentUrl={null} onChange={onChange} />)
    expect(screen.getByRole('img', { name: 'Vista previa de la portada' })).toHaveAttribute('src', 'blob:preview')
    await userEvent.click(screen.getByRole('button', { name: /Descartar imagen nueva/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('rechaza tipos no permitidos (también al arrastrar)', () => {
    const onChange = vi.fn()
    render(<ImageDropzone file={null} currentUrl="/uploads/actual.png" onChange={onChange} />)
    const zone = screen.getByRole('img').parentElement!
    fireEvent.dragOver(zone)
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG o WebP')
    expect(onChange).not.toHaveBeenCalled()
  })
})
