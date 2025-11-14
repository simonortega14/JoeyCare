import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting para auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'joeycare_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let db;
try {
  db = mysql.createPool(dbConfig);
  console.log('✅ Auth Service connected to database');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.rol_id,
      sede: user.sede_id
    },
    process.env.JWT_SECRET || 'joeycare-auth-service-secret',
    { expiresIn: '24h' }
  );
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'auth-service'
  });
});

// Login endpoint
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user in database
    const [rows] = await db.execute(
      `SELECT m.id, m.email, m.hash_password, m.nombre, m.apellido, m.rol_id, m.sede_id,
              r.nombre as rol_nombre, s.nombre as sede_nombre
       FROM medicos m
       JOIN roles r ON m.rol_id = r.id
       JOIN sedes s ON m.sede_id = s.id
       WHERE m.email = ? AND m.activo = true`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hash_password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Log successful login
    await db.execute(
      'INSERT INTO auditoria (usuario_id, accion, objeto_tipo, ip) VALUES (?, ?, ?, ?)',
      [user.id, 'login', 'medico', req.ip || req.connection.remoteAddress]
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol_nombre,
        sede: user.sede_nombre
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Register endpoint (admin only - for future use)
app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol_id, especialidad_id, sede_id } = req.body;

    // Validate required fields
    if (!nombre || !apellido || !email || !password || !rol_id || !especialidad_id || !sede_id) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Check if user already exists
    const [existing] = await db.execute(
      'SELECT id FROM medicos WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await db.execute(
      `INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rol_id, especialidad_id, sede_id, nombre, apellido, email, hashPassword]
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Validate token endpoint (for other services)
app.post('/auth/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'joeycare-auth-service-secret');

    // Verify user still exists and is active
    const [rows] = await db.execute(
      'SELECT id, activo FROM medicos WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({
        error: 'User not found or inactive'
      });
    }

    res.json({
      valid: true,
      user: decoded
    });

  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token'
    });
  }
});

// Logout endpoint (client-side token removal, but log the action)
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'joeycare-auth-service-secret');
        // Log logout action
        await db.execute(
          'INSERT INTO auditoria (usuario_id, accion, objeto_tipo, ip) VALUES (?, ?, ?, ?)',
          [decoded.id, 'logout', 'medico', req.ip || req.connection.remoteAddress]
        );
      } catch (error) {
        // Token might be expired, but that's ok for logout
      }
    }

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Auth Service Error:', err);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});