function looksLikeTableRow(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const numericMatches = trimmed.match(/[-+]?\d+(?:[.,]\d+)?%?/g) || []
  const hasStatsTerm = /\b(SD|RMSAE|RMSE|MAE|MedAE|PE|CI|OR|RR|HR|IQR|MAD|mean|median|range|formula|formu|group|cohort)\b/i.test(trimmed)
  return numericMatches.length >= 3 || (numericMatches.length >= 2 && hasStatsTerm)
}

function looksLikeTableCaption(line: string, nextLine: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\[TABLE:/i.test(trimmed)) return false
  if (/^(table|tabela)\s*\d+/i.test(trimmed)) return true
  if (/^(table|tabela)\s*[:.-]/i.test(trimmed)) return true
  if (trimmed.length > 120 || /[.;,]$/.test(trimmed)) return false
  if (trimmed.split(/\s+/).length > 8 || !/^[A-Z0-9]/.test(trimmed)) return false
  return looksLikeTableRow(nextLine) && /\b(whole|overall|primary|subgroup|short|long|IOL|results|formula|formu|prediction|refractive|eyes|oczu|wynik|tabela|patients|groups?)\b/i.test(trimmed)
}

function wrapDetectedTables(text: string): string {
  const lines = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const output: string[] = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ''
    const trimmed = line.trim()
    const nextLine = lines[i + 1] || ''

    if (looksLikeTableCaption(trimmed, nextLine)) {
      if (inTable) {
        output.push('[END TABLE]')
      }
      output.push(`[TABLE: ${trimmed}]`)
      inTable = true
      continue
    }

    if (inTable && !trimmed) {
      const upcoming = lines.slice(i + 1, i + 4).some((candidate) => looksLikeTableRow(candidate))
      if (!upcoming) {
        output.push('[END TABLE]')
        inTable = false
      }
      output.push('')
      continue
    }

    output.push(line)
  }

  if (inTable) {
    output.push('[END TABLE]')
  }

  return output.join('\n')
}

function isLikelyRowLabel(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\[|^(table|figure|fig\.|tabela)\b/i.test(trimmed)) return false
  if (/[.;:]$/.test(trimmed)) return false
  if (trimmed.length > 48) return false
  if (!/[A-Za-z]/.test(trimmed)) return false
  const numericMatches = trimmed.match(/\d/g) || []
  return numericMatches.length <= 2
}

function isLikelyNumericContinuation(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\[|^(table|figure|fig\.|tabela)\b/i.test(trimmed)) return false
  const numericMatches = trimmed.match(/\d/g) || []
  const letterMatches = trimmed.match(/[A-Za-z]/g) || []
  return numericMatches.length >= 2 && letterMatches.length <= 2
}

