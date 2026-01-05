const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

const iconsDir = path.join(__dirname, '../src-tauri/icons');

// Crear directorio si no existe
if (!fsSync.existsSync(iconsDir)) {
  fsSync.mkdirSync(iconsDir, { recursive: true });
}

// Función para crear un ícono simple con texto
async function createIcon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">GF</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`✓ Created ${path.basename(outputPath)}`);
}

async function generateIcons() {
  console.log('Generando íconos...\n');
  
  try {
    // Generar PNGs
    await createIcon(32, path.join(iconsDir, '32x32.png'));
    await createIcon(128, path.join(iconsDir, '128x128.png'));
    await createIcon(256, path.join(iconsDir, '128x128@2x.png'));
    
    // Para Windows, crear ICO real con múltiples tamaños
    const icoPath = path.join(iconsDir, 'icon.ico');
    const ico16 = await sharp(path.join(iconsDir, '32x32.png')).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(path.join(iconsDir, '32x32.png')).resize(32, 32).png().toBuffer();
    const ico48 = await sharp(path.join(iconsDir, '128x128.png')).resize(48, 48).png().toBuffer();
    const ico256 = await sharp(path.join(iconsDir, '128x128@2x.png')).resize(256, 256).png().toBuffer();
    
    const ico = await toIco([ico16, ico32, ico48, ico256]);
    await fs.writeFile(icoPath, ico);
    console.log(`✓ Created icon.ico`);
    
    // Para macOS, usar el PNG más grande como ICNS (Tauri lo manejará)
    const icnsPath = path.join(iconsDir, 'icon.icns');
    await sharp(path.join(iconsDir, '128x128@2x.png'))
      .resize(512, 512)
      .png()
      .toFile(icnsPath);
    console.log(`✓ Created icon.icns`);
    
    console.log('\n✓ Todos los íconos fueron generados exitosamente!');
  } catch (error) {
    console.error('Error generando íconos:', error);
    process.exit(1);
  }
}

generateIcons();
