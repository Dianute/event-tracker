const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '../web-app/public/markers/food-pin.png');
const outputPath = path.join(__dirname, '../web-app/public/markers/food-pin-optimized.png');

(async () => {
    try {
        console.log("Input:", inputPath);
        const metadata = await sharp(inputPath).metadata();
        console.log(`Original size: ${metadata.width}x${metadata.height}, ${metadata.size} bytes (approx)`);

        await sharp(inputPath)
            .resize(80, 80) // 2x for 40px display
            .png({ quality: 80, compressionLevel: 9 })
            .toFile(outputPath);

        // Replace original
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);

        const newMeta = await sharp(inputPath).metadata();
        console.log(`New size: ${newMeta.width}x${newMeta.height}, ${newMeta.size} bytes`);
        console.log("✅ Optimized successfully!");

    } catch (err) {
        console.error("Error:", err);
    }
})();
