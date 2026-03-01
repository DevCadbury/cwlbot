'use client';
import { createContext, useContext } from 'react';

export interface SidebarContextType {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
