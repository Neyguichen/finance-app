import { normalizeFinancialLabel } from '@/lib/reconciliation'

export type CsvMapping = {
  // Date bancaire / de validation. Obligatoire pour un relevé bancaire.
  date: string
  // Date d'opération facultative. Si absente, on réutilise la date bancaire.
  operationDate?: string
  label: string
  amount?: string
  debit?: string
  credit?: string
  category?: string
  subcategory?: string
  nature?: string
  note?: string
  incomeType?: string
  envelope?: string
}

export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
  delimiter: string
}

export type ImportNature =
  | 'expense'
  | 'income'
  | 'savings_deposit'
  | 'savings_withdrawal'
  | 'expense_reimbursement'
  | 'ignore'

export type MappedImportRow = {
  rowIndex: number
  // Date bancaire / validation.
  date: string
  // Date de l'opération. Égale à date si le fichier ne fournit qu'une date.
  operationDate: string
  label: string
  amount: number
  nature: ImportNature
  categoryId?: string | null
  subcategoryId?: string | null
  envelopeId?: string | null
  categoryName?: string | null
  subcategoryName?: string | null
  note?: string | null
  incomeType?: 'actif' | 'passif' | null
  envelopeName?: string | null
  reimbursementTransactionId?: string | null
  reimbursementPendingItemId?: string | null
  reimbursementExpenseLabel?: string | null
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === delimiter && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

export function detectDelimiter(headerLine: string) {
  const choices = [';', ',', '\t']
  return choices
    .map(delimiter => ({ delimiter, count: splitCsvLine(headerLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ';'
}

export function parseCsv(text: string, forcedDelimiter?: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n').filter(line => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [], delimiter: forcedDelimiter || ';' }

  const delimiter = forcedDelimiter || detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map(header => header.trim())

  const rows = lines.slice(1).map(line => {
    const values = splitCsvLine(line, delimiter)
    return headers.reduce<Record<string, string>>((result, header, index) => {
      result[header] = values[index] ?? ''
      return result
    }, {})
  })

  return { headers, rows, delimiter }
}

export function parseImportDate(value: string) {
  const raw = value.trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) {
    const [, year, month, day] = iso
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const french = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (french) {
    const [, day, month, shortYear] = french
    const year = shortYear.length === 2 ? `20${shortYear}` : shortYear
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function parseImportAmount(value: string) {
  const raw = value.trim()
  if (!raw) return null
  const negativeByParentheses = /^\(.*\)$/.test(raw)
  const normalized = raw
    .replace(/[€$£\s\u00A0]/g, '')
    .replace(/[()]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9+\-.]/g, '')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return negativeByParentheses ? -Math.abs(parsed) : parsed
}

// Compatibility export for existing import code. Shared reconciliation rules now
// own label normalization so CSV and balance reconciliation use the same logic.
export const normalizeImportLabel = normalizeFinancialLabel

export function mapCsvRows(
  rows: Record<string, string>[],
  mapping: CsvMapping,
): { valid: MappedImportRow[]; invalid: Array<{ rowIndex: number; reason: string }> } {
  const valid: MappedImportRow[] = []
  const invalid: Array<{ rowIndex: number; reason: string }> = []

  rows.forEach((row, index) => {
    const date = parseImportDate(row[mapping.date] || '')
    const operationDate = mapping.operationDate
      ? parseImportDate(row[mapping.operationDate] || '')
      : date
    const label = (row[mapping.label] || '').trim()
    const categoryName = mapping.category ? (row[mapping.category] || '').trim() || null : null
    const subcategoryName = mapping.subcategory ? (row[mapping.subcategory] || '').trim() || null : null
    const note = mapping.note ? (row[mapping.note] || '').trim() || null : null
    const envelopeName = mapping.envelope ? (row[mapping.envelope] || '').trim() || null : null
    const incomeTypeRaw = mapping.incomeType ? (row[mapping.incomeType] || '').trim().toLowerCase() : ''
    const incomeType = ['passif', 'passive', 'passif/passive'].includes(incomeTypeRaw) ? 'passif' as const
      : ['actif', 'active', 'actif/active'].includes(incomeTypeRaw) ? 'actif' as const
      : null
    const natureRaw = mapping.nature ? (row[mapping.nature] || '').trim().toLowerCase() : ''

    let amount: number | null = null
    if (mapping.amount) {
      amount = parseImportAmount(row[mapping.amount] || '')
    } else {
      const debit = mapping.debit ? Math.abs(parseImportAmount(row[mapping.debit] || '') || 0) : 0
      const credit = mapping.credit ? Math.abs(parseImportAmount(row[mapping.credit] || '') || 0) : 0
      amount = credit - debit
    }

    if (!date) {
      invalid.push({ rowIndex: index, reason: 'Date illisible' })
      return
    }
    if (mapping.operationDate && !operationDate) {
      invalid.push({ rowIndex: index, reason: 'Date d’opération illisible' })
      return
    }
    if (!label) {
      invalid.push({ rowIndex: index, reason: 'Libellé vide' })
      return
    }
    if (amount == null || !Number.isFinite(amount) || amount === 0) {
      invalid.push({ rowIndex: index, reason: 'Montant invalide ou nul' })
      return
    }

    let nature: ImportNature = amount > 0 ? 'income' : 'expense'
    if (natureRaw) {
      const normalizedNature = natureRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normalizedNature.includes('remboursement') || normalizedNature.includes('refund') || normalizedNature.includes('reimbursement')) {
        nature = 'expense_reimbursement'
      } else if (normalizedNature.includes('epargne') || normalizedNature.includes('saving')) {
        nature = normalizedNature.includes('reprise') || normalizedNature.includes('retrait') || normalizedNature.includes('withdraw')
          ? 'savings_withdrawal'
          : 'savings_deposit'
      } else if (normalizedNature.includes('revenu') || normalizedNature.includes('income') || normalizedNature.includes('credit')) {
        nature = 'income'
      } else if (normalizedNature.includes('depense') || normalizedNature.includes('expense') || normalizedNature.includes('debit')) {
        nature = 'expense'
      } else if (normalizedNature.includes('ignor')) {
        nature = 'ignore'
      }
    }

    valid.push({
      rowIndex: index,
      date,
      operationDate: operationDate || date,
      label,
      amount,
      nature,
      categoryId: null,
      subcategoryId: null,
      envelopeId: null,
      categoryName,
      subcategoryName,
      note,
      incomeType,
      envelopeName,
      reimbursementTransactionId: null,
      reimbursementPendingItemId: null,
      reimbursementExpenseLabel: null,
    })
  })

  return { valid, invalid }
}

export function monthStartFromDate(date: string) {
  return `${date.slice(0, 7)}-01`
}


export async function fingerprintCsv(text: string) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
