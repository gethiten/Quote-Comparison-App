import { useState } from 'react'
import type { CarrierQuote } from '../../types'
import { uploadQuoteFile, createQuote, createCarrier, fetchCarriers } from '../../api/client'
import Button from '../ui/Button'

interface QuoteIngestionFormProps {
  onSubmit: (quote: CarrierQuote) => void
  onCancel: () => void
  propertyId: string
}

const EMPTY_QUOTE: Omit<CarrierQuote, 'id'> = {
  carrierName: '',
  amBestRating: 'A',
  admittedStatus: 'Admitted',
  quoteNumber: '',
  quoteDate: '',
  effectiveDate: '',
  expiryDate: '',
  valuationBasis: 'RC',
  coverageForm: 'Special',
  buildingLimit: 0,
  coinsurance: 90,
  bppLimit: 0,
  businessInterruptionLimit: 0,
  biPeriodMonths: 12,
  glPerOccurrence: 1000000,
  glAggregate: 2000000,
  aopDeductible: 5000,
  windHailDeductiblePct: 2,
  floodLimit: null,
  earthquakeLimit: null,
  equipmentBreakdown: true,
  ordinanceOrLaw: true,
  annualPremium: 0,
  underwritingNotes: '',
}

export default function QuoteIngestionForm({ onSubmit, onCancel, propertyId }: QuoteIngestionFormProps) {
  const [form, setForm] = useState(EMPTY_QUOTE)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile)
    setExtracting(true)
    setError(null)
    try {
      const result = await uploadQuoteFile(selectedFile)
      if (result.extracted_data) {
        const d = result.extracted_data as Record<string, unknown>
        setForm((prev) => ({
          ...prev,
          carrierName: (d.carrier_name as string) ?? prev.carrierName,
          quoteNumber: (d.quote_number as string) ?? prev.quoteNumber,
          quoteDate: (d.quote_date as string) ?? prev.quoteDate,
          effectiveDate: (d.effective_date as string) ?? prev.effectiveDate,
          expiryDate: (d.expiry_date as string) ?? prev.expiryDate,
          buildingLimit: (d.building_limit as number) ?? prev.buildingLimit,
          valuationBasis: ((d.valuation_basis as string) ?? prev.valuationBasis) as 'RC' | 'ACV',
          coverageForm: ((d.coverage_form as string) ?? prev.coverageForm) as 'Special' | 'Broad' | 'Basic',
          coinsurance: (d.coinsurance as number) ?? prev.coinsurance,
          bppLimit: (d.bpp_limit as number) ?? prev.bppLimit,
          businessInterruptionLimit: (d.business_interruption_limit as number) ?? prev.businessInterruptionLimit,
          biPeriodMonths: (d.bi_period_months as number) ?? prev.biPeriodMonths,
          glPerOccurrence: (d.gl_per_occurrence as number) ?? prev.glPerOccurrence,
          glAggregate: (d.gl_aggregate as number) ?? prev.glAggregate,
          aopDeductible: (d.aop_deductible as number) ?? prev.aopDeductible,
          windHailDeductiblePct: (d.wind_hail_deductible_pct as number) ?? prev.windHailDeductiblePct,
          floodLimit: (d.flood_limit as number) ?? prev.floodLimit,
          earthquakeLimit: (d.earthquake_limit as number) ?? prev.earthquakeLimit,
          equipmentBreakdown: (d.equipment_breakdown as boolean) ?? prev.equipmentBreakdown,
          ordinanceOrLaw: (d.ordinance_or_law as boolean) ?? prev.ordinanceOrLaw,
          annualPremium: (d.annual_premium as number) ?? prev.annualPremium,
          underwritingNotes: (d.underwriting_notes as string) ?? prev.underwritingNotes,
        }))
      } else {
        setError('The document uploaded, but no fields could be extracted automatically. You can still fill them in manually.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document. You can still fill in fields manually.')
    } finally {
      setExtracting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setError(null)
    try {
      // Find or create carrier
      const carriers = await fetchCarriers()
      let carrier = carriers.find(
        (c) => c.carrier_name.toLowerCase() === form.carrierName.toLowerCase()
      )
      if (!carrier) {
        carrier = await createCarrier({
          carrier_name: form.carrierName,
          am_best_rating: form.amBestRating,
          admitted_status: form.admittedStatus,
        })
      }

      // Create the quote in the backend
      const apiQuote = await createQuote({
        property_id: propertyId,
        carrier_id: carrier.id,
        quote_number: form.quoteNumber || undefined,
        quote_date: form.quoteDate || undefined,
        effective_date: form.effectiveDate || undefined,
        expiry_date: form.expiryDate || undefined,
        building_limit: form.buildingLimit || undefined,
        valuation_basis: form.valuationBasis,
        coverage_form: form.coverageForm,
        coinsurance: form.coinsurance,
        bpp_limit: form.bppLimit || undefined,
        business_interruption_limit: form.businessInterruptionLimit || undefined,
        bi_period_months: form.biPeriodMonths,
        gl_per_occurrence: form.glPerOccurrence || undefined,
        gl_aggregate: form.glAggregate || undefined,
        aop_deductible: form.aopDeductible,
        wind_hail_deductible_pct: form.windHailDeductiblePct,
        flood_limit: form.floodLimit,
        earthquake_limit: form.earthquakeLimit ?? null,
        equipment_breakdown: form.equipmentBreakdown,
        ordinance_or_law: form.ordinanceOrLaw,
        annual_premium: form.annualPremium || undefined,
        underwriting_notes: form.underwritingNotes || undefined,
        source_filename: file?.name,
      })

      // Map API response back to CarrierQuote for local state
      onSubmit({
        id: apiQuote.id,
        carrierName: carrier.carrier_name,
        amBestRating: carrier.am_best_rating ?? 'NR',
        admittedStatus: (carrier.admitted_status as 'Admitted' | 'Non-Admitted') ?? 'Admitted',
        quoteNumber: form.quoteNumber,
        quoteDate: form.quoteDate,
        effectiveDate: form.effectiveDate,
        expiryDate: form.expiryDate,
        buildingLimit: form.buildingLimit,
        valuationBasis: form.valuationBasis,
        coverageForm: form.coverageForm,
        coinsurance: form.coinsurance,
        bppLimit: form.bppLimit,
        businessInterruptionLimit: form.businessInterruptionLimit,
        biPeriodMonths: form.biPeriodMonths,
        glPerOccurrence: form.glPerOccurrence,
        glAggregate: form.glAggregate,
        aopDeductible: form.aopDeductible,
        windHailDeductiblePct: form.windHailDeductiblePct,
        floodLimit: form.floodLimit,
        earthquakeLimit: form.earthquakeLimit ?? null,
        equipmentBreakdown: form.equipmentBreakdown,
        ordinanceOrLaw: form.ordinanceOrLaw,
        annualPremium: form.annualPremium,
        underwritingNotes: form.underwritingNotes,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quote to the backend.')
      return
    } finally {
      setUploading(false)
    }
  }

  const fieldClass = 'w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none'
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-navy-dark">Add New Quote</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
          {/* File Upload */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Upload Quote Document (Optional)</label>
            <p className="text-xs text-blue-600 mb-3">Upload a PDF, Word, or Excel file to auto-extract quote fields.</p>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded file:bg-blue-600 file:text-white file:text-sm file:font-medium file:cursor-pointer hover:file:bg-blue-700"
            />
            {extracting && <p className="text-xs text-blue-700 mt-2 animate-pulse">Extracting fields from document...</p>}
            {file && !extracting && <p className="text-xs text-green-700 mt-2">Extracted from: {file.name}</p>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          {/* Carrier Info */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 w-full">Carrier Information</legend>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Carrier Name *</label><input required className={fieldClass} value={form.carrierName} onChange={(e) => set('carrierName', e.target.value)} /></div>
              <div><label className={labelClass}>Quote Number *</label><input required className={fieldClass} value={form.quoteNumber} onChange={(e) => set('quoteNumber', e.target.value)} /></div>
              <div>
                <label className={labelClass}>AM Best Rating</label>
                <select className={fieldClass} value={form.amBestRating} onChange={(e) => set('amBestRating', e.target.value)}>
                  {['A++', 'A+', 'A', 'A-', 'B++', 'B+', 'B'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Admitted Status</label>
                <select className={fieldClass} value={form.admittedStatus} onChange={(e) => set('admittedStatus', e.target.value as 'Admitted' | 'Non-Admitted')}>
                  <option value="Admitted">Admitted</option>
                  <option value="Non-Admitted">Non-Admitted</option>
                </select>
              </div>
              <div><label className={labelClass}>Quote Expiry Date *</label><input type="date" required className={fieldClass} value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></div>
            </div>
          </fieldset>

          {/* Coverage */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 w-full">Coverage Details</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Valuation Basis</label>
                <select className={fieldClass} value={form.valuationBasis} onChange={(e) => set('valuationBasis', e.target.value as 'RC' | 'ACV')}>
                  <option value="RC">Replacement Cost</option>
                  <option value="ACV">Actual Cash Value</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Coverage Form</label>
                <select className={fieldClass} value={form.coverageForm} onChange={(e) => set('coverageForm', e.target.value as 'Special' | 'Broad' | 'Basic')}>
                  <option value="Special">Special</option>
                  <option value="Broad">Broad</option>
                  <option value="Basic">Basic</option>
                </select>
              </div>
              <div><label className={labelClass}>Building Limit ($) *</label><input type="number" required className={fieldClass} value={form.buildingLimit || ''} onChange={(e) => set('buildingLimit', Number(e.target.value))} /></div>
              <div><label className={labelClass}>Coinsurance (%)</label><input type="number" className={fieldClass} value={form.coinsurance} onChange={(e) => set('coinsurance', Number(e.target.value))} /></div>
              <div><label className={labelClass}>BPP Limit ($)</label><input type="number" className={fieldClass} value={form.bppLimit || ''} onChange={(e) => set('bppLimit', Number(e.target.value))} /></div>
              <div><label className={labelClass}>BI Limit ($)</label><input type="number" className={fieldClass} value={form.businessInterruptionLimit || ''} onChange={(e) => set('businessInterruptionLimit', Number(e.target.value))} /></div>
              <div><label className={labelClass}>BI Period (months)</label><input type="number" className={fieldClass} value={form.biPeriodMonths} onChange={(e) => set('biPeriodMonths', Number(e.target.value))} /></div>
            </div>
          </fieldset>

          {/* Deductibles */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 w-full">Deductibles & Pricing</legend>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>AOP Deductible ($)</label><input type="number" className={fieldClass} value={form.aopDeductible} onChange={(e) => set('aopDeductible', Number(e.target.value))} /></div>
              <div><label className={labelClass}>Wind/Hail Ded. (%)</label><input type="number" step="0.5" className={fieldClass} value={form.windHailDeductiblePct} onChange={(e) => set('windHailDeductiblePct', Number(e.target.value))} /></div>
              <div><label className={labelClass}>Flood Limit ($)</label><input type="number" className={fieldClass} value={form.floodLimit ?? ''} onChange={(e) => set('floodLimit', e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank for excluded" /></div>
              <div><label className={labelClass}>Annual Premium ($) *</label><input type="number" required className={fieldClass} value={form.annualPremium || ''} onChange={(e) => set('annualPremium', Number(e.target.value))} /></div>
            </div>
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.equipmentBreakdown} onChange={(e) => set('equipmentBreakdown', e.target.checked)} className="rounded border-slate-300" />
                Equipment Breakdown
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.ordinanceOrLaw} onChange={(e) => set('ordinanceOrLaw', e.target.checked)} className="rounded border-slate-300" />
                Ordinance or Law
              </label>
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label className={labelClass}>Underwriting Notes</label>
            <textarea rows={3} className={fieldClass} value={form.underwritingNotes} onChange={(e) => set('underwritingNotes', e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <Button variant="secondary" onClick={onCancel} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={uploading || extracting}>
              {uploading ? 'Saving...' : 'Add Quote'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
