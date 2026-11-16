/**
 * LifeLens Bank Statement Parser (Phase 5: Financial Statement Ingestion)
 *
 * Supports CSV bank statements from Indian banks (HDFC, SBI, ICICI, Axis)
 * and international banks (Chase, Citi, HSBC, generic CSV).
 */

import type { SmsTransactionItem, StatementIngestPayload, SyncResultResponse } from '@/src/types/api.types';
import { categorizeMerchant, generateDeterministicHash } from '@/src/services/smsParserService';
import { ingestionApi } from '@/src/services/api';

/**
 * Parses a CSV string into structured transaction objects.
 */
export function parseCsvStatementText(csvText: string, defaultCurrency = 'INR'): SmsTransactionItem[] {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Find header index
  let headerIdx = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cells = lines[i].split(',').map((c) => c.replace(/["']/g, '').trim().toLowerCase());
    if (cells.some((c) => c.includes('date')) && cells.some((c) => c.includes('desc') || c.includes('narration') || c.includes('particulars') || c.includes('merchant'))) {
      headerIdx = i;
      headers = cells;
      break;
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0;
    headers = lines[0].split(',').map((c) => c.replace(/["']/g, '').trim().toLowerCase());
  }

  const dateCol = headers.findIndex((h) => h.includes('date'));
  const descCol = headers.findIndex((h) => h.includes('desc') || h.includes('narration') || h.includes('particulars') || h.includes('merchant') || h.includes('details'));
  const debitCol = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h.includes('spent') || h.includes('dr'));
  const amountCol = headers.findIndex((h) => h.includes('amount'));
  const typeCol = headers.findIndex((h) => h.includes('type') || h.includes('cr/dr'));

  const results: SmsTransactionItem[] = [];
  const seenHashes = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    // Quick CSV split handling quotes
    const row = splitCsvLine(lines[i]);
    if (row.length <= Math.max(dateCol, descCol)) continue;

    const rawDate = row[dateCol]?.trim() || '';
    const rawDesc = row[descCol]?.trim() || '';
    if (!rawDate || !rawDesc) continue;

    let rawAmountStr = '';
    let isDebit = true;

    if (debitCol !== -1 && row[debitCol]?.trim()) {
      rawAmountStr = row[debitCol].trim();
    } else if (amountCol !== -1 && row[amountCol]?.trim()) {
      rawAmountStr = row[amountCol].trim();
      if (typeCol !== -1 && row[typeCol]) {
        const tVal = row[typeCol].toLowerCase();
        isDebit = tVal.includes('dr') || tVal.includes('debit');
      }
    }

    const cleanAmt = rawAmountStr.replace(/[$,₹Rs\s]/g, '').replace(/,/g, '');
    let num = parseFloat(cleanAmt);
    if (isNaN(num)) continue;
    if (num < 0) {
      num = Math.abs(num);
      isDebit = true;
    }
    if (num <= 0 || !isDebit) continue;

    const parsedDate = parseDateString(rawDate);
    if (!parsedDate) continue;
    const { category, isDiscretionary } = categorizeMerchant(rawDesc);
    const hash = generateDeterministicHash(num, rawDesc, parsedDate.slice(0, 10));

    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      results.push({
        amount: Math.round(num * 100) / 100,
        merchant: cleanMerchantDescription(rawDesc),
        category,
        timestamp: parsedDate,
        is_discretionary: isDiscretionary,
        external_id: hash,
        currency: defaultCurrency,
        notes: `Imported via Statement CSV (${rawDesc})`,
      });
    }
  }

  return results;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDateString(dateStr: string): string | null {
  // Support DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, DD-Mon-YYYY
  const trimmed = dateStr.trim();

  // 1. Explicit ISO format: YYYY-MM-DD...
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // 2. Explicit DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Indian & British Bank Statement standard)
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // 3. Fallback for textual month dates (e.g. 05-Nov-2026, Nov 5 2026)
  const dFallback = new Date(trimmed);
  if (!isNaN(dFallback.getTime())) {
    return dFallback.toISOString();
  }

  return null;
}

function cleanMerchantDescription(desc: string): string {
  return desc
    .replace(/^(?:UPI|POS|NEFT|IMPS|ACH|RTGS)[-/]/i, '')
    .replace(/@[a-zA-Z0-9.-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/**
 * Parses statement CSV and uploads to the LifeLens backend.
 */
export async function uploadAndIngestStatement(
  csvContent: string,
  institution = 'GENERIC'
): Promise<SyncResultResponse> {
  const transactions = parseCsvStatementText(csvContent);
  const payload: StatementIngestPayload = {
    institution,
    raw_transactions: transactions,
    auto_merge_daily_entry: true,
  };
  return await ingestionApi.ingestStatement(payload);
}
