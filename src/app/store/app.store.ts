import { create } from 'zustand';

type ThemeMode = 'system' | 'light' | 'dark';

type AppStore = {
  theme: ThemeMode;
  isPwaInstalled: boolean;
  setTheme: (theme: ThemeMode) => void;
  setPwaInstalled: (installed: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  theme: 'system',
  isPwaInstalled: false,
  setTheme: (theme) => set({ theme }),
  setPwaInstalled: (isPwaInstalled) => set({ isPwaInstalled }),
}));
