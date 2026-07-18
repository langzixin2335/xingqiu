import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const pages = [
  { name: 'welcome', file: 'welcome.html' },
  { name: 'wuxing-select', file: 'wuxing-select.html' },
  { name: 'plan-create', file: 'plan-create.html' },
  { name: 'main-home', file: 'main-home.html' },
]

const outStyles = path.join(root, 'frontend', 'src', 'assets', 'styles')
const outScripts = path.join(root, 'frontend', 'src', 'assets', 'scripts')
fs.mkdirSync(outStyles, { recursive: true })
fs.mkdirSync(outScripts, { recursive: true })

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page.file), 'utf8')
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/)
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/)

  if (styleMatch) {
    fs.writeFileSync(path.join(outStyles, `${page.name}.css`), styleMatch[1].trim())
  }
  if (scriptMatch) {
    fs.writeFileSync(path.join(outScripts, `${page.name}.js`), scriptMatch[1].trim())
  }
  if (bodyMatch) {
    let body = bodyMatch[1].trim()
    // starfield div -> component placeholder
    body = body.replace(
      /<div class="starfield" id="starfield"><\/div>/g,
      '<Starfield />'
    )
    fs.writeFileSync(path.join(outStyles, `${page.name}.template.html`), body)
  }
  console.log(`Extracted: ${page.name}`)
}
