import { Metadata } from 'next';
// import ExplorePage from "../components/ExplorePage";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Explore",
};

export default function Page() {
  // return null;
  return <ComingSoonPage variant="under-development" title="Explore" />;
}
