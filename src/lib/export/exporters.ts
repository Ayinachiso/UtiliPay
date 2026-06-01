/**
 * Export helpers.
 *
 * CSV is hand-rolled (zero deps).
 * XLSX uses SheetJS — make sure `xlsx` is installed.
 *
 * Both build identical row shapes from the same source data, so the
 * data the admin downloads is consistent across formats.
 */

import * as XLSX from 'xlsx'

/* =====================================================================
   Row shapes — what an admin actually wants to see in a spreadsheet
   ===================================================================== */

export interface PaymentExportRow {
  paid_at: string
  bill_title: string
  amount: number
  channel: string
  provider: string
  resident: string
  unit: string
  reference: string
}

export interface BillExportRow {
  bill_title: string
  unit: string
  amount_due: number
  amount_paid: number
  outstanding: number
  status: string
  due_date: string
}

export interface DefaulterExportRow {
  unit: string
  unpaid_bills: number
  outstanding: number
  residents: string
}

/* =====================================================================
   CSV — minimal RFC-4180 escaping
   ===================================================================== */

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // Quote if it contains comma, double-quote, newline, or starts with a sign.
  if (/[",\n\r]/.test(s) || /^[+\-=@]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: { key: keyof T; label: string }[]
): string {
  const head = headers.map((h) => csvEscape(h.label)).join(',')
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h.key])).join(','))
    .join('\n')
  return head + '\n' + body + '\n'
}

export function buildPaymentsCsv(rows: PaymentExportRow[]): string {
  return toCsv(rows, [
    { key: 'paid_at', label: 'Paid at' },
    { key: 'bill_title', label: 'Bill' },
    { key: 'amount', label: 'Amount (NGN)' },
    { key: 'channel', label: 'Channel' },
    { key: 'provider', label: 'Method' },
    { key: 'resident', label: 'Resident' },
    { key: 'unit', label: 'Unit' },
    { key: 'reference', label: 'Reference' },
  ])
}

export function buildBillsCsv(rows: BillExportRow[]): string {
  return toCsv(rows, [
    { key: 'bill_title', label: 'Bill' },
    { key: 'unit', label: 'Unit' },
    { key: 'amount_due', label: 'Amount due (NGN)' },
    { key: 'amount_paid', label: 'Amount paid (NGN)' },
    { key: 'outstanding', label: 'Outstanding (NGN)' },
    { key: 'status', label: 'Status' },
    { key: 'due_date', label: 'Due date' },
  ])
}

export function buildDefaultersCsv(rows: DefaulterExportRow[]): string {
  return toCsv(rows, [
    { key: 'unit', label: 'Unit' },
    { key: 'unpaid_bills', label: 'Unpaid bills' },
    { key: 'outstanding', label: 'Outstanding (NGN)' },
    { key: 'residents', label: 'Residents' },
  ])
}

/* =====================================================================
   XLSX — multi-sheet workbook so the chairman gets one tidy file
   ===================================================================== */

export interface ExportPayload {
  payments: PaymentExportRow[]
  bills: BillExportRow[]
  defaulters: DefaulterExportRow[]
  communityName: string
  generatedAt: string
}

export function buildXlsxWorkbook(payload: ExportPayload): Uint8Array {
  const wb = XLSX.utils.book_new()

  // Summary sheet
  const summary = [
    ['UtiliPay export'],
    [],
    ['Community', payload.communityName],
    ['Generated', payload.generatedAt],
    ['Total payments', payload.payments.length],
    ['Total bills', payload.bills.length],
    ['Defaulting units', payload.defaulters.length],
    [
      'Total outstanding (NGN)',
      payload.defaulters.reduce((s, d) => s + d.outstanding, 0),
    ],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 36 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Payments sheet
  const wsPayments = XLSX.utils.json_to_sheet(payload.payments)
  wsPayments['!cols'] = [
    { wch: 22 },
    { wch: 32 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 26 },
    { wch: 22 },
    { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments')

  // Bills sheet
  const wsBills = XLSX.utils.json_to_sheet(payload.bills)
  wsBills['!cols'] = [
    { wch: 32 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsBills, 'Bills')

  // Defaulters sheet
  const wsDefaulters = XLSX.utils.json_to_sheet(payload.defaulters)
  wsDefaulters['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 40 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDefaulters, 'Defaulters')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf as ArrayBuffer)
}
