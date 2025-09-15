'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Bell,
  BarChart2,
  Settings,
  Users,
  Smartphone,
  Plus,
  X,
  CheckCircle2,
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  Download,
} from 'lucide-react'

type Member = { id: string; name: string; phone?: string }
type Bill = {
  id: string
  title: string
  amount: number
  dueISO: string // yyyy-MM-dd
  category: string
  notes?: string
  paid: boolean
  createdBy: string // member id
  paidBy?: string // member id
  reminderDays?: number // per-bill override
  recipients?: string[] // member ids
}

const defaultMembers: Member[] = [
  { id: 'u1', name: 'You', phone: '+15551234567' },
  { id: 'u2', name: 'Partner', phone: '+15557654321' },
]

const DEFAULT_CATEGORIES = [
  'Home','Car','Utilities','Internet','Phone','Insurance',
  'Credit Card','Loan','Investment','Medical','Subscription','Groceries','Misc'
]

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const toISO = (d: Date) => d.toISOString().slice(0, 10)
const fmtMonth = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (aISO: string, bISO: string) => {
  const a = new Date(aISO); const b = new Date(bISO);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = new Date(first)
  // start on Sunday
  start.setDate(first.getDate() - ((first.getDay() + 7) % 7))
  const days: { date: string; monthIndex: number }[] = []
  for (let i=0;i<42;i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ date: d.toISOString().slice(0,10), monthIndex: d.getMonth() })
  }
  return days
}

function Weekdays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return (
    <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500 mb-2">
      {days.map((d)=>(<div key={d}>{d}</div>))}
    </div>
  )
}

