/**
 * 浏览器端的 `node:crypto` 垫片。
 *
 * 逻辑层（src/）是为 Node 写的，直接 import 了 `node:crypto` 的 randomUUID 和 createHash。
 * 为了让同一份逻辑不加改动地跑在浏览器里，vite.config.ts 把 `node:crypto` 别名到这里。
 *
 * createHash 必须是**同步**的：taskInputHash() 是同步函数，而 applyProposal() 用它做
 * Proposal 陈旧校验。WebCrypto 的 subtle.digest 是异步的，用不了，所以这里内联一份 SHA-256。
 * 它必须和 Node 的 createHash("sha256") 逐位一致 —— inputHash 由服务端算、浏览器端校验。
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
])

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n))

function sha256Hex(bytes: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ])

  // 填充：0x80 → 补零至 56 mod 64 → 8 字节大端比特长度
  const padded = new Uint8Array((((bytes.length + 9 + 63) / 64) | 0) * 64)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  const bitLength = bytes.length * 8
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(padded.length - 4, bitLength >>> 0)

  const w = new Uint32Array(64)
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + s1 + ch + K[i] + w[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }

  let out = ''
  for (const word of h) out += word.toString(16).padStart(8, '0')
  return out
}

const encoder = new TextEncoder()

interface Hash {
  update(data: string | Uint8Array): Hash
  digest(encoding: 'hex'): string
}

export function createHash(algorithm: string): Hash {
  if (algorithm !== 'sha256') {
    throw new Error(`node-crypto shim: 只实现了 sha256，收到 ${algorithm}`)
  }
  const chunks: Uint8Array[] = []
  const hash: Hash = {
    update(data) {
      chunks.push(typeof data === 'string' ? encoder.encode(data) : data)
      return hash
    },
    digest(encoding) {
      if (encoding !== 'hex') throw new Error(`node-crypto shim: 只实现了 hex 输出`)
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const merged = new Uint8Array(total)
      let at = 0
      for (const chunk of chunks) {
        merged.set(chunk, at)
        at += chunk.length
      }
      return sha256Hex(merged)
    }
  }
  return hash
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID()
}

export default { createHash, randomUUID }
