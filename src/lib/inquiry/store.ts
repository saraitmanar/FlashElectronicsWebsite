"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeQuantity } from "./quantity";
import { newReferenceCode } from "./reference";
import type { InquiryDetails, InquiryLine } from "./types";

interface InquiryState {
  lines: InquiryLine[];
  details: InquiryDetails;
  /** Created with the first item, renewed when the list is cleared. */
  reference: string | null;
  /** False until the saved list has been read from this browser. */
  hydrated: boolean;
  add: (line: Omit<InquiryLine, "addedAt">) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setDetails: (details: Partial<InquiryDetails>) => void;
}

/**
 * The inquiry list, saved in this browser's localStorage. No account needed.
 * Hydration is manual (InquiryHydrator) so the server-rendered HTML and the
 * first client render match.
 */
export const useInquiry = create<InquiryState>()(
  persist(
    (set) => ({
      lines: [],
      details: {},
      reference: null,
      hydrated: false,

      add: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          const lines = existing
            ? state.lines.map((l) =>
                l.variantId === line.variantId
                  ? {
                      ...l,
                      snapshot: line.snapshot,
                      quantity: normalizeQuantity(
                        l.quantity + line.quantity,
                        line.snapshot.packaging,
                      ),
                    }
                  : l,
              )
            : [...state.lines, { ...line, addedAt: new Date().toISOString() }];
          return { lines, reference: state.reference ?? newReferenceCode() };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: normalizeQuantity(quantity, l.snapshot.packaging) }
              : l,
          ),
        })),

      remove: (variantId) =>
        set((state) => {
          const lines = state.lines.filter((l) => l.variantId !== variantId);
          return { lines, reference: lines.length ? state.reference : null };
        }),

      clear: () => set({ lines: [], reference: null }),

      setDetails: (details) => set((state) => ({ details: { ...state.details, ...details } })),
    }),
    {
      name: "flash:inquiry",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ lines, details, reference }) => ({ lines, details, reference }),
      onRehydrateStorage: () => () => useInquiry.setState({ hydrated: true }),
    },
  ),
);

/** Number of lines (distinct product variants) on the list. */
export const selectLineCount = (state: InquiryState) => state.lines.length;
