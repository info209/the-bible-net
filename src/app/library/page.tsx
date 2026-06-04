import { Metadata } from 'next';
// import LibraryPage from "../components/LibraryPage";
import ComingSoonPage from "../components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Library",
};

export default function Page() {
  // return <LibraryPage />;
  return <ComingSoonPage variant="coming-soon" title="Library" />;
}
