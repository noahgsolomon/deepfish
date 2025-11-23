import { create } from "zustand";

export interface TabItem {
  href: string; // full path + query
  label: string;
}

interface TabStore {
  tabs: TabItem[];
  activeHref: string;
  addTab: (tab: TabItem) => void;
  removeTab: (href: string) => void;
  setActive: (href: string) => void;
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeHref: "",
  addTab: (tab) =>
    set((state) => {
      if (state.tabs.some((t) => t.href === tab.href)) {
        return { ...state, activeHref: tab.href };
      }
      return {
        tabs: [...state.tabs, tab],
        activeHref: tab.href,
      };
    }),
  removeTab: (href) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.href !== href),
      activeHref: state.activeHref === href ? "" : state.activeHref,
    })),
  setActive: (href) => set({ activeHref: href }),
}));
