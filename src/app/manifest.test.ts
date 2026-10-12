import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from './manifest'

describe('PWA manifest', () => {
  it('provides real 192 and 512 pixel PNG icons for installation', () => {
    const icons = manifest().icons
    expect(Array.isArray(icons)).toBe(true)

    for (const size of [192, 512]) {
      const icon = icons?.find((entry) => entry.sizes === `${size}x${size}` && entry.type === 'image/png')
      expect(icon).toBeDefined()
      const bytes = readFileSync(join(process.cwd(), 'public', icon!.src.replace(/^\//, '')))
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      expect(bytes.readUInt32BE(16)).toBe(size)
      expect(bytes.readUInt32BE(20)).toBe(size)
    }
  })
})
