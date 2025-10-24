import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findMedicoByEmail } from '../repositories/medico.repository.js';

export async function login({ email, password }) {
  const medico = await findMedicoByEmail(email);
  if (!medico) return null;

  // OJO: tu seed trae '123456' en texto plano. Para dev:
  // - si el hash_password viniera hasheado: comparamos con bcrypt
  // - si no, comparamos plano (solo para entorno DEV)
  const isBcrypt = medico.hash_password && medico.hash_password.startsWith('$2');
  let ok = false;

  if (isBcrypt) {
    ok = await bcrypt.compare(password, medico.hash_password);
  } else {
    ok = password === medico.hash_password; // DEV fallback
  }

  if (!ok) return null;

  const payload = {
    id: medico.id,
    email: medico.email,
    nombre: medico.nombre,
    apellido: medico.apellido,
    rol_id: medico.rol_id
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });

  return { token, user: payload };
}
