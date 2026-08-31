import { describe, it, expect } from 'vitest'
import {
  generateChallenge,
  verifyAnswer,
  challengeString,
  challengeToSpeech,
  hashString,
} from '../src/utils/captcha'

describe('captcha challenge', () => {
  it('verifies the exact typed code and rejects wrong ones', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge()
      expect(verifyAnswer(c, c.code)).toBe(true)
      expect(verifyAnswer(c, c.code.toLowerCase())).toBe(true)
      expect(verifyAnswer(c, '')).toBe(false)
      expect(verifyAnswer(c, 'ZZZZZ')).toBe(false)
    }
  })

  it('produces codes of fixed length from a safe alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateChallenge().code
      expect(code).toHaveLength(5)
      expect(code).toMatch(/^[A-Z0-9]+$/)
      expect(code).not.toMatch(/[01ILO]/) // بدون حروف/ارقام گیج‌کننده
    }
  })

  it('accepts Persian/Arabic digits when the code contains numbers', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge()
      const persian = c.code.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])
      const arabic = c.code.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
      expect(verifyAnswer(c, persian)).toBe(true)
      expect(verifyAnswer(c, arabic)).toBe(true)
    }
  })

  it('ignores stray whitespace', () => {
    const c = generateChallenge()
    expect(verifyAnswer(c, `  ${c.code}  `)).toBe(true)
  })

  it('stores only a salted hash of the answer', () => {
    const c = generateChallenge()
    expect(c.answerHash).toBe(hashString(`${c.code}|${c.salt}`))
    expect(c).not.toHaveProperty('answer')
  })

  it('builds readable display and speech strings', () => {
    const c = generateChallenge()
    expect(challengeString(c)).toBe(c.code)
    expect(challengeToSpeech(c)).toBe(c.code.split('').join('. '))
  })

  it('regenerates fresh codes each call', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(generateChallenge().code)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})