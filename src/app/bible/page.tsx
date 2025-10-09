"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BibleRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Try to get last selection from localStorage
    let version = "akjv";
    let book = "genesis";
    let chapter = 1;
    let verse: number | undefined = undefined;
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bible_last_selection");
      if (cached) {
        try {
          const obj = JSON.parse(cached);
          if (obj.version && obj.book && obj.chapter) {
            version = obj.version;
            book = obj.book;
            chapter = obj.chapter;
            if (obj.verse) {
              verse = obj.verse;
            }
          }
        } catch {}
      }
    }
    if (verse !== undefined) {
      router.replace(`/bible/${version}/${book}/${chapter}?verse=${verse}`);
    } else {
      router.replace(`/bible/${version}/${book}/${chapter}`);
    }
  }, [router]);
  return null;
}
