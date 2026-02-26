import { useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { MENU_ITEMS } from "@/components/Layout";

interface UseKeyboardNavProps {
  onOpenSettings: () => void;
  onCloseSettings?: () => void;
  settingsOpen: boolean;
  onOpenShortcuts?: () => void;
}

export function useKeyboardNav({ onOpenSettings, onCloseSettings, settingsOpen, onOpenShortcuts }: UseKeyboardNavProps) {
  const router = useRouter();

  const navigate = useCallback((direction: "prev" | "next") => {
    const currentIndex = MENU_ITEMS.findIndex(item => item.href === router.pathname);
    if (currentIndex === -1) return;

    const newIndex = direction === "prev" 
      ? Math.max(0, currentIndex - 1)
      : Math.min(MENU_ITEMS.length - 1, currentIndex + 1);
    
    const target = MENU_ITEMS[newIndex];
    if (target && target.href !== router.pathname) {
      router.push(target.href);
    }
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLElement && (
        e.target.tagName === "INPUT" || 
        e.target.tagName === "TEXTAREA" || 
        e.target.isContentEditable
      )) {
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          if (settingsOpen && onCloseSettings) {
            onCloseSettings();
          } else {
            onOpenSettings();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          navigate("prev");
          break;
        case "ArrowRight":
          e.preventDefault();
          navigate("next");
          break;
        case "?":
          e.preventDefault();
          onOpenShortcuts?.();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onOpenSettings, onCloseSettings, onOpenShortcuts, settingsOpen]);
}

export const KEYBOARD_SHORTCUTS = [
  { key: "←", description: "Navigate to previous page" },
  { key: "→", description: "Navigate to next page" },
  { key: "Esc", description: "Open/close settings" },
  { key: "Cmd+K", description: "Open command palette" },
];
