import { useState, useEffect, useCallback } from 'react'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import ComparisonView from '../../pages/ComparisonView'
import Dashboard from '../../pages/Dashboard'
import { fetchComparisons } from '../../api/client'
import type { Comparison } from '../../types'
import type { Page } from '../../App'

interface LayoutProps {
  page: Page
  onNavigate: (p: Page) => void
}

export default function Layout({ page, onNavigate }: LayoutProps) {
  const [activeProperty, setActiveProperty] = useState(0)
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  const loadComparisons = useCallback(() => {
    setLoading(true)
    fetchComparisons()
      .then(({ comparisons: apiComparisons }) => {
        setComparisons(apiComparisons)
        setActiveProperty((prev) =>
          apiComparisons.length === 0 ? 0 : Math.min(prev, apiComparisons.length - 1)
        )
        if (apiComparisons.length === 0) {
          setShowQuoteForm(false)
        }
      })
      .catch(() => {
        setComparisons([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadComparisons()
  }, [loadComparisons])

  const handleUpdateComparison = (updated: Comparison) => {
    setComparisons((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
  }

  const handleNewQuote = () => {
    onNavigate('comparison')
    setShowQuoteForm(true)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav page={page} onNavigate={onNavigate} onNewQuote={handleNewQuote} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeProperty={activeProperty}
          onPropertySelect={(i) => {
            setActiveProperty(i)
            onNavigate('comparison')
          }}
          comparisons={comparisons}
        />
        <main className="flex-1 overflow-auto scrollbar-thin bg-slate-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400 text-sm">Loading comparisons...</div>
            </div>
          ) : page === 'comparison' ? (
            <ComparisonView
              comparisons={comparisons}
              onUpdateComparison={handleUpdateComparison}
              onRefresh={loadComparisons}
              showQuoteForm={showQuoteForm}
              onShowQuoteFormChange={setShowQuoteForm}
            />
          ) : (
            <Dashboard
              comparisons={comparisons}
              onSelectComparison={(i) => {
                setActiveProperty(i)
                onNavigate('comparison')
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}
