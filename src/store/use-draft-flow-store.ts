import { create } from "zustand";

interface DraftMap {
  [key: string]: any;
}

interface DraftStore {
  drafts: DraftMap;
  saveDraft: (key: string, data: any) => void;
  getDraft: (key: string) => any | undefined;
  clearDraft: (key: string) => void;
}

export const useDraftFlowStore = create<DraftStore>((set, get) => ({
  drafts: {},
  saveDraft: (key, data) =>
    set((s) => ({ drafts: { ...s.drafts, [key]: data } })),
  getDraft: (key) => get().drafts[key],
  clearDraft: (key) =>
    set((s) => {
      const { [key]: _, ...rest } = s.drafts;
      return { drafts: rest };
    }),
}));
