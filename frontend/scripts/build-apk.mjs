import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const useRemote = process.argv.includes('--remote')
const run = (cmd, cwd = root) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env })
}

function findLocalGradleBat() {
  const distRoot = join(homedir(), '.gradle', 'wrapper', 'dists', 'gradle-8.14.3-all')
  if (!existsSync(distRoot)) return null
  for (const dir of readdirSync(distRoot)) {
    const bat = join(distRoot, dir, 'gradle-8.14.3', 'bin', 'gradle.bat')
    if (existsSync(bat)) return bat
  }
  return null
}

const configPath = join(root, 'capacitor.config.json')
const remoteConfigPath = join(root, 'capacitor.config.remote.json')
const configBackup = readFileSync(configPath, 'utf8')
if (useRemote && existsSync(remoteConfigPath)) {
  writeFileSync(configPath, readFileSync(remoteConfigPath, 'utf8'))
  console.log('using remote H5 capacitor config')
}

try {
  run('npm run build')

  // 不要把下载用的 APK 打进 App 资源包（会自嵌套膨胀并可能安装/启动异常）
  const downloadsInDist = join(root, 'dist', 'downloads')
  if (existsSync(downloadsInDist)) {
    rmSync(downloadsInDist, { recursive: true, force: true })
    console.log('removed dist/downloads before cap sync')
  }

  run('npx cap sync')

  const androidDir = join(root, 'android')
  try {
    run('gradlew.bat assembleDebug', androidDir)
  } catch {
    const localGradle = findLocalGradleBat()
    if (!localGradle) throw new Error('gradlew failed and no local Gradle 8.14.3 found')
    console.log(`fallback local gradle: ${localGradle}`)
    run(`"${localGradle}" assembleDebug --no-daemon`, androidDir)
  }

  const outApk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  const publicDir = join(root, 'public', 'downloads')
  const publicApk = join(publicDir, 'shining-planet.apk')
  mkdirSync(publicDir, { recursive: true })
  copyFileSync(outApk, publicApk)
  console.log(`\nAPK ready: ${publicApk}`)
} finally {
  writeFileSync(configPath, configBackup)
}
