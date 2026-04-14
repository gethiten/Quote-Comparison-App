import { useState } from 'react'
import type { Comparison, CarrierQuote } from '../types'
import AccountHeader from '../components/comparison/AccountHeader'
import PropertyTabs from '../components/comparison/PropertyTabs'
import ComparisonGrid from '../components/comparison/ComparisonGrid'
import ActionPanel from '../components/comparison/ActionPanel'
import QuoteIngestionForm from '../components/comparison/QuoteIngestionForm'

interface ComparisonViewProps {
  comparisons: Comparison[]
  selectedCarriers?: Record<string, boolean>
  onUpdateComparison?: (comparison: Comparison) => void
  onRefresh?: () => void
  showQuoteForm?: boolean
  onShowQuoteFormChange?: (show: boolean) => void
}

export default function ComparisonView({ comparisons, selectedCarriers = {}, onUpdateComparison, onRefresh, showQuoteForm: externalShowForm, onShowQuoteFormChange }: ComparisonViewProps) {
  const [activeTab, setActiveTab] = useState(0)

  const showQuoteForm = externalShowForm ?? false
  const setShowQuoteForm = onShowQuoteFormChange ?? (() => {})

  const sourceComparison = comparisons[activeTab]
  const filteredComparisons = comparisons.map((comp) => ({
    ...comp,
    quotes: comp.quotes.filter((quote) => selectedCarriers[quote.carrierName] ?? true),
  }))

  const comparison = filteredComparisons[activeTab]
  if (!sourceComparison || !comparison) {
    return (
      <>
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-bold text-navy-dark">No quote comparisons yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              The database is currently empty. Create or upload a property first, then the quote comparison grid will appear here.
            </p>
          </div>
        </div>
        {showQuoteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-navy-dark">Cannot add a quote yet</h3>
              <p className="mt-2 text-sm text-slate-600">
                A quote must be attached to a property. Since there are no properties or comparisons loaded yet, please upload or create one first.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowQuoteForm(false)}
                  className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const handleAddQuote = (quote: CarrierQuote) => {
    const updated: Comparison = {
      ...sourceComparison,
      quotes: [...sourceComparison.quotes, quote],
    }
    onUpdateComparison?.(updated)
    setShowQuoteForm(false)
    onRefresh?.()
  }

  const handleComparisonUpdate = (updated: Comparison) => {
    onUpdateComparison?.({
      ...sourceComparison,
      notes: updated.notes,
      recommendedQuoteId: updated.recommendedQuoteId,
      scoreWeights: updated.scoreWeights,
      status: updated.status,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <AccountHeader comparison={comparison} />
      <PropertyTabs
        comparisons={filteredComparisons}
        activeIndex={activeTab}
        onChangeTab={setActiveTab}
        onAddQuote={() => setShowQuoteForm(true)}
      />
      <div className="flex-1 overflow-y-auto">
        <ActionPanel comparison={comparison} onUpdate={handleComparisonUpdate} />
        <ComparisonGrid comparison={comparison} />
      </div>
      {showQuoteForm && (
        <QuoteIngestionForm
          propertyId={comparison.property.id}
          onSubmit={handleAddQuote}
          onCancel={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  )
}
