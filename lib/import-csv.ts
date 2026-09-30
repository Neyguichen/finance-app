import { normalizeFinancialLabel } from '@/lib/reconciliation'

export type CsvMapping = {
  date: string
  label: string
  amount?: string
  debit?: string
  credit?: string
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
  | 'savings_internal'
  | 'ignore'

export type MappedImportRow = {
  rowIndex: number
  date: string
  label: string
  amount: number
  nature: ImportNature
  categoryId?: string | null
  envelopeId?: string | null
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
    const label = (row[mapping.label] || '').trim()

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
    if (!label) {
      invalid.push({ rowIndex: index, reason: 'Libellé vide' })
      return
    }
    if (amount == null || !Number.isFinite(amount) || amount === 0) {
      invalid.push({ rowIndex: index, reason: 'Montant invalide ou nul' })
      return
    }

    valid.push({
      rowIndex: index,
      date,
      label,
      amount,
      nature: amount > 0 ? 'income' : 'expense',
      categoryId: null,
      envelopeId: null,
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
