# VizAI VMS Frontend — Design Specification & UI Guidelines

## 1. Executive Summary
This document specifies the UI/UX architecture, visual design system, and component behavior for the VizAI Video Management System (VMS) frontend. The design adopts Telekom Malaysia's (TM) corporate brand aesthetic, prioritizing a clean, dark, high-contrast, and intuitive interface for security operators and administrators.

---

## 2. Brand Theme & Color Palette

The interface strictly follows the **Telekom Malaysia (TM)** visual identity, balancing TM Orange accents with deep enterprise slate backgrounds to ensure minimal eye fatigue during continuous monitoring.

### 2.1 Palette Breakdown

| Role | Color Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- | :--- |
| **Primary Accent** | TM Orange | `#FF5100` | Active buttons, selected layout toggles, primary actions, highlight borders. |
| **Secondary Accent** | TM Flame | `#F37021` | Hover states for primary buttons, focus rings. |
| **Base Canvas** | TM Deep Slate | `#0B132B` | Main application background behind stream cards. |
| **Surface Elevation** | TM Midnight Slate | `#1C2541` | Video player cards, sidebar panels, modals, top navigation bar. |
| **Subtle Border** | Slate Stroke | `#334155` | Card outlines, container dividers, search inputs. |
| **Status Good** | Connected Green | `#10B981` | Online camera status, operational server badges. |
| **Status Error** | Disconnected Red | `#EF4444` | Offline camera alerts, server error states. |
| **Text Primary** | Pure White | `#FFFFFF` | Headings, stream titles, active menu labels. |
| **Text Secondary** | Muted Slate | `#94A3B8` | Subtitles, server tags, inactive labels. |

---

## 3. Human-Friendly Terminology Guidelines

To keep the application accessible to non-technical operational staff, technical terms used in the API and backend are mapped to clear enterprise language in the UI:

| Backend / API Technical Term | UI Display Term | Visual Placement |
| :--- | :--- | :--- |
| `POST /api/cameras` | **Register New Camera** | Primary action buttons and modal title |
| `mediamtx-pbt-a` (`Node-A`) | **Server 01 (Cyberjaya)** | Server badge on camera cards & filters |
| `mediamtx-pbt-b` (`Node-B`) | **Server 02 (Puchong)** | Server badge on camera cards & filters |
| `WebRTC Endpoint` | **Low-Latency Feed** | Stream player protocol selector |
| `HLS Endpoint` | **Backup Feed** | Stream player protocol selector |
| `RTSP Source URL` | **Camera Address** | Camera registration form input label |
| `Stream Key` | **Camera ID** | Secondary details overlay |
| `PostgreSQL Database` | **System Registry** | System health header widget |

---

## 4. UI Architecture & Layout Structure

The layout uses a three-zone structure: **Header Nav**, **Collapsible Sidebar**, and **Main Workspace Canvas**.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [TM Logo]  VizAI Video Engine │ System Operational          [2x2] [3x3] [x] │ Header
├───────────────┬─────────────────────────────────────────────────────────────┤
│ Search Camera │  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│ ───────────── │  │ 🔴 LIVE   Camera 01      │  │ 🔴 LIVE   Camera 02      │   │
│ ⏺ Front Gate  │  │                         │  │                         │   │
│ ⏺ Lobby Hall  │  │      [ Live Feed ]      │  │      [ Live Feed ]      │   │ Main
│ ⏺ Parking B1  │  │                         │  │                         │   │ Video
│               │  └─────────────────────────┘  └─────────────────────────┘   │ Wall
│               │  ┌─────────────────────────┐  ┌─────────────────────────┐   │ Grid
│               │  │ 🔴 LIVE   Camera 03      │  │ 🔴 LIVE   Camera 04      │   │
│ + Add Camera  │  │                         │  │                         │   │
└───────────────┴─────────────────────────────────────────────────────────────┘
  Sidebar