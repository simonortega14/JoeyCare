const fs = require("fs/promises");
const dicomParser = require("dicom-parser");
const { PNG } = require("pngjs");

function normalizeTo8Bit(pixelData) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < pixelData.length; i++) {
    const v = pixelData[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const range = max - min || 1;
  const out = new Uint8Array(pixelData.length);

  for (let i = 0; i < pixelData.length; i++) {
    const norm = ((pixelData[i] - min) / range) * 255;
    out[i] = norm < 0 ? 0 : norm > 255 ? 255 : norm;
  }

  return out;
}

async function dicomToPNG(absPath) {
  const dicomBuffer = await fs.readFile(absPath);

  const dataSet = dicomParser.parseDicom(dicomBuffer);

  const rows = dataSet.uint16("x00280010"); // Rows
  const cols = dataSet.uint16("x00280011"); // Columns
  if (!rows || !cols) {
    throw new Error("DICOM sin dimensiones válidas");
  }

  const pixelElement = dataSet.elements.x7fe00010; // PixelData
  if (!pixelElement) {
    throw new Error("DICOM sin PixelData");
  }

  const pixelDataRaw = dicomBuffer.slice(
    pixelElement.dataOffset,
    pixelElement.dataOffset + pixelElement.length
  );

  const bitsAllocated = dataSet.uint16("x00280100"); // BitsAllocated
  let pixelArray;
  if (bitsAllocated === 8) {
    pixelArray = new Uint8Array(
      pixelDataRaw.buffer,
      pixelDataRaw.byteOffset,
      pixelDataRaw.byteLength
    );
  } else if (bitsAllocated === 16) {
    pixelArray = new Uint16Array(
      pixelDataRaw.buffer,
      pixelDataRaw.byteOffset,
      pixelDataRaw.byteLength / 2
    );
  } else {
    throw new Error(`BitsAllocated=${bitsAllocated} no soportado todavía`);
  }

  const pixel8 =
    bitsAllocated === 8 ? pixelArray : normalizeTo8Bit(pixelArray);

  const png = new PNG({
    width: cols,
    height: rows,
    colorType: 6, // RGBA
  });

  for (let i = 0; i < rows * cols; i++) {
    const g = pixel8[i];
    const idx = i * 4;
    png.data[idx + 0] = g;
    png.data[idx + 1] = g;
    png.data[idx + 2] = g;
    png.data[idx + 3] = 255;
  }

  const pngBuffer = PNG.sync.write(png);
  return pngBuffer;
}

module.exports = { dicomToPNG };
