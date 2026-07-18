import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const pages = [
  { name: 'welcome', file: 'welcome.html', component: 'WelcomeView' },
  { name: 'wuxing-select', file: 'wuxing-select.html', component: 'WuxingSelectView' },
  { name: 'plan-create', file: 'plan-create.html', component: 'PlanCreateView' },
  { name: 'main-home', file: 'main-home.html', component: 'MainHomeView' },
]

const outStyles = path.join(root, 'frontend', 'src', 'assets', 'styles')
const outScripts = path.join(root, 'frontend', 'src', 'assets', 'scripts')
const outViews = path.join(root, 'frontend', 'src', 'views')

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

  let body = bodyMatch[1].trim()
  body = body.replace(/<script>[\s\S]*?<\/script>/g, '')
  body = body.replace(/src="images\//g, 'src="/images/')
  body = body.replace(/<div class="starfield" id="starfield"><\/div>\s*/g, '')

  const starCount = page.name === 'welcome' ? 100 : 80
  const shootingStars = page.name === 'welcome' ? 3 : 0
  const variableStars = page.name === 'wuxing-select'

  const vueContent = `<template>
  <div class="legacy-page legacy-page--${page.name}">
    <Starfield :star-count="${starCount}" :shooting-stars="${shootingStars}"${variableStars ? ' :variable-stars="true"' : ''} />
${body.split('\n').map((line) => '    ' + line).join('\n')}
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../components/Starfield.vue'
import { init${page.component} } from '../assets/scripts/${page.name}-page.js'
import '../assets/styles/${page.name}.css'

const router = useRouter()
let cleanup = null

onMounted(() => {
  cleanup = init${page.component}(${page.name === 'main-home' ? 'router' : 'router'})
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>
`

  fs.writeFileSync(path.join(outViews, `${page.component}.vue`), vueContent)
  console.log(`Generated: ${page.component}.vue`)
}
