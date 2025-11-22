'use client';

import { WorldProvider } from '@/worldEngine/core/worldState';
import PixiStage from '@/worldEngine/visual2d/PixiStage';
import DebugPanel from '@/worldEngine/ui/DebugPanel';
import PromptDock from '@/worldEngine/ui/PromptDock';
import '@/worldEngine/styles/pulseEffects.css';

export default function Page() {
  return (
    <WorldProvider>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <DebugPanel />
        <PixiStage />
        <PromptDock />
      </div>
    </WorldProvider>
  );
}
