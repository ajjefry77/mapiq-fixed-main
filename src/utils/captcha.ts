export interface CaptchaChallenge {
  /** عبارت/کدی که کاربر باید تایپ کند (حروف بزرگ + ارقام). */
  code: string
  salt: string
  answerHash: string
}

// بدون حروف/ارقام گیج‌کننده: 0/O، 1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 5

const SALT_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const SALT_LENGTH = 10

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomSalt(): string {
  let out = ''
  for (let i = 0; i < SALT_LENGTH; i++) {
    out += SALT_CHARS[randomInt(0, SALT_CHARS.length - 1)]
  }
  return out
}

// Deterministic cyrb53-style string hash (fast, avoids storing the answer in
// plain text inside component state so DOM inspection won't reveal it).
export function hashString(input: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

export function generateChallenge(): CaptchaChallenge {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(0, ALPHABET.length - 1)]
  }
  const salt = randomSalt()
  return {
    code,
    salt,
    answerHash: hashString(`${code}|${salt}`),
  }
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

function normalizeInput(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function verifyAnswer(challenge: CaptchaChallenge, answerRaw: string): boolean {
  const answer = normalizeInput(answerRaw)
  if (!answer) return false
  return hashString(`${answer}|${challenge.salt}`) === challenge.answerHash
}

/** عبارتی که باید روی بوم رسم شود. */
export function challengeString(challenge: CaptchaChallenge): string {
  return challenge.code
}

/** تلفظ حرف‌به‌حرف برای دکمه‌ی شنیدن کد. */
export function challengeToSpeech(challenge: CaptchaChallenge): string {
  return challenge.code.split('').join('. ')
}