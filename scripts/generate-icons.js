const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const toIco = require("to-ico");

async function main() {
  const assetsDir = path.join(__dirname, "..", "ui", "assets");
  const inputJpg = path.join(assetsDir, "logo.jpg");
  const outputIco = path.join(assetsDir, "logo.ico");
  const outputPng = path.join(assetsDir, "logo-icon-source.png");

  if (!fs.existsSync(inputJpg)) {
    console.error(`Missing input: ${inputJpg}`);
    process.exit(1);
  }

  console.log("Generating icon source PNG...");

  // Create a clean square source image used for all sizes.
  // - trim removes outer white margins
  // - cover ensures the icon fills the frame (important for 16/32px)
  const source = sharp(inputJpg)
    .trim({ threshold: 10 })
    .resize(1024, 1024, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3
    })
    .sharpen({ sigma: 0.8, m1: 1, m2: 2 })
    .png({ compressionLevel: 9, quality: 100 });

  const sourceBuf = await source.toBuffer();
  fs.writeFileSync(outputPng, sourceBuf);
  console.log(`✓ Wrote ${path.relative(process.cwd(), outputPng)}`);

  console.log("Generating multi-size ICO...");
  const sizes = [256, 128, 64, 48, 32, 24, 16];

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(sourceBuf)
        .resize(size, size, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
        .sharpen({ sigma: size <= 32 ? 0.9 : 0.6 })
        .png({ compressionLevel: 9, quality: 100 })
        .toBuffer()
    )
  );

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(outputIco, icoBuffer);
  console.log(`✓ Wrote ${path.relative(process.cwd(), outputIco)}`);
  console.log(`Sizes included: ${sizes.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


