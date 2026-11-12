/**
 * LifeLens On-Device SMS Transaction Parser (Phase 5: Financial Ingestion)
 *
 * Privacy Guarantee:
 * - 100% On-Device Local Processing.
 * - Raw SMS texts never leave the phone.
 * - OTPs, balance queries, personal texts, and spam are strictly ignored.
 * - Strips account numbers, phone numbers, and PII.
 * - Generates deterministic deduplication hashes to prevent double-counting.
 */

import type { SmsTransactionItem } from '@/src/types/api.types';

// Curated Merchant Classification & Discretionary Rules
export const MERCHANT_CATEGORY_MAP: Array<{
  keywords: string[];
  category: string;
  isDiscretionary: boolean;
}> = [
  {
    keywords: [
      'swiggy', 'zomato', 'restaurant', 'mcdonald', 'starbucks', 'cafe', 'food',
      'domino', 'blinkit', 'zepto', 'subway', 'kfc', 'burger king', 'dining',
      'eats', 'dunkin', 'pizza', 'haldiram', 'barbeque', 'chai', 'coffee',
    ],
    category: 'Food & Dining',
    isDiscretionary: true,
  },
  {
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'shell', 'transport',
      'cab', 'indian oil', 'bharat petroleum', 'hpcl', 'train', 'irctc', 'toll',
      'fastag', 'parking', 'auto', 'ride',
    ],
    category: 'Transportation',
    isDiscretionary: false,
  },
  {
    keywords: [
      'amazon', 'flipkart', 'myntra', 'zara', 'apple', 'retail', 'store',
      'shopping', 'uniqlo', 'h&m', 'nykaa', 'ajio', 'reliancedigital', 'croma',
      'meesho', 'tatacliq', 'decathlon', 'nike', 'adidas',
    ],
    category: 'Shopping',
    isDiscretionary: true,
  },
  {
    keywords: [
      'netflix', 'spotify', 'bookmyshow', 'prime', 'movie', 'youtube',
      'entertainment', 'steam', 'playstation', 'cinema', 'pvr', 'inox',
      'hotstar', 'disney', 'audible', 'game', 'gaming',
    ],
    category: 'Entertainment',
    isDiscretionary: true,
  },
  {
    keywords: [
      'electricity', 'water', 'broadband', 'airtel', 'jio', 'bescom', 'utility',
      'bill', 'recharge', 'gas', 'tneb', 'cesc', 'act fibernet', 'vi ', 'tatasky',
    ],
    category: 'Utilities',
    isDiscretionary: false,
  },
  {
    keywords: [
      'groceries', 'supermarket', 'dmart', 'bigbasket', 'instamart', "nature's basket",
      'reliance fresh', 'more retail', 'spencer', 'vegetable', 'fruits', 'dairy',
    ],
    category: 'Groceries',
    isDiscretionary: false,
  },
  {
    keywords: [
      'pharmacy', 'hospital', 'apollo', 'medplus', '1mg', 'clinic', 'health',
      'doctor', 'diagnostics', 'practo', 'care', 'medical', 'netmeds', 'pharmeasy',
    ],
    category: 'Healthcare',
    isDiscretionary: false,
  },
];

/**
 * Checks whether an incoming SMS is a non-transactional alert:
 * - One-time passwords (OTP)
 * - Balance inquiry notifications
 * - Marketing / loan spam
 */
export function isNonTransactionalMessage(message: string): boolean {
    const text = message.toLowerCase();

    // 1. OTP detection
    if (
      text.includes('otp') ||
      text.includes('one time password') ||
      text.includes('verification code') ||
      text.includes('security code') ||
      text.includes('do not share') ||
      text.includes('valid for')
    ) {
      return true;
    }

    // 2. Pure balance enquiry (without a debit)
    const hasBalance = /\b(?:bal(?:ance)?|avail(?:able)?\s+lmt)\b/i.test(text);
    const hasDebit =
      text.includes('debited') ||
      text.includes('spent') ||
      text.includes('paid') ||
      text.includes('charged') ||
      text.includes('withdrawn');

    if (hasBalance && !hasDebit) {
      return true;
    }

    // 3. Marketing & loan offers
    if (
      text.includes('pre-approved') ||
      text.includes('instant loan') ||
      text.includes('congratulations') ||
      text.includes('apply now') ||
      text.includes('click here') ||
      text.includes('cashback credited') ||
      text.includes('congrats') ||
      text.includes('exclusive offer')
    ) {
      return true;
    }

    return false;
}

