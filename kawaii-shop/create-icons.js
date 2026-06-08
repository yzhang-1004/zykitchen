const fs = require('fs');

// 创建一个最简单的 1x1 像素 PNG 文件(透明)
function createMinimalPNG(filename) {
  // PNG 文件头 + IHDR + IDAT + IEND (最小的有效PNG)
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  ]);
  
  // IHDR chunk (1x1 pixel, RGB)
  const ihdrData = Buffer.from([
    0x00, 0x00, 0x00, 0x0D, // length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02,             // bit depth: 8, color type: 2 (RGB)
    0x00, 0x00, 0x00,       // compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE  // CRC
  ]);
  
  // IDAT chunk (minimal compressed data)
  const idatData = Buffer.from([
    0x00, 0x00, 0x00, 0x0C, // length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0xD7, 0x63, 0xF8, // compressed data
    0x0F, 0x00, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x18,
    0xDD, 0x8D, 0xB4         // CRC
  ]);
  
  // IEND chunk
  const iendData = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  const png = Buffer.concat([pngHeader, ihdrData, idatData, iendData]);
  fs.writeFileSync(filename, png);
  console.log(`Created: ${filename}`);
}

// 创建所有 TabBar 图标
const icons = [
  'images/tab-order.png',
  'images/tab-order-active.png',
  'images/tab-manage.png',
  'images/tab-manage-active.png',
  'images/tab-profile.png',
  'images/tab-profile-active.png'
];

icons.forEach(icon => createMinimalPNG(icon));
console.log('\n✅ All placeholder icons created!');
console.log('⚠️  These are 1x1 pixel placeholders.');
console.log('📝 Please replace them with proper 81x81px icons later.');
