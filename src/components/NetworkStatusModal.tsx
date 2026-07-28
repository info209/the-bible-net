/**
 * NetworkStatusModal
 *
 * This component is intentionally kept as a no-op stub.
 * Offline status is now handled by the non-blocking <OfflineBanner />
 * component rendered in ClientLayout, which allows users to continue
 * reading offline content without being interrupted by a modal dialog.
 *
 * This file is preserved to avoid breaking any existing imports.
 */
'use client';

export default function NetworkStatusModal() {
  // No-op: offline status is handled by OfflineBanner in ClientLayout
  return null;
}
