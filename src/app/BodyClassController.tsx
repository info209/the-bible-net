"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function BodyClassController() {
  const pathname = usePathname();

  useEffect(() => {

    if (pathname.startsWith("/bible")) {
      document.body.classList.add("bible_page");
    } else {
      document.body.classList.remove("bible_page");
    }
  }, [pathname]);

  return null;
}
