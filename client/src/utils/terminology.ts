/**
 * Terminology Helper:
 * Maps technical backend/stream jargon to Telekom Malaysia operator-friendly terms
 * as specified in DESIGN_SPEC.md.
 */

export function formatNodeName(nodeName?: string | null): string {
  if (!nodeName) return 'Server 01 (Cyberjaya)';
  const lower = nodeName.toLowerCase();
  if (lower.includes('node-b') || lower.includes('pbt-b') || lower.includes('server 02') || lower.includes('puchong')) {
    return 'Server 02 (Puchong)';
  }
  return 'Server 01 (Cyberjaya)';
}

export function getNodeShortTag(nodeName?: string | null): string {
  if (!nodeName) return 'Server 01';
  const lower = nodeName.toLowerCase();
  if (lower.includes('node-b') || lower.includes('pbt-b') || lower.includes('server 02') || lower.includes('puchong')) {
    return 'Server 02';
  }
  return 'Server 01';
}

export function formatFeedQuality(quality: 'webrtc' | 'hls'): string {
  return quality === 'webrtc' ? 'Low-Latency Feed' : 'Backup Feed';
}

export const LABELS = {
  appName: 'VizAI Video Engine',
  brandOwner: 'Telekom Malaysia',
  registerCamera: 'Register New Camera',
  cameraAddress: 'Camera Address',
  cameraId: 'Camera ID',
  systemRegistry: 'System Registry',
  operationalStatus: 'System Operational',
  lowLatency: 'Low-Latency Feed',
  backupFeed: 'Backup Feed',
};
