import fs from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'

const rootDir = process.cwd()
const publicDir = path.join(rootDir, 'public')
const configPath = path.join(publicDir, 'fair-config.json')
const qrSvgPath = path.join(publicDir, 'fair-qr.svg')

function normalizePublicUrl(rawUrl) {
  const trimmed = rawUrl?.trim()
  if (!trimmed) {
    throw new Error('PUBLIC_GAME_URL saknas. Exempel: https://cargoquest.lbcfrakt.se/')
  }

  const parsed = new URL(trimmed)
  if (parsed.protocol !== 'https:') {
    throw new Error('PUBLIC_GAME_URL måste använda https för mässbruk.')
  }

  parsed.hash = ''
  parsed.search = ''
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/'
  return parsed.toString()
}

const publicGameUrl = normalizePublicUrl(process.env.PUBLIC_GAME_URL)
const qrSvg = await QRCode.toString(publicGameUrl, {
  type: 'svg',
  width: 420,
  margin: 1,
  color: {
    dark: '#101010',
    light: '#ffffff',
  },
})

const config = {
  publicGameUrl,
  qrPageUrl: new URL('qr.html', publicGameUrl).toString(),
  generatedAt: new Date().toISOString(),
}

await fs.mkdir(publicDir, { recursive: true })
await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
await fs.writeFile(qrSvgPath, qrSvg, 'utf8')

console.log(`Fair assets generated for ${publicGameUrl}`)