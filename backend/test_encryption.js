import { encrypt, decrypt } from './src/utils/encryption.js';

const testText = 'Datos sensibles del paciente';
console.log('Texto original:', testText);

const encrypted = encrypt(testText);
console.log('Encriptado:', encrypted);

const decrypted = decrypt(encrypted);
console.log('Desencriptado:', decrypted);

console.log('Prueba exitosa:', testText === decrypted);