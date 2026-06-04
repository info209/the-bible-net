import React from 'react';
import PrayerWallView from '@/components/community/PrayerWallView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Prayer Wall',
  description: 'Join our community in prayer. Post your requests and intercede for others on our interactive prayer wall.',
};

export default function CommunityPrayersPage() {
  return (
    <div className="bg-white min-h-screen">
      <PrayerWallView />
    </div>
  );
}
