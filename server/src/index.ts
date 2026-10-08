import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'vizai_vms_jwt_secret_key_2026_super_secure';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'vizai_admin',
  password: String(process.env.DB_PASSWORD || 'vizai_password'),
  database: process.env.DB_NAME || 'vizai_camera_db',
});

// Authentication Types
export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATOR';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Database schema auto-initialization & migration
async function initDatabase() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 1. Nodes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) NOT NULL UNIQUE,
        host VARCHAR(255) NOT NULL,
        rtsp_port INT NOT NULL,
        webrtc_port INT NOT NULL,
        hls_port INT NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Cameras table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        stream_key VARCHAR(100) NOT NULL UNIQUE,
        rtsp_source_url VARCHAR(255) NOT NULL,
        node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
        resolution VARCHAR(20) DEFAULT '1280x720',
        status VARCHAR(20) DEFAULT 'ONLINE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default nodes if empty
    const nodeCount = await pool.query('SELECT COUNT(*) FROM nodes;');
    if (parseInt(nodeCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO nodes (name, host, rtsp_port, webrtc_port, hls_port) VALUES
        ('Node-A', 'localhost', 8554, 8889, 8888),
        ('Node-B', 'localhost', 8555, 8890, 8887);
      `);
    }

    // Seed default admin and operator users if empty
    const adminHash = await bcrypt.hash('admin123', 10);
    const opHash = await bcrypt.hash('operator123', 10);
    await pool.query(`
      INSERT INTO users (username, password_hash, full_name, role) VALUES
      ('admin', $1, 'VMS System Administrator', 'ADMIN'),
      ('operator', $2, 'SOC Control Operator', 'OPERATOR')
      ON CONFLICT (username) DO NOTHING;
    `, [adminHash, opHash]);

    console.log('[VizAI Database] Database schema and seed records verified successfully.');
  } catch (err) {
    console.error('[VizAI Database] Schema check notice:', (err as Error).message);
  }
}

// Initialize database schema asynchronously on boot
initDatabase();

// Authentication Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
  }
};

// Optional Auth Middleware (extracts user if token provided, but allows unauthenticated read)
const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      // ignore optional error
    }
  }
  next();
};

// Role Authorization Middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied: Administrator privileges required.' });
  }
  next();
};

// Helper to resolve node identifier (1/2 or UUID)
const resolveNodeId = async (node_id: any) => {
  if (node_id === 1 || node_id === '1') {
    const nodeRes = await pool.query("SELECT id FROM nodes WHERE name = 'Node-A' LIMIT 1;");
    if (nodeRes.rows.length > 0) return nodeRes.rows[0].id;
  } else if (node_id === 2 || node_id === '2') {
    const nodeRes = await pool.query("SELECT id FROM nodes WHERE name = 'Node-B' LIMIT 1;");
    if (nodeRes.rows.length > 0) return nodeRes.rows[0].id;
  }
  return node_id;
};

const CAMERA_SELECT_QUERY = `
  SELECT 
    c.id, c.name, c.stream_key, c.status,
    c.rtsp_source_url, c.resolution, c.node_id,
    c.created_at, c.updated_at,
    n.name as node_name,
    CONCAT('http://', n.host, ':', n.webrtc_port, '/', c.stream_key, '/') as webrtc_url,
    CONCAT('http://', n.host, ':', n.hls_port, '/', c.stream_key, '/') as hls_url
  FROM cameras c
  LEFT JOIN nodes n ON c.node_id = n.id
`;

// Helper to append signed viewer token to URLs if user is authenticated
const signCameraUrls = (camera: any, token?: string) => {
  if (!token) return camera;
  return {
    ...camera,
    webrtc_url: `${camera.webrtc_url}?token=${encodeURIComponent(token)}`,
    hls_url: `${camera.hls_url}?token=${encodeURIComponent(token)}`
  };
};

/* ==========================================================================
   AUTHENTICATION & USER MANAGEMENT ENDPOINTS
   ========================================================================== */

// POST /api/auth/login - User Authentication
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const tokenPayload: AuthUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      user: tokenPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/auth/me - Verify current session
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

// GET /api/users - List all users (Admin only)
app.get('/api/users', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, username, full_name, role, created_at, updated_at
      FROM users
      ORDER BY created_at ASC;
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/users - Create new staff user (Admin only)
app.post('/api/users', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ success: false, error: 'Username, password, and full name are required.' });
  }

  const userRole = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';

  try {
    const duplicateCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: `Username '${username}' is already taken.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, full_name, role, created_at;
    `;
    const result = await pool.query(query, [username.trim(), passwordHash, full_name.trim(), userRole]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /api/users/:id - Delete user (Admin only)
app.delete('/api/users/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own active administrator account.' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, username, full_name;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, message: `User "${result.rows[0].username}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/* ==========================================================================
   STREAM SECURITY & GATEKEEPER ENDPOINTS
   ========================================================================== */

// POST /api/streams/token - Generate a signed stream playback token
app.post('/api/streams/token', authMiddleware, (req: Request, res: Response) => {
  const { stream_key } = req.body;
  if (!stream_key) {
    return res.status(400).json({ success: false, error: 'stream_key is required.' });
  }

  const streamToken = jwt.sign(
    {
      sub: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      stream_key
    },
    JWT_SECRET,
    { expiresIn: '6h' }
  );

  res.json({ success: true, stream_key, token: streamToken });
});

// POST /api/streams/auth - MediaMTX HTTP Gatekeeper Webhook
app.post('/api/streams/auth', (req: Request, res: Response) => {
  const { user, password, ip, action, path, protocol, query } = req.body;
  console.log(`[Gatekeeper Webhook] ${action?.toUpperCase()} request for path: "${path}" via ${protocol} from ${ip}`);

  // 1. Publishers (FFmpeg ingest / NVR streams) are authorized
  if (action === 'publish') {
    console.log(`[Gatekeeper Webhook] Publish permission granted for camera feed "${path}"`);
    return res.status(200).json({ status: 'OK', action: 'publish' });
  }

  // 2. Viewers (WebRTC / HLS / RTSP playback)
  if (action === 'read') {
    let token: string | null = null;
    if (query) {
      const match = query.match(/(?:^|&)token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
    if (!token && password) token = password;
    if (!token && user && user.startsWith('ey')) token = user;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        console.log(`[Gatekeeper Webhook] Playback authorized for: ${decoded.username || decoded.sub || 'authenticated_viewer'}`);
        return res.status(200).json({ status: 'OK', user: decoded.username || decoded.sub });
      } catch (err) {
        console.warn(`[Gatekeeper Webhook] Stream access rejected: ${(err as Error).message}`);
        return res.status(403).json({ status: 'DENIED', error: 'Invalid or expired stream security token.' });
      }
    }

    // Check strictness setting
    const isStrict = process.env.STREAM_SECURITY_STRICT !== 'false';
    if (isStrict) {
      console.warn(`[Gatekeeper Webhook] Stream access rejected: Missing authentication token for "${path}"`);
      return res.status(403).json({ status: 'DENIED', error: 'Authentication token required for stream playback.' });
    } else {
      console.log(`[Gatekeeper Webhook] Development permissive mode: Allowed unauthenticated view for "${path}"`);
      return res.status(200).json({ status: 'OK', message: 'Development permissive mode' });
    }
  }

  res.status(200).json({ status: 'OK' });
});

/* ==========================================================================
   CAMERA MANAGEMENT ENDPOINTS
   ========================================================================== */

// GET /api/cameras - List all registered cameras
app.get('/api/cameras', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const query = `${CAMERA_SELECT_QUERY} ORDER BY c.created_at ASC;`;
    const result = await pool.query(query);
    
    // If request has bearer token, sign URLs with token
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined;

    const cameras = result.rows.map((cam) => signCameraUrls(cam, token));
    res.json({ success: true, data: cameras });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/cameras/:id - Get a single camera by ID
app.get('/api/cameras/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const query = `${CAMERA_SELECT_QUERY} WHERE c.id = $1;`;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found.' });
    }

    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined;

    res.json({ success: true, data: signCameraUrls(result.rows[0], token) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/cameras - Register a new camera (Protected: Admin or Operator)
app.post('/api/cameras', authMiddleware, async (req: Request, res: Response) => {
  const { name, stream_key, rtsp_source_url, node_id, resolution } = req.body;
  try {
    const resolvedNodeId = await resolveNodeId(node_id);

    const query = `
      INSERT INTO cameras (name, stream_key, rtsp_source_url, node_id, resolution)
      VALUES ($1, $2, $3, $4, COALESCE($5, '1280x720')) RETURNING id;
    `;
    const result = await pool.query(query, [name, stream_key, rtsp_source_url, resolvedNodeId, resolution]);
    const newId = result.rows[0].id;

    const fullCamResult = await pool.query(`${CAMERA_SELECT_QUERY} WHERE c.id = $1;`, [newId]);
    res.status(201).json({ success: true, data: fullCamResult.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PUT /api/cameras/:id - Update an existing camera (Protected: Admin only)
app.put('/api/cameras/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, stream_key, rtsp_source_url, node_id, resolution, status } = req.body;

  try {
    const checkRes = await pool.query('SELECT * FROM cameras WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found.' });
    }
    const currentCam = checkRes.rows[0];

    if (stream_key && stream_key !== currentCam.stream_key) {
      const duplicateCheck = await pool.query('SELECT id FROM cameras WHERE stream_key = $1 AND id != $2', [stream_key, id]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `Stream key '${stream_key}' is already in use by another camera.` 
        });
      }
    }

    let resolvedNodeId = currentCam.node_id;
    if (node_id !== undefined && node_id !== null) {
      resolvedNodeId = await resolveNodeId(node_id);
    }

    const updatedName = name !== undefined ? name : currentCam.name;
    const updatedStreamKey = stream_key !== undefined ? stream_key : currentCam.stream_key;
    const updatedRtsp = rtsp_source_url !== undefined ? rtsp_source_url : currentCam.rtsp_source_url;
    const updatedResolution = resolution !== undefined ? resolution : currentCam.resolution;
    const updatedStatus = status !== undefined ? status : currentCam.status;

    const updateQuery = `
      UPDATE cameras
      SET 
        name = $1,
        stream_key = $2,
        rtsp_source_url = $3,
        node_id = $4,
        resolution = $5,
        status = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id;
    `;
    await pool.query(updateQuery, [
      updatedName,
      updatedStreamKey,
      updatedRtsp,
      resolvedNodeId,
      updatedResolution,
      updatedStatus,
      id
    ]);

    const fullCamResult = await pool.query(`${CAMERA_SELECT_QUERY} WHERE c.id = $1;`, [id]);
    res.json({ success: true, data: fullCamResult.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /api/cameras/:id - Delete a camera (Protected: Admin only)
app.delete('/api/cameras/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cameras WHERE id = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found.' });
    }
    res.json({ 
      success: true, 
      message: `Camera "${result.rows[0].name}" (${result.rows[0].stream_key}) deleted successfully.`,
      data: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET / - API Health Check
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'ONLINE',
    service: 'VizAI Core API Service',
    auth_mode: 'JWT_RBAC_ENABLED',
    gatekeeper: 'HTTP_WEBHOOK_ACTIVE'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[VizAI Core API] Running on http://localhost:${PORT}`);
});