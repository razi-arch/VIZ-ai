-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Streaming Nodes
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    rtsp_port INT NOT NULL,
    webrtc_port INT NOT NULL,
    hls_port INT NOT NULL,
    api_port INT NOT NULL DEFAULT 9997,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Cameras
CREATE TABLE cameras (
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

-- Seed Initial Nodes (Nodes A and B from Module 2)
INSERT INTO nodes (name, host, rtsp_port, webrtc_port, hls_port, api_port) VALUES
('Node-A', 'localhost', 8554, 8889, 8888, 9997),
('Node-B', 'localhost', 8555, 8890, 8887, 9996);

-- Seed Initial Camera Records
INSERT INTO cameras (name, stream_key, rtsp_source_url, node_id) VALUES
('Camera 1 Main', 'cam1_main', 'rtsp://mediamtx-pbt-a:8554/cam1_main', (SELECT id FROM nodes WHERE name = 'Node-A')),
('Camera 2 Main', 'cam2_main', 'rtsp://mediamtx-pbt-b:8555/cam2_main', (SELECT id FROM nodes WHERE name = 'Node-B'))
ON CONFLICT (stream_key) DO NOTHING;

-- Table: Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Default Admin and Operator Users
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2b$10$l4p/wf1O9BWLHZMGV8Kun.vKso1jiJoN7eXEJM9aDfKh/Zypa44AS', 'VMS System Administrator', 'ADMIN'),
('operator', '$2b$10$Z7LqTpbwh5TcXvJIoahXy.rEp18f7xN9VgMVtggq/raSTW3yjn6.a', 'SOC Control Operator', 'OPERATOR')
ON CONFLICT (username) DO NOTHING;