/**
 * Extracts numeric transaction amount and currency symbol/code.
 */
export function extractAmount(message: string): { amount: number; currency: string } | null {
  // Common currency amount patterns:
  // Rs. 450.00, Rs 1200, INR 3,500.50, ₹899, USD 45.00, SGD 18.50
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:usd|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:sgd|s\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:eur|€)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited|spent|paid|charged|withdrawn)(?:\s+by|\s+for)?\s*(?:rs\.?|inr|₹|\$|usd)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = message.match(regex);
    if (match && match[1]) {
      const cleanNumber = match[1].replace(/,/g, '').trim();
      const num = parseFloat(cleanNumber);
      if (!isNaN(num) && num > 0) {
        let currency = 'INR';
        const lower = message.toLowerCase();
        if (lower.includes('usd') || lower.includes('$')) currency = 'USD';
        else if (lower.includes('sgd') || lower.includes('s$')) currency = 'SGD';
        else if (lower.includes('eur') || lower.includes('€')) currency = 'EUR';

        return { amount: Math.round(num * 100) / 100, currency };
      }
    }
  }

  return null;
}

/**
 * Cleans raw merchant or payee text from SMS.
 */
export function extractMerchant(message: string): string {
  // Common patterns:
  // "to <merchant> via UPI"
  // "at <merchant> on"
  // "spent on ... at <merchant>"
  // "info: <merchant>"
  // "vpa <merchant>"
  const merchantRegexes = [
    /(?:at|to|info:?|vpa:?)\s+([a-zA-Z0-9\s&'-]{2,40}?)(?:\s+(?:on|using|via|ref|bal|dated)|[.,]|\s*$)/i,
    /(?:towards|spent\s+at)\s+([a-zA-Z0-9\s&'-]{2,40}?)(?:\s+(?:on|using|via|ref)|[.,]|\s*$)/i,
    /(?:upi:?\/)([a-zA-Z0-9_.-]{3,30})/i,
  ];

  for (const regex of merchantRegexes) {
    const match = message.match(regex);
    if (match && match[1]) {
      let raw = match[1].trim();
      // Remove VPA handles like @okhdfcbank or @icici
      raw = raw.replace(/@[a-zA-Z0-9.-]+/g, '').replace(/upi:?/gi, '').trim();
      // Strip POS prefixes
      raw = raw.replace(/^pos\s+\d+\s*/i, '').trim();
      if (raw.length >= 2 && !raw.toLowerCase().includes('account') && !raw.toLowerCase().includes('card')) {
        return toTitleCase(raw);
      }
    }
  }

  // Fallback to recognized known brand
  const lower = message.toLowerCase();
  for (const mapping of MERCHANT_CATEGORY_MAP) {
    for (const kw of mapping.keywords) {
      if (lower.includes(kw)) {
        return toTitleCase(kw);
      }
    }
  }

  return 'Bank Payee';
}

/**
 * Categorizes a merchant and assigns discretionary status.
 */
export function categorizeMerchant(merchantName: string, rawMessage = ''): {
  category: string;
  isDiscretionary: boolean;
} {
  const combined = `${merchantName} ${rawMessage}`.toLowerCase();

  for (const mapping of MERCHANT_CATEGORY_MAP) {
    if (mapping.keywords.some((kw) => combined.includes(kw))) {
      return {
        category: mapping.category,
        isDiscretionary: mapping.isDiscretionary,
      };
    }
  }

  return {
    category: 'Other',
    isDiscretionary: true,
  };
}

/**
 * Extracts bank / UPI transaction reference number if present.
 */
export function extractReferenceNumber(message: string): string | null {
  const refMatch = message.match(/\b(?:ref(?:\s*no\.?|\s*id)?|reference|rrn|txn\s*(?:id|no\.?)|upi\s*ref)(?:\s*[:#]\s*|\s+)([a-zA-Z0-9]{6,20})\b/i);
  return refMatch ? refMatch[1] : null;
}

/**
 * Pure JavaScript synchronous SHA-256 implementation (FIPS 180-4).
 * Runs universally in Node, React Native (iOS/Android), and Web without external packages.
 */
function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * candidate; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sA = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sE = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = (hash[7] + sE + ch + k[i] + w[i]) | 0;
      const temp2 = (sA + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += byte.toString(16).padStart(2, '0');
    }
  }
  return result;
}

/**
 * Deterministic 32-character SHA-256 hash for deduplication.
 * Reference numbers are deliberately excluded: SMS alerts include them but bank
 * statement rows do not, so including them prevents cross-channel deduplication.
 */
export function generateDeterministicHash(
  amount: number,
  merchant: string,
  timestampStr: string
): string {
  const cleanMerchant = merchant.toLowerCase().replace(/[^a-z0-9]/g, '');
  const datePart = timestampStr.length >= 10 ? timestampStr.slice(0, 10) : timestampStr;
  const roundedAmount = Math.round(amount * 100) / 100;
  const amtStr = Number.isInteger(roundedAmount) ? `${roundedAmount}.0` : `${roundedAmount}`;
  const input = `${amtStr}_${cleanMerchant}_${datePart}`;
  return sha256Hex(input).slice(0, 32);
}

/**
 * Core Parser: Parses a single raw SMS string into a structured SmsTransactionItem.
 * Returns null if the SMS is non-transactional (OTP, balance inquiry, promo) or not a debit.
 */
export function parseSmsMessage(
  rawMessage: string,
  smsReceivedDate?: Date
): SmsTransactionItem | null {
  if (!rawMessage || typeof rawMessage !== 'string') return null;

  // Filter non-transactional SMS
  if (isNonTransactionalMessage(rawMessage)) {
    return null;
  }

  // Must be a debit / spend / purchase
  const lower = rawMessage.toLowerCase();
  const isDebit =
    lower.includes('debited') ||
    lower.includes('spent') ||
    lower.includes('paid') ||
    lower.includes('charged') ||
    lower.includes('withdrawn') ||
    lower.includes('purchase');

  if (!isDebit) {
    return null;
  }

  // Extract amount
  const amtData = extractAmount(rawMessage);
  if (!amtData) return null;

  // Extract merchant and category
  const merchant = extractMerchant(rawMessage);
  const { category, isDiscretionary } = categorizeMerchant(merchant, rawMessage);
  const refNumber = extractReferenceNumber(rawMessage);

  const timestamp = (smsReceivedDate || new Date()).toISOString();
  const externalId = generateDeterministicHash(
    amtData.amount,
    merchant,
    timestamp.slice(0, 10) // group by date + amount + merchant
  );

  return {
    amount: amtData.amount,
    merchant,
    category,
    timestamp,
    is_discretionary: isDiscretionary,
    external_id: externalId,
    currency: amtData.currency,
    notes: `Parsed on-device from SMS (Ref: ${refNumber || 'N/A'})`,
  };
}

/**
 * Batch Parser: Processes a list of SMS messages and returns valid unique transactions.
 */
export function parseSmsBatch(
  messages: Array<{ body: string; date?: Date | number | string }>
): SmsTransactionItem[] {
  const results: SmsTransactionItem[] = [];
  const seenIds = new Set<string>();

  for (const item of messages) {
    const dt = item.date ? new Date(item.date) : new Date();
    const parsed = parseSmsMessage(item.body, dt);
    if (parsed && !seenIds.has(parsed.external_id)) {
      seenIds.add(parsed.external_id);
      results.push(parsed);
    }
  }

  return results;
}

function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
