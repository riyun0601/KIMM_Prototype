import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const libraryRoot = 'C:/Users/riyun/OneDrive/Desktop/KIMM/KIMM-SYS24/componentLibraries/defaultLibrary'
const outputRoot = path.resolve('public/assets/component-library')
const catalogFile = path.resolve('src/data/componentCatalog.js')

const xmlFiles = []
async function collect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) await collect(full)
    else if (entry.isFile() && entry.name.endsWith('.xml')) xmlFiles.push(full)
  }
}

const attribute = (tag, name) => tag.match(new RegExp(`${name}\\s*=\\s*[\"']([^\"']*)[\"']`, 'i'))?.[1] || ''
const safeName = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, '_')

await collect(libraryRoot)
await fs.mkdir(outputRoot, { recursive: true })
const catalog = []
const failures = []

for (const file of xmlFiles) {
  const xml = await fs.readFile(file, 'utf8')
  const objectTag = xml.match(/<modelobject\b[^>]*>/i)?.[0]
  if (!objectTag) continue
  const id = attribute(objectTag, 'typename') || attribute(objectTag, 'name')
  if (!id) continue
  const name = attribute(objectTag, 'displayname') || attribute(objectTag, 'name') || id
  const iconTags = [...xml.matchAll(/<icon\b[^>]*>/gi)].map((match) => match[0])
  const iconTag = iconTags.find((tag) => /type\s*=\s*[\"']user[\"']/i.test(tag)) || iconTags[0]
  const iconPath = iconTag ? attribute(iconTag, 'path') : ''
  const ports = [...xml.matchAll(/<port\b[^>]*>/gi)].map((match) => attribute(match[0], 'name')).filter(Boolean)
  const relative = path.relative(libraryRoot, file).split(path.sep)
  const folders = relative.slice(0, -1)
  const outputName = `${safeName(folders.join('_'))}__${safeName(id)}.png`
  const outputFile = path.join(outputRoot, outputName)
  let image = ''

  if (iconPath) {
    const source = path.resolve(path.dirname(file), iconPath)
    try {
      await sharp(source, { density: 200 })
        .resize({ width: 240, height: 160, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputFile)
      image = `/assets/component-library/${outputName}`
    } catch (error) {
      failures.push({ id, source, error: error.message })
    }
  }
  catalog.push({ id, name, image, group: folders[0] || 'Other', path: folders.slice(1), ports })
}

catalog.sort((a, b) => a.group.localeCompare(b.group) || a.path.join('/').localeCompare(b.path.join('/')) || a.name.localeCompare(b.name))
await fs.mkdir(path.dirname(catalogFile), { recursive: true })
await fs.writeFile(catalogFile, `// Generated from KIMM-SYS24 defaultLibrary. Run npm run build:catalog to refresh.\nexport default ${JSON.stringify(catalog, null, 2)}\n`)
await fs.writeFile(path.resolve('component-catalog-report.json'), JSON.stringify({ total: catalog.length, withImages: catalog.filter((item) => item.image).length, failures }, null, 2))
console.log(`Catalog: ${catalog.length} definitions, ${catalog.filter((item) => item.image).length} transparent PNGs, ${failures.length} icon conversion failures.`)
