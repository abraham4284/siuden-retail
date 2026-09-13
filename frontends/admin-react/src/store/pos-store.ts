import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PosLine = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  maxAvailable: number;
};

type PosDraftState = {
  tenantId: string | null;
  customerId: string | null;
  lines: PosLine[];
  initialize: (tenantId: string) => void;
  setCustomer: (customerId: string | null) => void;
  addLine: (tenantId: string, line: Omit<PosLine, "quantity">) => boolean;
  setQuantity: (variantId: string, quantity: number) => boolean;
  removeLine: (variantId: string) => void;
  clear: (tenantId?: string) => void;
};

export const usePosStore = create<PosDraftState>()(
  persist(
    (set, get) => ({
      tenantId: null,
      customerId: null,
      lines: [],
      initialize: (tenantId) => {
        if (get().tenantId !== tenantId) {
          set({ tenantId, customerId: null, lines: [] });
        }
      },
      setCustomer: (customerId) => set({ customerId }),
      addLine: (tenantId, line) => {
        const state = get();
        if (state.tenantId !== tenantId) {
          if (line.maxAvailable < 1) return false;
          set({ tenantId, customerId: null, lines: [{ ...line, quantity: 1 }] });
          return true;
        }
        const existing = state.lines.find((item) => item.variantId === line.variantId);
        if (existing && existing.quantity >= existing.maxAvailable) return false;
        if (!existing && line.maxAvailable < 1) return false;
        set({
          lines: existing
            ? state.lines.map((item) =>
                item.variantId === line.variantId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              )
            : [...state.lines, { ...line, quantity: 1 }],
        });
        return true;
      },
      setQuantity: (variantId, quantity) => {
        const line = get().lines.find((item) => item.variantId === variantId);
        if (!line || quantity < 1 || quantity > line.maxAvailable) return false;
        set({
          lines: get().lines.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
          ),
        });
        return true;
      },
      removeLine: (variantId) =>
        set({ lines: get().lines.filter((item) => item.variantId !== variantId) }),
      clear: (tenantId) => set({ tenantId: tenantId ?? null, customerId: null, lines: [] }),
    }),
    {
      name: "siuden-pos-draft-v1",
      partialize: ({ tenantId, customerId, lines }) => ({ tenantId, customerId, lines }),
    },
  ),
);
