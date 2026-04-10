import { useState } from 'react'
import Layout from './components/layout/Layout'

export type Page = 'dashboard' | 'comparison'

export default function App() {
  const [page, setPage] = useState<Page>('comparison')

  return <Layout page={page} onNavigate={setPage} />
}
