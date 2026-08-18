import { useState } from 'react'
import { useToast } from '../ToastProvider'
import { useOverlay } from '../ui/useOverlay'
import { Building2, CreditCard, Edit2, Plus, X, Check, Archive } from 'lucide-react'

const MOCK_ENTITIES = [
  {
    id: 'e1',
    name: 'Meridian Capital Ltd.',
    address: '1 Canada Square, London E14 5AB, United Kingdom',
    taxId: 'GB 123 456 789',
    currency: 'GBP',
    paymentMethod: 'Visa •••• 4242',
    invoiceCount: 9,
    primary: true,
  },
  {
    id: 'e2',
    name: 'Meridian Asia Holdings Pte. Ltd.',
    address: '1 Raffles Place, #20-61, Singapore 048616',
    taxId: 'SG 201234567A',
    currency: 'SGD',
    paymentMethod: 'Mastercard •••• 8891',
    invoiceCount: 2,
    primary: false,
  },
]

export default function BillingEntities() {
  const [entities, setEntities] = useState(MOCK_ENTITIES)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const startEdit = (entity) => {
    setEditingId(entity.id)
    setDraft({ ...entity })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = () => {
    setEntities(entities.map(e => e.id === editingId ? { ...draft } : e))
    setEditingId(null)
    setDraft(null)
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Billing Entities</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Manage legal entities used for invoicing across your organisation.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#3D16FA] text-white hover:bg-[#2E10C4] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add entity
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {entities.map(entity => (
          <EntityCard
            key={entity.id}
            entity={entity}
            isEditing={editingId === entity.id}
            draft={draft}
            onDraftChange={setDraft}
            onEdit={() => startEdit(entity)}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ))}
      </div>

      {showAdd && (
        <AddEntityModal onClose={() => setShowAdd(false)} onAdd={(e) => { setEntities([...entities, { ...e, id: `e${Date.now()}`, invoiceCount: 0, primary: false }]); setShowAdd(false) }} />
      )}
    </div>
  )
}

function EntityCard({ entity, isEditing, draft, onDraftChange, onEdit, onSave, onCancel }) {
  const { addToast } = useToast()
  return (
    <div className="border border-black/[0.08] rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#3D16FA]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-4 h-4 text-[#3D16FA]" />
          </div>
          <div className="min-w-0">
            {isEditing ? (
              <input
                value={draft.name}
                onChange={e => onDraftChange({ ...draft, name: e.target.value })}
                className="text-[13px] font-semibold text-gray-900 w-full border border-black/[0.12] rounded-md px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-gray-900">{entity.name}</p>
                {entity.primary && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3D16FA]/10 text-[#3D16FA]">Primary</span>
                )}
              </div>
            )}
            <div className="mt-2 flex flex-col gap-1.5">
              <Field label="Address" isEditing={isEditing} value={isEditing ? draft.address : entity.address} onChange={v => onDraftChange({ ...draft, address: v })} />
              <Field label="Tax / VAT ID" isEditing={isEditing} value={isEditing ? draft.taxId : entity.taxId} onChange={v => onDraftChange({ ...draft, taxId: v })} />
              <div className="flex items-center gap-4">
                <Field label="Currency" isEditing={isEditing} value={isEditing ? draft.currency : entity.currency} onChange={v => onDraftChange({ ...draft, currency: v })} short />
                <ReadonlyField label="Invoices" value={String(entity.invoiceCount)} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <CreditCard className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-[12px] text-gray-500">{entity.paymentMethod}</span>
                <button onClick={() => addToast('Payment-method update link emailed to the billing contact (demo)', 'success')} className="text-[11px] text-[#3D16FA] hover:underline cursor-pointer">Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isEditing ? (
            <>
              <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={onSave} className="p-1.5 rounded-lg text-[#3D16FA] hover:bg-[#3D16FA]/10 transition-colors cursor-pointer">
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-black/[0.04] hover:text-gray-900 transition-colors cursor-pointer border border-black/[0.06]">
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button onClick={() => addToast(`${entity.name} archived — restore any time from account settings (demo)`, 'info')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-gray-400 hover:bg-black/[0.04] hover:text-gray-600 transition-colors cursor-pointer border border-black/[0.06]">
                <Archive className="w-3 h-3" />
                Archive
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, isEditing, onChange, short }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-16 shrink-0">{label}</span>
      {isEditing ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`text-[12px] text-gray-700 border border-black/[0.12] rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 ${short ? 'w-20' : 'flex-1'}`}
        />
      ) : (
        <span className="text-[12px] text-gray-700">{value}</span>
      )}
    </div>
  )
}

function ReadonlyField({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <span className="text-[12px] text-gray-700">{value}</span>
    </div>
  )
}

function AddEntityModal({ onClose, onAdd }) {
  const { ref, overlayProps } = useOverlay(onClose, { label: 'Add billing entity' })
  const [form, setForm] = useState({ name: '', address: '', taxId: '', currency: 'USD', paymentMethod: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.name.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} {...overlayProps} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-semibold text-gray-900">Add Billing Entity</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <FormField label="Legal name *" value={form.name} onChange={v => set('name', v)} placeholder="Acme Corp Ltd." />
          <FormField label="Billing address" value={form.address} onChange={v => set('address', v)} placeholder="1 Example St, City, Country" />
          <FormField label="Tax / VAT ID" value={form.taxId} onChange={v => set('taxId', v)} placeholder="GB 123 456 789" />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 block mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 bg-white"
              >
                {['USD', 'GBP', 'EUR', 'SGD', 'AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] text-gray-600 hover:bg-black/[0.04] transition-colors cursor-pointer">Cancel</button>
          <button
            onClick={() => valid && onAdd(form)}
            disabled={!valid}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${valid ? 'bg-[#3D16FA] text-white hover:bg-[#2E10C4] cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Add entity
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-gray-500 block mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[12px] text-gray-700 border border-black/[0.12] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3D16FA]/40 placeholder:text-gray-300"
      />
    </div>
  )
}
