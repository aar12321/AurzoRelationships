// AppShell — thin router that picks between DesktopShell and MobileShell
// based on the user's layout preference (auto / mobile / desktop). Also
// owns the cross-cutting concerns that should exist in both shells:
//   • global hotkeys (⌘K palette, "/" search)
//   • the CommandPalette modal itself

import DesktopShell from './DesktopShell';
import MobileShell from './MobileShell';
import CommandPalette from '@/components/CommandPalette';
import CaptureMomentFAB from '@/components/CaptureMomentFAB';
import CaptureMomentModal from '@/features/memories/CaptureMomentModal';
import Toaster from '@/components/Toaster';
import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys';
import { useLayoutMode } from '@/hooks/useLayoutMode';

export default function AppShell() {
  useGlobalHotkeys();
  const { mode } = useLayoutMode();

  return (
    <>
      {mode === 'mobile' ? <MobileShell /> : <DesktopShell />}
      <CaptureMomentFAB bottomOffset={mode === 'mobile' ? 76 : 24} />
      <CaptureMomentModal />
      <CommandPalette />
      <Toaster />
    </>
  );
}
