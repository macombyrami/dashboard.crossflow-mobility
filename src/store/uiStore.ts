import { create } from 'zustand'

interface UIStore {
  isSidebarOpen:        boolean
  isNotificationOpen:   boolean
  isCommandPaletteOpen: boolean
  
  setSidebarOpen:        (open: boolean) => void
  setNotificationOpen:   (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  
  toggleSidebar:         () => void
  toggleNotification:    () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen:        false,
  isNotificationOpen:   false,
  isCommandPaletteOpen: false,

  setSidebarOpen:        (open) => set({ isSidebarOpen: open }),
  setNotificationOpen:   (open) => set({ isNotificationOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  toggleSidebar:         () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleNotification:    () => set((s) => ({ isNotificationOpen: !s.isNotificationOpen })),
}))
