import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory = path.resolve('public/assets/ui')
const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.png'))

for (const file of files) {
  const target = path.join(directory, file)
  const image = sharp(target).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const seen = new Uint8Array(info.width * info.height)
  const queue = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return
    const point = y * info.width + x
    if (seen[point]) return
    const offset = point * 4
    const closeToFrameGray = Math.abs(data[offset] - 242) <= 10 && Math.abs(data[offset + 1] - 242) <= 10 && Math.abs(data[offset + 2] - 242) <= 10
    if (!closeToFrameGray) return
    seen[point] = 1
    data[offset + 3] = 0
    queue.push([x, y])
  }
  for (let x = 0; x < info.width; x++) { push(x, 0); push(x, info.height - 1) }
  for (let y = 0; y < info.height; y++) { push(0, y); push(info.width - 1, y) }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, y] = queue[cursor]
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  await sharp(data, { raw: info }).png().toFile(`${target}.tmp.png`)
  await fs.rename(`${target}.tmp.png`, target)
}
console.log(`Made ${files.length} Figma icon frames transparent.`)
