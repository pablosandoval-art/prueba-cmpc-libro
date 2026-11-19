import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes'
import { Toaster } from './components/ui/Toaster'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
