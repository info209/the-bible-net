"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BibleRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Try to get last selection from localStorage
    const version = typeof window !== "undefined" ? localStorage.getItem("bible_version") : null;
    const book = typeof window !== "undefined" ? localStorage.getItem("bible_book") : null;
    const chapter = typeof window !== "undefined" ? localStorage.getItem("bible_chapter") : null;
    if (version && book && chapter) {
      router.replace(`/bible/${version}/${book}/${chapter}`);
    } else {
      router.replace("/bible/akjv/genesis/1");
    }
  }, [router]);
  return null;
}
