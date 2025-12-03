import crypto from 'crypto';
import fs from 'fs';

// Clave de encriptación (debe ser de 32 bytes para AES-256)
// En producción, usar variable de entorno
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'clave_de_32_caracteres_para_aes256', 'utf8').slice(0, 32); // Asegurar 32 bytes
const ALGORITHM = 'aes-256-cbc';

// Función para encriptar datos
export function encrypt(text) {
  const iv = crypto.randomBytes(16); // Vector de inicialización
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Incluir IV para desencriptar
}

// Función para desencriptar datos
export function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText; // Si es null, undefined o no string, devolver tal cual
  }
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Formato inválido');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Si falla, asumir que no está encriptado y devolver original
    console.warn('Error al desencriptar, devolviendo valor original:', error.message);
    return encryptedText;
  }
}

// Para archivos grandes, encriptar en chunks
export function encryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    // Escribir IV al inicio del archivo encriptado
    output.write(iv, (err) => {
      if (err) reject(err);
      input.pipe(cipher).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
  });
}

export function decryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const encryptedBuffer = fs.readFileSync(inputPath);
      const iv = encryptedBuffer.slice(0, 16);
      const encryptedData = encryptedBuffer.slice(16);
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      fs.writeFileSync(outputPath, decrypted);
      resolve();
    } catch (error) {
      // Si falla la desencriptación, copiar el archivo original (asumir que no está encriptado)
      console.warn('Error al desencriptar archivo, copiando original:', error.message);
      fs.copyFileSync(inputPath, outputPath);
      resolve();
    }
  });
}