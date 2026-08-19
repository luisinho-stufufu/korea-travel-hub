import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const root = path.resolve(process.cwd(), 'public')
const svgPath = path.join(root, 'favicon.svg')

if (!fs.existsSync(svgPath)) {
  console.error('favicon.svg not found in public/. Put your SVG there first.')
  process.exit(1)
}

const out192 = path.join(root, 'icon-192.png')
const out512 = path.join(root, 'icon-512.png')
const outApple = path.join(root, 'apple-touch-icon.png')

async function run() {
  try {
    await sharp(svgPath).resize(192, 192).png({quality: 90}).toFile(out192)
    console.log('Generated', out192)
    await sharp(svgPath).resize(512, 512).png({quality: 90}).toFile(out512)
    console.log('Generated', out512)
    // apple-touch-icon (recommended 180x180 for iOS)
    await sharp(svgPath).resize(180, 180).png({quality: 90}).toFile(outApple)
    console.log('Generated', outApple)
  } catch (err) {
    console.error('Error generating icons:', err)
    process.exit(1)
  }
}

run()


