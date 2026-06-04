import { Metadata } from 'next';
import HomeView from "@/components/home/HomeView";

export const metadata: Metadata = {
  title: "Home",
};

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto">
      <HomeView />
    </div>
  );
}