export default function BillsAppUS() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [members, setMembers] = useState<Member[]>(defaultMembers)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [defaultReminderDays, setDefaultReminderDays] = useState<number>(1)
  const [defaultRecipients, setDefaultRecipients] = useState<string[]>(['u1'])
  const [query, setQuery] = useState('')

  const [bills, setBills] = useState<Bill[]>([
    { id: 'b1', title: 'Internet', amount: 60, dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 16)), category: 'Internet', paid: false, createdBy: 'u1', recipients: ['u1'] },
    { id: 'b2', title: 'Rent', amount: 1200, dueISO: toISO(new Date(today.getFullYear(), today.getMonth(), 5)), category: 'Home', paid: true, createdBy: 'u1', paidBy: 'u1' },
  ])

  const [showBillModal, setShowBillModal] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // localStorage persistence
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('finance-app-state-v1')
      if (raw) {
        const s = JSON.parse(raw)
        if (s.members) setMembers(s.members)
        if (s.categories) setCategories(s.categories)
        if (s.defaultReminderDays !== undefined) setDefaultReminderDays(s.defaultReminderDays)
        if (s.defaultRecipients) setDefaultRecipients(s.defaultRecipients)
        if (s.bills) setBills(s.bills)
      }
    } catch(e) {
      console.warn('Failed to load local state:', e)
    }
  }, [])

  useEffect(()=>{
    const state = { members, categories, defaultReminderDays, defaultRecipients, bills }
    try { localStorage.setItem('finance-app-state-v1', JSON.stringify(state)) }
    catch(e) { console.warn('Failed to save local state:', e) }
  }, [members, categories, defaultReminderDays, defaultRecipients, bills])

  const days = useMemo(()=> buildMonthGrid(currentMonth), [currentMonth])

  const filteredBills = useMemo(()=>{
    const q = query.trim().toLowerCase()
    if(!q) return bills
    return bills.filter(b => `${b.title} ${b.category} ${b.notes ?? ''}`.toLowerCase().includes(q))
  }, [bills, query])

  const overdue = filteredBills.filter(b => !b.paid && new Date(b.dueISO) < startOfDay(today))
  const upcoming = filteredBills.filter(b => !b.paid && new Date(b.dueISO) >= startOfDay(today))

  function openNew(date?: Date) {
    const d = date ? toISO(date) : toISO(today)
    const base: Bill = { id: `b${Date.now()}`, title: '', amount: 0, dueISO: d, category: categories[0] || 'Misc', notes: '', paid: false, createdBy: members[0].id, reminderDays: defaultReminderDays, recipients: defaultRecipients }
    setEditing(base); setShowBillModal(true);
  }
  function saveBill(b: Bill) {
    if (!b.title.trim()) return alert('Please enter a title.')
    if (Number.isNaN(b.amount)) return alert('Invalid amount.')
    setBills(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]);
    setShowBillModal(false);
  }
  function togglePaid(b: Bill) {
    setBills(prev => prev.map(x => x.id === b.id ? { ...x, paid: !x.paid, paidBy: !x.paid ? members[0].id : undefined } : x));
  }
  function removeBill(b: Bill) {
    if (!confirm('Delete this bill?')) return
    setBills(prev => prev.filter(x => x.id !== b.id)); setShowBillModal(false);
  }

  const totals = useMemo(()=>{
    const mKey = toISO(currentMonth).slice(0,7)
    const monthBills = bills.filter(b => b.dueISO.startsWith(mKey))
    const total = monthBills.reduce((s,b)=> s + b.amount, 0)
    const paid = monthBills.filter(b=>b.paid).reduce((s,b)=> s+b.amount, 0)
    return { total, paid, unpaid: Math.max(total - paid, 0) }
  }, [bills, currentMonth])

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ members, categories, defaultReminderDays, defaultRecipients, bills }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `bills-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (data.members) setMembers(data.members)
        if (data.categories) setCategories(data.categories)
        if (data.defaultReminderDays !== undefined) setDefaultReminderDays(data.defaultReminderDays)
        if (data.defaultRecipients) setDefaultRecipients(data.defaultRecipients)
        if (data.bills) setBills(data.bills)
        alert('Data imported successfully!')
      } catch(e) { alert('Invalid file.') }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className=\"min-h-screen grid grid-cols-[240px_1fr] bg-gray-50 text-gray-800\">\n        {/* Sidebar */}\n        <aside className=\"bg-white border-r p-4 flex flex-col justify-between\">\n          <div className=\"space-y-4\">\n            <h1 className=\"text-xl font-bold text-blue-600\">Bills</h1>\n            <nav className=\"space-y-2 text-sm\">\n              <div className=\"flex items-center gap-2 cursor-pointer font-medium text-gray-900\">\n                <Calendar className=\"w-5 h-5\" /> Calendar\n              </div>\n              <div className=\"flex items-center gap-2 cursor-pointer\">\n                <BarChart2 className=\"w-5 h-5\" /> Reports\n              </div>\n              <div className=\"flex items-center gap-2 cursor-pointer\">\n                <Users className=\"w-5 h-5\" /> Household\n              </div>\n              <div className=\"flex items-center gap-2 cursor-pointer\" onClick={() => setShowSettings(true)}>\n                <Settings className=\"w-5 h-5\" /> Settings\n              </div>\n            </nav>\n          </div>\n          <div className=\"flex items-center gap-2\">\n            <label className=\"btn flex items-center gap-2 cursor-pointer\">\n              <Upload className=\"w-4 h-4\" /> Import\n              <input type=\"file\" accept=\"application/json\" className=\"hidden\" onChange={importJSON} />\n            </label>\n            <button className=\"btn flex items-center gap-2\" onClick={exportJSON}>\n              <Download className=\"w-4 h-4\" /> Export\n            </button>\n          </div>\n        </aside>\n\n        {/* Main content */}\n        <main className=\"p-6 space-y-6\">\n          {/* Header */}\n          <header className=\"flex flex-wrap gap-3 justify-between items-center\">\n            <div className=\"flex items-center gap-2\">\n              <button className=\"p-2 rounded-lg border\" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>\n                <ChevronLeft className=\"w-4 h-4\" />\n              </button>\n              <h2 className=\"text-2xl font-semibold min-w-[190px] text-center\">{fmtMonth(currentMonth)}</h2>\n              <button className=\"p-2 rounded-lg border\" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>\n                <ChevronRight className=\"w-4 h-4\" />\n              </button>\n            </div>\n            <div className=\"flex items-center gap-2\">\n              <div className=\"relative\">\n                <Search className=\"w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400\" />\n                <input className=\"pl-9 pr-3 py-2 rounded-lg border bg-white\" placeholder=\"Search bills…\" value={query} onChange={(e) => setQuery(e.target.value)} />\n              </div>\n              <button className=\"bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2\" onClick={() => openNew()}>\n                <Plus className=\"w-4 h-4\" /> Add Bill\n              </button>\n            </div>\n          </header>\n\n          <div className=\"grid grid-cols-3 gap-6\">\n            {/* Calendar */}\n            <section className=\"col-span-2 bg-white rounded-2xl shadow p-4\">\n              <Weekdays />\n              <div className=\"grid grid-cols-7 gap-2\">\n                {days.map((day, i) => {\n                  const dayBills = filteredBills.filter((b) => sameDay(b.dueISO, day.date))\n                  const isToday = sameDay(toISO(today), day.date)\n                  const outside = day.monthIndex !== currentMonth.getMonth()\n                  return (\n                    <div key={i} className={\`min-h-[120px] border rounded-xl p-2 flex flex-col \${outside ? 'opacity-50' : ''} \${isToday ? 'ring-2 ring-blue-500' : ''}\`}>\n                      <div className=\"text-sm font-medium\">{new Date(day.date).getDate()}</div>\n                      <div className=\"mt-1 space-y-1 overflow-auto\">\n                        {dayBills.length === 0 && <div className=\"text-xs text-gray-300\">—</div>}\n                        {dayBills.map((b) => (\n                          <div key={b.id} className={\`text-xs px-2 py-1 rounded-lg border flex items-center justify-between \${b.paid ? 'bg-emerald-50' : 'bg-amber-50'}\`}>\n                            <span className=\"truncate\" title={b.title}>{b.title}</span>\n                            {!b.paid && <span className=\"ml-2 font-medium\">{currency.format(b.amount)}</span>}\n                            <button className=\"ml-2\" title=\"Edit\" onClick={() => { setEditing(b); setShowBillModal(true) }}><AlarmClock className=\"w-3.5 h-3.5\" /></button>\n                            <button className=\"ml-1\" title=\"Mark paid\" onClick={() => togglePaid(b)}><CheckCircle2 className=\"w-3.5 h-3.5\" /></button>\n                          </div>\n                        ))}\n                      </div>\n                      <button className=\"mt-auto text-xs text-blue-600 hover:underline text-left\" onClick={() => openNew(new Date(day.date))}>+ Add bill</button>\n                    </div>\n                  )\n                })}\n              </div>\n            </section>\n\n            {/* Right panel */}\n            <aside className=\"space-y-4\">\n              <div className=\"bg-white p-4 rounded-2xl shadow\">\n                <h3 className=\"font-semibold flex items-center gap-2\"><Bell className=\"w-4 h-4\" /> Upcoming</h3>\n                <ul className=\"mt-2 space-y-1 text-sm\">\n                  {upcoming.sort((a,b)=> +new Date(a.dueISO) - +new Date(b.dueISO)).slice(0,6).map(b => (\n                    <li key={b.id} className=\"flex justify-between\"><span className=\"truncate\" title={b.title}>{b.title}</span><span className=\"ml-2 text-gray-600\">{fmtShort(b.dueISO)} – {currency.format(b.amount)}</span></li>\n                  ))}\n                  {upcoming.length === 0 and <li className=\"text-gray-400\">Nothing soon</li>}\n                </ul>\n              </div>\n\n              <div className=\"bg-white p-4 rounded-2xl shadow\">\n                <h3 className=\"font-semibold flex items-center gap-2\"><BarChart2 className=\"w-4 h-4\" /> Monthly Report</h3>\n                <p className=\"text-sm text-gray-600 mt-2\">Total: {currency.format(totals.total)}</p>\n                <p className=\"text-sm text-gray-600\">Paid: {currency.format(totals.paid)}</p>\n                <p className=\"text-sm text-gray-600\">Unpaid: {currency.format(totals.unpaid)}</p>\n              </div>\n\n              {overdue.length > 0 && (\n                <div className=\"bg-white p-4 rounded-2xl shadow border border-amber-200\">\n                  <h3 className=\"font-semibold text-amber-700\">Heads up: {overdue.length} overdue bill(s)</h3>\n                </div>\n              )}\n            </aside>\n          </div>\n        </main>\n\n        {showBillModal && editing && (\n          <div className=\"fixed inset-0 bg-black/40 flex items-center justify-center p-4\" role=\"dialog\" aria-modal>\n            <div className=\"bg-white rounded-2xl w-full max-w-xl shadow-lg p-5\">\n              <div className=\"flex justify-between items-center\">\n                <h3 className=\"text-lg font-semibold\">{bills.some(x=>x.id===editing.id)? 'Edit bill' : 'New bill'}</h3>\n                <button onClick={()=> setShowBillModal(false)}><X className=\"w-5 h-5\"/></button>\n              </div>\n\n              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 mt-4\">\n                <Label label=\"Title\"><input className=\"input\" value={editing.title} onChange={e=> setEditing({...editing, title: e.target.value})} /></Label>\n                <Label label=\"Amount (USD)\"><input type=\"number\" className=\"input\" value={editing.amount} onChange={e=> setEditing({...editing, amount: Number(e.target.value)})} /></Label>\n                <Label label=\"Due date\"><input type=\"date\" className=\"input\" value={editing.dueISO} onChange={e=> setEditing({...editing, dueISO: e.target.value})} /></Label>\n                <Label label=\"Category\">\n                  <select className=\"input\" value={editing.category} onChange={e=> setEditing({...editing, category: e.target.value})}>\n                    {categories.map(c=> <option key={c} value={c}>{c}</option>)}\n                  </select>\n                </Label>\n                <Label label=\"Reminder (days before)\"><input type=\"number\" min={0} className=\"input\" value={editing.reminderDays ?? defaultReminderDays} onChange={e=> setEditing({...editing, reminderDays: Number(e.target.value)})} /></Label>\n                <Label label=\"Recipients\">\n                  <div className=\"flex flex-wrap gap-2\">\n                    {members.map(m => (\n                      <label key={m.id} className=\"flex items-center gap-2 text-sm border rounded-lg px-2 py-1\">\n                        <input type=\"checkbox\" checked={(editing.recipients ?? defaultRecipients).includes(m.id)} onChange={(e)=> {\n                          const base = new Set(editing.recipients ?? defaultRecipients);\n                          e.target.checked ? base.add(m.id) : base.delete(m.id);\n                          setEditing({...editing, recipients: Array.from(base)});\n                        }} /> {m.name}\n                      </label>\n                    ))}\n                  </div>\n                </Label>\n                <Label label=\"Notes\" full><textarea className=\"input h-24\" value={editing.notes} onChange={e=> setEditing({...editing, notes: e.target.value})}/></Label>\n                <div className=\"flex items-center gap-2\"><input type=\"checkbox\" checked={editing.paid} onChange={e=> setEditing({...editing, paid: e.target.checked})}/><span>Mark as paid</span></div>\n              </div>\n\n              <div className=\"flex justify-between mt-5\">\n                {bills.some(x=>x.id===editing.id) && (\n                  <button className=\"btn-danger\" onClick={()=> removeBill(editing)}>Delete</button>\n                )}\n                <div className=\"ml-auto flex gap-2\">\n                  <button className=\"btn\" onClick={()=> setShowBillModal(false)}>Cancel</button>\n                  <button className=\"btn-primary\" onClick={()=> saveBill(editing)}>Save</button>\n                </div>\n              </div>\n            </div>\n          </div>\n        )}\n\n        {showSettings && (\n          <div className=\"fixed inset-0 bg-black/40 flex items-stretch justify-end\" role=\"dialog\" aria-modal>\n            <div className=\"bg-white w-full max-w-lg p-5 overflow-y-auto\">\n              <div className=\"flex justify-between items-center\">\n                <h3 className=\"text-lg font-semibold flex items-center gap-2\"><Settings className=\"w-5 h-5\"/> Settings</h3>\n                <button onClick={()=> setShowSettings(false)}><X className=\"w-5 h-5\"/></button>\n              </div>\n\n              <div className=\"mt-4 space-y-6\">\n                <section>\n                  <h4 className=\"font-semibold\">Profile</h4>\n                  <div className=\"grid grid-cols-2 gap-3 mt-2\">\n                    <Label label=\"Display name\"><input className=\"input\" placeholder=\"Your name\" /></Label>\n                    <Label label=\"Phone (E.164)\"><input className=\"input\" placeholder=\"+15551234567\" /></Label>\n                  </div>\n                </section>\n\n                <section>\n                  <h4 className=\"font-semibold\">Reminders</h4>\n                  <div className=\"grid grid-cols-2 gap-3 mt-2\">\n                    <Label label=\"Default days before\"><input type=\"number\" min={0} className=\"input\" value={defaultReminderDays} onChange={(e)=> setDefaultReminderDays(Number(e.target.value))} /></Label>\n                    <Label label=\"Default recipients\">\n                      <div className=\"flex flex-wrap gap-2\">\n                        {members.map(m => (\n                          <label key={m.id} className=\"flex items-center gap-2 text-sm border rounded-lg px-2 py-1\">\n                            <input type=\"checkbox\" checked={defaultRecipients.includes(m.id)} onChange={(e)=> {\n                              const base = new Set(defaultRecipients);\n                              e.target.checked ? base.add(m.id) : base.delete(m.id);\n                              setDefaultRecipients(Array.from(base));\n                            }} /> {m.name}\n                          </label>\n                        ))}\n                      </div>\n                    </Label>\n                  </div>\n                  <p className=\"text-xs text-gray-500 mt-2\">SMS will be sent when we hook up the backend (Twilio) — in this version data stays only in your browser.</p>\n                </section>\n\n                <section>\n                  <h4 className=\"font-semibold\">Categories</h4>\n                  <div className=\"flex flex-wrap gap-2 mt-2\">\n                    {categories.map((c,idx)=> (<span key={idx} className=\"px-3 py-1 border rounded-full text-sm bg-gray-50\">{c}</span>))}\n                  </div>\n                  <div className=\"flex gap-2 mt-3\">\n                    <input id=\"newcat\" className=\"input flex-1\" placeholder=\"Add category…\" onKeyDown={(e:any)=>{ if(e.key==='Enter' && e.currentTarget.value.trim()){ setCategories(prev=> Array.from(new Set([...prev, e.currentTarget.value.trim()]))); e.currentTarget.value=''; }}} />\n                    <button className=\"btn\" onClick={()=>{ const inp = document.getElementById('newcat') as HTMLInputElement; if(inp?.value.trim()){ setCategories(prev=> Array.from(new Set([...prev, inp.value.trim()]))); inp.value=''; } }}>Add</button>\n                  </div>\n                </section>\n\n                <section>\n                  <h4 className=\"font-semibold\">Permissions</h4>\n                  <label className=\"flex items-center gap-2 text-sm mt-2\"><input type=\"checkbox\" defaultChecked/> Allow delete bills</label>\n                </section>\n\n                <section>\n                  <h4 className=\"font-semibold\">Household / Sharing</h4>\n                  <p className=\"text-sm text-gray-600 mt-1\">Share this code with your partner to join the same space:</p>\n                  <div className=\"mt-2 flex gap-2\"><input className=\"input flex-1\" readOnly value=\"HOUSEHOLD-CODE\" /><button className=\"btn\" onClick={()=> navigator.clipboard.writeText('HOUSEHOLD-CODE')}>Copy</button></div>\n                </section>\n              </div>\n            </div>\n          </div>\n        )}\n\n        <style jsx global>{`\n          .input { @apply w-full border rounded-lg px-3 py-2 bg-white; }\n          .btn { @apply border rounded-lg px-3 py-2; }\n          .btn-primary { @apply bg-blue-600 text-white rounded-lg px-4 py-2; }\n          .btn-danger { @apply bg-red-600 text-white rounded-lg px-3 py-2; }\n        `}</style>\n      </div>\n    )
}

function Label({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={\`text-sm \${full ? 'col-span-full' : ''}\`}>
      <div className="text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  )
}
