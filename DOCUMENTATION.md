# VizAI Media Engine — Internship Technical Report & Handover Documentation

**Telekom Malaysia (TM) • Video Management System (VMS)**  
**Author:** Internship Engineering Team  
**Date:** September 2026  
**Status:** Phase 1 (P0 Core Prototype) — Active / Handover-Ready  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Business Objectives](#2-problem-statement--business-objectives)
3. [System Architecture & Topology](#3-system-architecture--topology)
4. [Technology Stack](#4-technology-stack)
5. [Core Modules & Technical Specifications](#5-core-modules--technical-specifications)
   * [5.1 Edge Video Ingest & Simulation Layer](#51-edge-video-ingest--simulation-layer)
   * [5.2 Media Pipeline Cluster (MediaMTX)](#52-media-pipeline-cluster-mediamtx)
   * [5.3 Central Database Layer (PostgreSQL)](#53-central-database-layer-postgresql)
   * [5.4 Control Plane & REST API (Node.js / Express)](#54-control-plane--rest-api-nodejs--express)
   * [5.5 Operator Video Wall & Client UI (React + Tailwind CSS)](#55-operator-video-wall--client-ui-react--tailwind-css)
6. [Milestone Progress & Deliverables Table](#6-milestone-progress--deliverables-table)
7. [Installation, Setup & Deployment Guide](#7-installation-setup--deployment-guide)
8. [API & Data Model Reference](#8-api--data-model-reference)
9. [Next Steps & Engineering Handover Roadmap](#9-next-steps--engineering-handover-roadmap)
10. [Troubleshooting & Operational FAQs](#10-troubleshooting--operational-faqs)

---

## 1. Executive Summary

The **VizAI Media Engine** is a high-performance, web-native Video Management System (VMS) engineered for **Telekom Malaysia (TM)**. The platform bridges physical surveillance infrastructure (IP cameras and NVRs) to modern web dashboards, providing real-time, sub-second latency video delivery to browser clients without requiring legacy browser plugins, proprietary desktop software, or costly server-side transcoding.

During Phase 1 (Prototype Deliverables), a distributed dual-node streaming cluster, an enterprise PostgreSQL directory, a Node.js REST API control plane, and a full-featured operator video wall compliant with Telekom Malaysia's brand identity were designed, implemented, and validated.

---

## 2. Problem Statement & Business Objectives

### 2.1 Limitations of Traditional VMS Systems
1. **High Latency:** Traditional streaming pipelines relying on standard HLS/DASH introduce 3 to 10 seconds of delay, making real-time perimeter monitoring and incident response sluggish.
2. **Heavy Server Transcoding Costs:** Many commercial platforms decode and re-encode incoming RTSP streams on central servers, consuming excessive CPU/GPU resources and limiting scalability.
3. **Proprietary Plugins:** Legacy systems require ActiveX controls, NPAPI plugins, or dedicated fat clients that run only on Windows workstations.
4. **Single-Point Bottlenecks:** Centralized servers often crash or throttle under concurrent multi-camera fan-out.

### 2.2 Project Goals & Commercial Deliverables
* **Sub-Second Latency:** Deliver live camera feeds to standard web browsers with under 500ms delay via WebRTC (WHEP).
* **Pass-Through Efficiency:** Stream video via zero-transcoding pass-through, preserving server CPU resources for maximum stream density.
* **Resilient Dual-Server Architecture:** Distribute camera ingest across multiple edge nodes (e.g., Cyberjaya Node-A and Puchong Node-B) to avoid single points of failure.
* **Instant Failover / Backup Stream:** Provide automatic fallback to HTTP Live Streaming (HLS) if WebRTC UDP traffic is blocked by corporate enterprise firewalls.
* **Enterprise Operator Dashboard:** Build a dark-mode web monitoring console supporting customizable camera matrices (`1x1`, `2x2`, `3x3`), stream diagnostics, and instant JPEG telemetry snapshot capture.

---

## 3. System Architecture & Topology

The system is built on a 3-tier distributed architecture dividing ingest, stream distribution, data management, and user interaction:

```mermaid
flowchart TD
    subgraph EdgeLayer["Edge / Ingest Layer"]
        NVR1["Physical NVR 01 (Cyberjaya)"]
        NVR2["Physical NVR 02 (Puchong)"]
        FFMPEG_A["FFmpeg Synthetic Ingest A<br/>(Camera 1: 1280x720 @ 30fps)"]
        FFMPEG_B["FFmpeg Synthetic Ingest B<br/>(Camera 2: 1280x720 @ 30fps)"]
    end

    subgraph StreamingCluster["Media Pipeline Cluster (Docker)"]
        subgraph NodeA["Streaming Node-A (mediamtx-pbt-a)"]
            RTSP_A["RTSP Ingest: Port 8554"]
            WHEP_A["WebRTC (WHEP): Port 8889 / UDP 8189"]
            HLS_A["HLS Engine: Port 8888"]
        end

        subgraph NodeB["Streaming Node-B (mediamtx-pbt-b)"]
            RTSP_B["RTSP Ingest: Port 8555"]
            WHEP_B["WebRTC (WHEP): Port 8890 / UDP 8190"]
            HLS_B["HLS Engine: Port 8887"]
        end
    end

    subgraph ControlStorage["Storage & Control Plane"]
        DB[("PostgreSQL 15<br/>Database: vizai_camera_db<br/>Port 5432")]
        API["Node.js / Express API Cluster<br/>Port 3000"]
    end

    subgraph ConsumerClient["Consumer Application (Web)"]
        UI["React 18 + Vite Operator Dashboard<br/>Port 5173"]
    end

    %% Ingest Flows
    FFMPEG_A -->|RTSP Push| RTSP_A
    FFMPEG_B -->|RTSP Push| RTSP_B
    NVR1 -.->|RTSP Push (Planned)| RTSP_A
    NVR2 -.->|RTSP Push (Planned)| RTSP_B

    %% Internal Communication
    API <-->|SQL Queries (pg Pool)| DB
    UI <-->|REST API / JSON| API

    %% Streaming Delivery
    WHEP_A -->|WebRTC Feed (Primary <500ms)| UI
    HLS_A -->|HLS Fallback Feed| UI
    WHEP_B -->|WebRTC Feed (Primary <500ms)| UI
    HLS_B -->|HLS Fallback Feed| UI
```

### Network Port Allocation Matrix

| Service Container | Internal Role | Port | Protocol | Host Exposure |
| :--- | :--- | :--- | :--- | :--- |
| `mediamtx-pbt-a` | Node-A RTSP Ingest | `8554` | TCP | `8554:8554` |
| `mediamtx-pbt-a` | Node-A WebRTC Signaling (WHEP) | `8889` | HTTP/TCP | `8889:8889` |
| `mediamtx-pbt-a` | Node-A WebRTC RTP Media | `8189` | UDP | `8189:8189/udp` |
| `mediamtx-pbt-a` | Node-A HLS Playlist & Segments | `8888` | HTTP/TCP | `8888:8888` |
| `mediamtx-pbt-b` | Node-B RTSP Ingest | `8555` | TCP | `8555:8555` |
| `mediamtx-pbt-b` | Node-B WebRTC Signaling (WHEP) | `8890` | HTTP/TCP | `8890:8890` |
| `mediamtx-pbt-b` | Node-B WebRTC RTP Media | `8190` | UDP | `8190:8190/udp` |
| `mediamtx-pbt-b` | Node-B HLS Playlist & Segments | `8887` | HTTP/TCP | `8887:8887` |
| `vizai-postgres` | PostgreSQL Database | `5432` | TCP | `5432:5432` |
| `server` | VizAI Core API Express Server | `3000` | HTTP/TCP | `3000:3000` |
| `client` | Operator Dashboard (Vite Dev) | `5173` | HTTP/TCP | `5173:5173` |

---

## 4. Technology Stack

| Category | Component / Tool | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Media Server** | [MediaMTX (formerly rtsp-simple-server)](https://github.com/bluenviron/mediamtx) | `latest` | High-efficiency, zero-dependency streaming gateway converting RTSP to WebRTC/WHEP and HLS. |
| **Ingest Simulation**| FFmpeg | `4.4-alpine` | Generates 24/7 test pattern streams (`lavfi testsrc`) with zero latency flags for prototype validation. |
| **Database** | PostgreSQL | `15-alpine` | Persistent relational store for camera registry, streaming node topology, and UUID indexing. |
| **Backend Runtime** | Node.js + Express | `Node 20+ / Express 4.19` | REST API control plane for camera registration, health checks, and dynamic URL generation. |
| **Backend Language** | TypeScript | `^5.4.5` | Type-safe backend development using `ts-node-dev`. |
| **Frontend Framework**| React 18 + Vite | `React 18.3 / Vite 5` | Ultra-fast single-page web dashboard with HMR and optimized asset bundling. |
| **Styling & Design** | Tailwind CSS | `^3.4.1` | Corporate design implementation matching Telekom Malaysia's official design specification. |
| **Icons & Assets** | Lucide React | `^1.16.0` | Comprehensive enterprise iconography for SOC operations. |
| **Video Playback** | Native WebRTC WHEP + `hls.js` | `^1.5.8` | Dual-protocol video rendering engine with sub-second WebRTC and resilient HLS fallback. |
| **Orchestration** | Docker & Docker Compose | `Compose 3.8` | Reproducible multi-container stack managing nodes, database, and stream generators. |

---

## 5. Core Modules & Technical Specifications

### 5.1 Edge Video Ingest & Simulation Layer
* **Production Mapping:** Physical NVRs (Hikvision, Dahua, Uniview) transmitting RTSP video over internal enterprise LAN.
* **Prototype Simulation:** Because physical NVR network connectivity is on hold pending site access, two containerized FFmpeg instances run continuously in `docker-compose.yml`:
  ```yaml
  command: -re -f lavfi -i testsrc=size=1280x720:rate=30 -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://mediamtx-pbt-a:8554/cam1_main
  ```
* **Architecture Rule:** Ensures a **single-stream connection per camera feed** between camera/NVR and MediaMTX to prevent overloading physical NVR hardware.

### 5.2 Media Pipeline Cluster (MediaMTX)
* Configured across two independent nodes:
  * [`mediamtx-a.yml`](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/mediamtx-a.yml): Listens on WebRTC `:8889`, UDP `:8189`, RTSP `:8554`.
  * [`mediamtx-b.yml`](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/mediamtx-b.yml): Listens on WebRTC `:8890`, UDP `:8190`, RTSP `:8555`.
* **Zero-Transcoding Pass-Through:** Video packets are received in H.264 format and packetized into WebRTC RTP packets without decoding or re-encoding. This guarantees near-zero CPU consumption on host machines.

### 5.3 Central Database Layer (PostgreSQL)
Initialized automatically via [`init.sql`](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/init.sql):
* **UUID Primary Keys:** Uses PostgreSQL's `uuid-ossp` module for unique, distributed record IDs.
* **`nodes` Table:** Stores cluster infrastructure details (`host`, `rtsp_port`, `webrtc_port`, `hls_port`, `status`).
* **`cameras` Table:** Stores camera metadata (`name`, `stream_key`, `rtsp_source_url`, `node_id`, `resolution`, `status`, `created_at`).
* **Relational Integrity:** Foreign key `node_id REFERENCES nodes(id) ON DELETE SET NULL` ensures camera records are safely preserved if a server node is decommissioned.

### 5.4 Control Plane & REST API (Node.js / Express)
Located in [`server/src/index.ts`](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/server/src/index.ts):
* **Dynamic URL Synthesis:** Joins the `cameras` table with the `nodes` table using SQL `CONCAT` to dynamically generate active WebRTC and HLS URLs based on the server node hosting the feed.
* **Smart Node Resolution:** The `POST /api/cameras` endpoint accepts either raw UUIDs or integer identifiers (`1` for Node-A, `2` for Node-B) to streamline camera onboarding.
* **CORS & Environment Isolation:** Fully decoupled backend configurable via `server/.env`.

### 5.5 Operator Video Wall & Client UI (React + Tailwind CSS)
Designed according to the [TM Design Specification](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/design-spec.md):
* **Brand Styling:** TM Orange (`#FF5100`), TM Flame (`#F37021`), TM Deep Slate (`#0B132B`), and TM Midnight Slate (`#1C2541`).
* **Dynamic Matrix Layout:** Seamlessly toggles between `1x1` (Focus inspection), `2x2` (Standard 4-channel wall), and `3x3` (9-channel overview).
* **Smart Stream Tile Component ([StreamTile.tsx](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/client/src/components/StreamTile.tsx)):**
  * Embedded WebRTC player via WHEP iframe.
  * Resilient fallback to HLS using `hls.js` with manual protocol switching.
  * Live status indicator pulse (🟢 Online / 🔴 Offline).
  * Instant telemetry snapshot export to `.jpg` with embedded canvas watermark showing camera ID, timestamp, and host server.
* **Management & Registration:**
  * Modal with live stream key auto-slugging and preset generation.
  * Cluster topology monitoring cards displaying port allocations and health.

---

## 6. Milestone Progress & Deliverables Table

Cross-referenced with [`work_plan.md`](file:///C:/Users/mdsma/Internship%20TM/vizai-media-engine/work_plan.md):

| Module Name | Architecture Component | Target Date | Planned Status | Actual Status | Deliverable Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Hardware & NVR Integration** | Edge Devices (NVRs & IP Cameras) | Sept 23, 2026 | On hold | 🟡 **Simulated** | Synthetic 24/7 RTSP feeds deployed via FFmpeg containers. Physical NVR on hold pending site access. |
| **2. Core Streaming Engine** | Media Pipeline Cluster (MediaMTX) | Sept 28, 2026 | In Progress | 🟢 **Completed** | Dual-node MediaMTX cluster running with WebRTC (<500ms) & HLS pass-through. |
| **3. Central Database & Cache** | Storage Layer (PostgreSQL & Redis) | Sept 30, 2026 | Not Started | 🟡 **Partially Completed** | PostgreSQL 15 deployed with schema & seed data. Redis caching pending. |
| **4. Core VMS API & Security** | Control Plane (Node.js API Cluster) | Oct 6, 2026 | Not Started | 🟢 **Completed** | JWT authentication, RBAC (Admin/Operator), MediaMTX HTTP gatekeeper webhook (`/api/streams/auth`), signed stream links. |
| **5. Operator Video Wall UI** | Consumer App (Web Dashboard) | Oct 9, 2026 | Not Started | 🟢 **Completed (Ahead of Schedule)** | Responsive multi-camera matrix (`1x1`, `2x2`, `3x3`), stream tiles, snapshot export, TM branding. |
| **6. Camera & User Management** | Consumer App & Control Plane | Oct 14, 2026 | Not Started | 🟢 **Completed** | Full camera CRUD modals, staff user management UI, role permissions, cluster topology view. |
| **7. Central Traffic Gateway** | API Gateway / L7 Load Balancer | Oct 14, 2026 | Planned | ⚪ **Phase 2** | Reverse proxy routing user requests evenly across API servers. |
| **8. Vision AI Analytics Engine** | Vision AI Workers (YOLO Engine) | Oct 20, 2026 | Planned | ⚪ **Phase 2** | Event detection webhook pushing real-time intrusion popups to the dashboard. |
| **9. Mass Broadcast Scaling** | 1:N Data Broadcast Fan-Out | Oct 23, 2026 | Planned | ⚪ **Phase 2** | Enterprise stream replication for hundreds of concurrent viewers. |

---

## 7. Installation, Setup & Deployment Guide

### 7.1 Prerequisites
* **Docker Desktop:** Installed and running with Linux container support.
* **Node.js:** v18.0.0 or higher.
* **Package Manager:** `npm` (v9+) or `yarn`.

### 7.2 Step 1: Start Infrastructure Containers
From the root repository directory:
```bash
docker compose up -d
```
Verify running containers:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
Expected output:
* `vizai-postgres` (Port 5432)
* `mediamtx-pbt-a` (Ports 8554, 8888, 8889, 8189/udp)
* `mediamtx-pbt-b` (Ports 8555, 8887, 8890, 8190/udp)
* `stream-generator-a` (Up)
* `stream-generator-b` (Up)

### 7.3 Step 2: Launch the Backend API
Navigate to the `server/` directory:
```bash
cd server
npm install
npm run dev
```
The server will boot on `http://localhost:3000`. You should see:
```text
[VizAI Core API] Running on http://localhost:3000
```

### 7.4 Step 3: Launch the Frontend Web Dashboard
In a separate terminal, navigate to the `client/` directory:
```bash
cd client
npm install
npm run dev
```
Open your browser and navigate to:
```text
http://localhost:5173
```

---

## 8. API & Data Model Reference

### 8.1 Database Schema (`init.sql`)

```sql
-- Table: Streaming Nodes
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    rtsp_port INT NOT NULL,
    webrtc_port INT NOT NULL,
    hls_port INT NOT NULL,
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
```

### 8.2 API Endpoints

#### 1. System Health Check
* **Endpoint:** `GET /`
* **Response:**
  ```json
  {
    "status": "ONLINE",
    "service": "VizAI Core API Service"
  }
  ```

#### 2. List All Cameras
* **Endpoint:** `GET /api/cameras`
* **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "3e58251a-c3d2-4984-8a65-feb952b46b77",
        "name": "Camera 1 Main",
        "stream_key": "cam1_main",
        "status": "ONLINE",
        "node_name": "Node-A",
        "webrtc_url": "http://localhost:8889/cam1_main/",
        "hls_url": "http://localhost:8888/cam1_main/"
      }
    ]
  }
  ```

#### 3. Register New Camera
* **Endpoint:** `POST /api/cameras`
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Perimeter North Gate",
    "stream_key": "cam_north_gate",
    "rtsp_source_url": "rtsp://mediamtx-pbt-a:8554/cam_north_gate",
    "node_id": 1
  }
  ```
* **Response (HTTP 201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "7f13904a-4dc2-48db-923f-e55d5bb96ef2",
      "name": "Perimeter North Gate",
      "stream_key": "cam_north_gate",
      "rtsp_source_url": "rtsp://mediamtx-pbt-a:8554/cam_north_gate",
      "node_id": "97e68cfb-...",
      "resolution": "1280x720",
      "status": "ONLINE"
    }
  }
  ```

#### 4. Update Camera Configuration
* **Endpoint:** `PUT /api/cameras/:id`
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Perimeter North Gate - High Resolution",
    "stream_key": "cam_north_gate",
    "rtsp_source_url": "rtsp://mediamtx-pbt-a:8554/cam_north_gate",
    "node_id": 1,
    "resolution": "1920x1080",
    "status": "ONLINE"
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "data": {
      "id": "7f13904a-4dc2-48db-923f-e55d5bb96ef2",
      "name": "Perimeter North Gate - High Resolution",
      "stream_key": "cam_north_gate",
      "status": "ONLINE",
      "resolution": "1920x1080",
      "node_name": "Node-A",
      "webrtc_url": "http://localhost:8889/cam_north_gate/",
      "hls_url": "http://localhost:8888/cam_north_gate/"
    }
  }
  ```

#### 5. Delete Camera
* **Endpoint:** `DELETE /api/cameras/:id`
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Camera \"Perimeter North Gate\" (cam_north_gate) deleted successfully.",
    "data": {
      "id": "7f13904a-4dc2-48db-923f-e55d5bb96ef2",
      "name": "Perimeter North Gate",
      "stream_key": "cam_north_gate"
    }
  }
  ```

#### 6. User Authentication & Login
* **Endpoint:** `POST /api/auth/login`
* **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "c1f7a63d-...",
      "username": "admin",
      "full_name": "VMS System Administrator",
      "role": "ADMIN"
    }
  }
  ```

#### 7. Staff User Directory (RBAC)
* **List Users:** `GET /api/users` (Header: `Authorization: Bearer <token>`, Admin only)
* **Create User:** `POST /api/users` (Header: `Authorization: Bearer <token>`, Admin only)
  ```json
  {
    "username": "operator2",
    "password": "password123",
    "full_name": "John Doe",
    "role": "OPERATOR"
  }
  ```
* **Delete User:** `DELETE /api/users/:id` (Header: `Authorization: Bearer <token>`, Admin only)

#### 8. MediaMTX Security Gatekeeper Webhook
* **Endpoint:** `POST /api/streams/auth`
* **Triggered by:** MediaMTX streaming cluster nodes upon incoming publish/read request.
* **Payload from MediaMTX:**
  ```json
  {
    "action": "read",
    "path": "cam1_main",
    "protocol": "webrtc",
    "ip": "127.0.0.1",
    "query": "token=eyJhbGciOi..."
  }
  ```
* **Response:** HTTP 200 (Access Granted) or HTTP 403 (Access Denied).

#### 9. Generate Signed Stream Token
* **Endpoint:** `POST /api/streams/token` (Header: `Authorization: Bearer <token>`)
* **Request Body:** `{"stream_key": "cam1_main"}`
* **Response:** Returns short-lived signed playback JWT token.

---

## 9. Next Steps & Engineering Handover Roadmap

With Modules 2, 4, 5, and 6 completed, the remaining prototype and post-prototype tasks are:

### Priority 1: Dynamic Feed Health Polling (Module 6)
* Query MediaMTX's internal management API (`/v3/paths/list`) periodically or listen to path hooks so that the `ONLINE` / `OFFLINE` indicators dynamically turn red when an RTSP feed drops.

### Priority 2: Central Database Caching Layer (Redis - Module 3)
* Add a Redis service container to `docker-compose.yml`.
* Cache camera-to-node routing lookups in Node.js to eliminate redundant SQL joins during high concurrency.

### Priority 3: Physical NVR & Camera Integration (Module 1)
* When physical hardware is available on the local network:
  1. Comment out `stream-generator-a` and `stream-generator-b` in `docker-compose.yml`.
  2. Configure MediaMTX paths to pull directly from the NVR:
     ```yaml
     paths:
       nvr_cam1:
         source: rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101
         sourceOnDemand: yes
     ```
  3. Update `init.sql` records to point to the actual physical RTSP endpoints.

### Priority 5: Vision AI (YOLO) Event Engine Integration (Phase 2)
* Connect a Python/YOLO container to RTSP feeds from MediaMTX.
* Create a WebSocket server in Node.js to receive AI alert payloads (bounding boxes, timestamps, classes) and push instant alert banners to active operator dashboards.

---

## 10. Troubleshooting & Operational FAQs

### Q1: WebRTC stream shows a black screen or fails to connect
* **Cause:** The WebRTC UDP media port (`8189` or `8190`) is blocked by a Windows firewall or Docker network bridge.
* **Resolution:** 
  1. Verify `webrtcAdditionalHosts: - 127.0.0.1` is set in the MediaMTX config.
  2. Test switching to the **Backup Feed (HLS)** toggle on the stream card to confirm if video packets are reaching MediaMTX.
  3. Ensure UDP port forwarding is enabled in Docker Compose (`8189:8189/udp`).

### Q2: API server reports `ECONNREFUSED` connecting to PostgreSQL
* **Cause:** PostgreSQL container has not finished its health check or is bound to a different port.
* **Resolution:** 
  * Check Docker container logs: `docker logs vizai-postgres`.
  * Ensure `server/.env` has `DB_HOST=localhost` and `DB_PORT=5432`.

### Q3: How do I reset the camera database to initial seed data?
* Run the following commands to recreate the volume and re-run `init.sql`:
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---
*Document maintained by the VizAI Media Engine Engineering Team. For questions or hand-off inquiries, refer to the repository issue tracker.*
