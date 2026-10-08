Architecture Master Module Plan
To balance long-term commercial goals with fast prototype deliverables, modules are split into two phases:
	Priority 0 (P0 - Prototype Focus): Core deliverables targeted for completion during your internship.
	Priority 1 & 2 (P1/P2 - Production & Scaling): Secondary features and enterprise scaling modules scheduled for post-prototype deployment or hand-off.
Master Deliverables & Timeline Table
Module Name	Architecture Component	Priority	Mandays	Target Date	Current Status	Core Business Deliverable
1. Hardware & NVR Integration	Edge Devices (NVRs & IP Cameras)	P0	2 Days	Sept 23, 2026	Simulated	Mapped camera feeds connected directly from physical NVRs (simulated via 24/7 FFmpeg RTSP feeds).
2. Core Streaming Engine	Media Pipeline Cluster (MediaMTX)	P0	2 Days	Sept 25, 2026	Completed	Dual-server streaming cluster converting camera feeds into instant web video.
3. Central Database & Cache	Storage Layer (PostgreSQL & Redis)	P0	2 Days	Sept 29, 2026	Partially Complete	Central database storing camera catalog, user profiles, and active stream routes.
4. Core VMS API & Security	Control Plane (Node.js API Cluster)	P0	4 Days	Oct 5, 2026	Completed	Backend system managing user logins, stream security tokens, and permission checks.
5. Operator Video Wall UI	Consumer App (Web Dashboard)	P0	2 Days	Oct 7, 2026	Completed	Multi-camera grid dashboard displaying live feeds with sub-second video latency.
6. Camera & User Management	Consumer App & Control Plane	P0	3 Days	Oct 12, 2026	Completed	Management screens to add/edit/delete cameras, view camera health status, and manage staff users.
7. Central Traffic Gateway	API Gateway / L7 Load Balancer	P1	2 Days	Oct 14, 2026	Planned	Secure traffic router distributing incoming user traffic evenly across backend servers.
8. Vision AI Analytics Engine	Vision AI Workers (YOLO Engine)	P1	4 Days	Oct 20, 2026	Planned	Automated AI module detecting security events and pushing instant alert pop-ups to the dashboard.
9. Mass Broadcast Scaling	1:N Data Broadcast Fan-out	P2	3 Days	Oct 23, 2026	Planned	Enterprise broadcasting setup allowing hundreds of concurrent viewers without video lag.



PHASE 1: Prototype Deliverables (Internship Target: Oct 14, 2026)
Module 1: Hardware & NVR Integration
	Architecture Mapping: Edge NVR 1 & 2 + IP Camera Groups
	Priority: P0 (Core Prototype) | Mandays: 2 Days | Target Date: Sept 23, 2026 | Status: In Progress
	Business Scope:
	Configure network connections to physical NVR devices.
	Verify standard stream addresses (RTSP) for all camera channels.
	Ensure single-stream connection per camera feed to prevent NVR hardware overload.
	Deliverable: Verified camera stream map connecting physical NVR channels to the software system.

Module 2: Core Streaming Engine
	Architecture Mapping: Media Pipeline Cluster (MediaMTX Nodes PBT-A & PBT-B)
	Priority: P0 (Core Prototype) | Mandays: 3 Days | Target Date: Sept 28, 2026 | Status: In Progress
	Business Scope:
	Deploy a dual-server streaming pipeline using MediaMTX.
	Convert raw camera feeds into low-latency web video formats (WebRTC) for instant playback in web browsers.
	Establish pass-through video processing to ensure near-zero server CPU usage.
	Deliverable: Working video streaming cluster delivering sub-second video feeds to web screens.

Module 3: Central Database & Directory Caching
	Architecture Mapping: Storage Layer (PostgreSQL Database & Redis Directory)
	Priority: P0 (Core Prototype) | Mandays: 2 Days | Target Date: Sept 30, 2026 | Status: Not Started
	Business Scope:
	Build the primary PostgreSQL database to store user accounts, system activity logs, and camera information.
	Build an in-memory Redis lookup directory that tracks which streaming server is hosting which live camera feed.

	Deliverable: Connected database and fast lookup directory supporting user and camera operations.

Module 4: Core VMS API & Stream Security Backend
	Architecture Mapping: Control Plane (Node.js VMS API Server Cluster)
	Priority: P0 (Core Prototype) | Mandays: 4 Days | Target Date: Oct 6, 2026 | Status: Completed
	Business Scope:
	Build user login and security token authentication mechanisms.
	Implement the automated "Security Gatekeeper" webhook (authInternal) that verifies if a user is allowed to view a camera feed before playing video.
	Create internal stream routing logic that returns secure, signed video links to authorized users.
	Deliverable: Secure Node.js backend managing logins, stream authorization, and media signaling.

Module 5: Operator Video Wall UI
	Architecture Mapping: Consumer Applications (Web Dashboard / SOC Stations - Part 1)
	Priority: P0 (Core Prototype) | Mandays: 3 Days | Target Date: Oct 9, 2026 | Status: Completed
	Business Scope:
	Build the web dashboard shell with secure login and navigation screens.
	Create a multi-camera grid layout (2×2, 3×3, 4×4) for live monitoring.
	Integrate WebRTC players into grid tiles with basic player controls (fullscreen, camera titles).
	Deliverable: Interactive web dashboard displaying smooth live multi-camera feeds on a grid screen.

Module 6: Camera & User Management Features
	Architecture Mapping: Consumer Applications + Control Plane (Part 2)
	Priority: P0 (Core Prototype) | Mandays: 3 Days | Target Date: Oct 14, 2026 | Status: Completed
	Business Scope:
	Create web forms to Add, Edit, and Delete cameras (camera names, IP addresses, NVR channel numbers, stream settings).
	Build real-time camera health monitoring indicators (🟢 Online / 🔴 Offline) that update automatically if a feed drops.
	Create user administration screens to manage staff accounts, passwords, and access roles (Admin vs. Operator).
	Deliverable: Administrative web screens allowing full management of system cameras, camera health, and user accounts.



PHASE 2: Post-Prototype & System Expansion 
Module 7: Central Traffic Gateway
	Architecture Mapping: API Gateway / L7 Load Balancer
	Priority: P1 (Secondary) 
	Business Scope:
	Implement a central entry point (Nginx / API Gateway) to route dashboard requests to available backend API servers.
	Protect backend services from traffic spikes and enable smooth scaling.
	Deliverable: Central Gateway setup routing incoming network traffic efficiently.

Module 8: Vision AI Analytics Engine Integration
	Architecture Mapping: Vision AI Workers (YOLO Engine)
	Priority: P1 (Secondary) 
	Business Scope:
	Connect Vision AI engines (YOLO) directly to MediaMTX feeds.
	Build an alert receiving webhook in Node.js to store AI detection logs (intrusion alerts, object detection).
	Push real-time pop-up notification alerts directly to active operator dashboards via WebSockets.
	Deliverable: Working AI event alert flow displaying real-time detection pop-ups on the operator screen.

Module 9: Mass Broadcast Fan-Out Scaling
	Architecture Mapping: 1:N Data Broadcast Fan-Out
	Priority: P2 (Future Expansion) 
	Business Scope:
	Optimize media server network bandwidth to duplicate single incoming camera streams across hundreds of concurrent web viewers without adding load to physical cameras.
	Deliverable: Enterprise stream distribution setup ready for commercial deployment at scale.
