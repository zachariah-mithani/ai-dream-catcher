// Simple script to help convert SVG to PNG
// You'll need to install sharp: npm install sharp

const fs = require('fs');
const sharp = require('sharp');

async function convertLogos() {
  try {
    // Convert main logo to 1024x1024 PNG
    await sharp('./assets/logo.svg')
      .resize(1024, 1024)
      .png()
      .toFile('./assets/icon.png');
    
    // Convert splash screen to 1242x2688 PNG
    await sharp('./assets/splash.svg')
      .resize(1242, 2688)
      .png()
      .toFile('./assets/splash.png');
    
    // Convert adaptive icon to 1024x1024 PNG
    await sharp('./assets/adaptive-icon.svg')
      .resize(1024, 1024)
      .png()
      .toFile('./assets/adaptive-icon.png');
    
    console.log('✅ Logo conversion completed!');
    console.log('Generated files:');
    console.log('- icon.png (1024x1024)');
    console.log('- splash.png (1242x2688)');
    console.log('- adaptive-icon.png (1024x1024)');
    
  } catch (error) {
    console.error('❌ Error converting logos:', error.message);
    console.log('\nTo convert manually:');
    console.log('1. Open each SVG file in a browser');
    console.log('2. Right-click and "Save as PNG"');
    console.log('3. Resize to required dimensions');
  }
}

convertLogos();
