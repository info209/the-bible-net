import { Metadata } from 'next';
import { Suspense } from 'react';
import HomeView from "@/components/home/HomeView";

export const metadata: Metadata = {
  title: "Home",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <div className="max-w-3xl mx-auto">
        <HomeView />
      </div>
    </Suspense>
  );
}
