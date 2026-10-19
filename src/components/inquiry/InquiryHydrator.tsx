"use client";

import { useEffect } from "react";
import { useInquiry } from "@/lib/inquiry/store";

/** Loads the saved inquiry list after hydration and keeps tabs in sync. */
export function InquiryHydrator() {
  useEffect(() => {
    void useInquiry.persist.rehydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === useInquiry.persist.getOptions().name) void useInquiry.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
