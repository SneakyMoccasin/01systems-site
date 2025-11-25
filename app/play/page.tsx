'use client';

import { WorldProvider, useWorld } from '@/worldEngine/core/worldState';
import PixiStage from '@/worldEngine/visual2d/PixiStage';
import DebugPanel from '@/worldEngine/ui/DebugPanel';
import PromptDock from '@/worldEngine/ui/PromptDock';
import '@/worldEngine/styles/pulseEffects.css';

function PageContent() {
  const { uiVisible } = useWorld();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <PixiStage />
      {uiVisible && (
        <div 
          style={{
            opacity: uiVisible ? 1 : 0,
            transition: "opacity 0.5s ease",
            pointerEvents: uiVisible ? "auto" : "none"
          }}
        >
          <DebugPanel />
          <PromptDock />
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <WorldProvider>
      <PageContent />
    </WorldProvider>
  );
}
