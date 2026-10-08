export interface Camera {
  id: string;
  name: string;
  stream_key: string;
  status: 'ONLINE' | 'OFFLINE' | string;
  node_name?: string;
  node_id?: string | number;
  webrtc_url: string;
  hls_url: string;
  rtsp_source_url?: string;
  resolution?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NewCameraPayload {
  name: string;
  stream_key: string;
  rtsp_source_url: string;
  node_id: number;
  resolution?: string;
}

export interface UpdateCameraPayload {
  name?: string;
  stream_key?: string;
  rtsp_source_url?: string;
  node_id?: number | string;
  resolution?: string;
  status?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATOR';
  created_at?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export interface NewUserPayload {
  username: string;
  password: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATOR';
}

export type GridMatrix = '1x1' | '2x2' | '3x3';
export type ViewMode = 'wall' | 'management';
export type FeedQuality = 'webrtc' | 'hls';

export interface ServerNode {
  id: number;
  name: string;
  label: string;
  location: string;
  host: string;
  rtspPort: number;
  webrtcPort: number;
  hlsPort: number;
  status: 'ACTIVE' | 'OFFLINE';
}

export const SERVER_NODES: ServerNode[] = [
  {
    id: 1,
    name: 'Node-A',
    label: 'Server 01 (Cyberjaya)',
    location: 'Cyberjaya Data Center',
    host: 'localhost',
    rtspPort: 8554,
    webrtcPort: 8889,
    hlsPort: 8888,
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: 'Node-B',
    label: 'Server 02 (Puchong)',
    location: 'Puchong Relay Hub',
    host: 'localhost',
    rtspPort: 8555,
    webrtcPort: 8890,
    hlsPort: 8887,
    status: 'ACTIVE',
  },
];