function joinBrokenTableRows(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || ''
    const trimmed = line.trim()

    if (/^\[TABLE:/i.test(trimmed)) {
      inTable = true
      output.push(line)
      continue
    }
    if (/^\[END TABLE\]/i.test(trimmed)) {
      inTable = false
      output.push(line)
      continue
    }

    if (inTable && isLikelyRowLabel(trimmed)) {
      const parts = [trimmed]
      let j = i + 1
      while (j < lines.length && parts.join(' ').length < 180) {
        const next = (lines[j] || '').trim()
        if (!next) break
        if (/^\[|^(table|figure|fig\.|tabela)\b/i.test(next)) break
        if (looksLikeTableRow(next) || isLikelyNumericContinuation(next) || (parts.length === 1 && isLikelyRowLabel(next))) {
          parts.push(next)
          j += 1
          if (parts.some((part) => looksLikeTableRow(part) || isLikelyNumericContinuation(part))) {
            while (j < lines.length && isLikelyNumericContinuation(lines[j] || '') && parts.join(' ').length < 220) {
              parts.push((lines[j] || '').trim())
              j += 1
            }
            break
          }
          continue
        }
        break
      }

      if (parts.length > 1 && parts.some((part) => isLikelyNumericContinuation(part) || looksLikeTableRow(part))) {
        output.push(parts.join(' '))
        i = j - 1
        continue
      }
    }

    output.push(line)
  }

  return output.join('\n')
}

function findCompactNumericStart(line: string): number {
  for (let i = 1; i < line.length - 2; i++) {
    const current = line[i]
    const next = line[i + 1]
    const after = line[i + 2]
    if ((current === '0' || current === '1') && next === '.' && /\d/.test(after || '')) {
      return i
    }
    if (/\d/.test(current || '') && next === '.' && /\d/.test(after || '') && !/[A-Za-z]/.test(line[i - 1] || '')) {
      return i
    }
  }

  const separated = line.search(/\s[-+]?\d+(?:[.,]\d+)?/)
  return separated >= 0 ? separated + 1 : -1
}

function cleanNumericTail(tail: string): string {
  return tail
    .replace(/[,\u2212]/g, (value) => (value === ',' ? '.' : '-'))
    .replace(/[^\d.<>=+\-]/g, '')
}

function takeLeadingDecimal(tail: string): string | null {
  const match = tail.match(/^[-+]?0\.\d+/)
  if (!match) return null
  const raw = match[0]
  const sign = raw.startsWith('-') || raw.startsWith('+') ? raw[0] : ''
  const body = sign ? raw.slice(1) : raw
  const decimalDigits = body.slice(2)
  const size = decimalDigits.startsWith('00') && decimalDigits.length >= 3 ? 3 : 2
  return `${sign}${body.slice(0, 2 + Math.min(size, decimalDigits.length))}`
}

function takeLeadingPercentageLike(tail: string): string | null {
  const decimalMatch = tail.match(/^\d+\.\d+/)
  if (decimalMatch) {
    const raw = decimalMatch[0]
    const [integerPart, decimalPart = ''] = raw.split('.')
    if (integerPart.length > 2) {
      return integerPart.slice(0, 2)
    }
    if (integerPart.length === 2 && decimalPart.length > 1) {
      return `${integerPart}.${decimalPart.slice(0, 1)}`
    }
    return raw
  }

  const integerMatch = tail.match(/^\d+/)
  if (!integerMatch) return null
  const raw = integerMatch[0]
  if (raw.length > 2) return raw.slice(0, 2)
  return raw
}

function tokenizeCompactNumericTail(tail: string): string[] {
  const values: string[] = []
  let rest = cleanNumericTail(tail)

  while (rest.length > 0 && values.length < 40) {
    rest = rest.replace(/^[^\d.<>=+\-]+/, '')
    if (!rest) break

    const comparator = rest.match(/^(?:<=|>=|<|>)\d+(?:\.\d+)?/)
    if (comparator) {
      values.push(comparator[0])
      rest = rest.slice(comparator[0].length)
      continue
    }

    const decimal = takeLeadingDecimal(rest)
    if (decimal) {
      values.push(decimal)
      rest = rest.slice(decimal.length)
      continue
    }

    const percentageLike = takeLeadingPercentageLike(rest)
    if (percentageLike) {
      values.push(percentageLike)
      rest = rest.slice(percentageLike.length)
      continue
    }

    rest = rest.slice(1)
  }

  return values.filter((value) => /\d/.test(value))
}

function buildParsedTableHint(line: string): string | null {
  const compactStart = findCompactNumericStart(line)
  if (compactStart <= 0) return null

  const label = line.slice(0, compactStart).trim()
  const tail = line.slice(compactStart).trim()
  if (!/[A-Za-z]/.test(label) || tail.length < 6) return null
  if (label.length < 2 || /(?:\u00b1|[+\/-])$/.test(label) || /\u00b1/.test(label)) return null
  if ((label.match(/\d/g) || []).length > 2) return null
  if (/^[a-z]\s/i.test(label) || /^[a-z]$/i.test(label)) return null

  const values = tokenizeCompactNumericTail(tail)
  if (values.length < 3) return null

  return `[PARSED TABLE ROW: ${label} | values in source order: ${values.join(' | ')}]`
}

function addParsedTableRowHints(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []
  let inTable = false
  let skipParsedRowHints = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\[TABLE:/i.test(trimmed)) {
      inTable = true
      skipParsedRowHints = /(?:p\s*-?\s*values?|adjusted\s*p\s*values?|adjustedpvalues|significance|pairwise)/i.test(trimmed)
    }
    output.push(line)

    if (inTable && !skipParsedRowHints && !/^\[/.test(trimmed)) {
      const hint = buildParsedTableHint(trimmed)
      if (hint) output.push(hint)
    }

    if (/^\[END TABLE\]/i.test(trimmed)) {
      inTable = false
      skipParsedRowHints = false
    }
  }

  return output.join('\n')
}

export function normalizeExtractedPdfText(text: string): string {
  const withTables = wrapDetectedTables(text || '')
  const withJoinedRows = joinBrokenTableRows(withTables)
  const withParsedRows = addParsedTableRowHints(withJoinedRows)

  return withParsedRows
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, 45000)
}
