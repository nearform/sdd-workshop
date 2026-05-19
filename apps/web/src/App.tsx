import { useState } from 'react';
import type { NewIdeaInput } from '@idea-garden/shared';
import { Header } from './components/Header.tsx';
import { Garden } from './components/Garden.tsx';
import { NewIdeaModal } from './components/NewIdeaModal.tsx';
import { IdeaDetailModal } from './components/IdeaDetailModal.tsx';
import { PaperGrain } from './components/PaperGrain.tsx';
import { LeavesLayer } from './components/LeavesLayer.tsx';
import { useIdeas } from './hooks/useIdeas.ts';

export function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [openIdeaId, setOpenIdeaId] = useState<string | null>(null);
  const { status, ideas, error, createIdea, replaceIdea, removeIdea } = useIdeas();

  const handleCreate = async (input: NewIdeaInput) => {
    await createIdea(input);
    setModalOpen(false);
  };

  return (
    <main className="relative min-h-screen bg-paper text-ink overflow-x-hidden">
      <PaperGrain />
      <LeavesLayer />

      <div
        aria-hidden
        className="pointer-events-none absolute top-[-160px] right-[-120px] w-[520px] h-[520px] rounded-full bg-amber/15 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-200px] left-[-140px] w-[460px] h-[460px] rounded-full bg-primary-soft/70 blur-[120px]"
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-xl py-xl">
        <Header onPlantSeed={() => setModalOpen(true)} count={ideas.length} />
        <Garden
          status={status}
          ideas={ideas}
          error={error}
          onPlant={() => setModalOpen(true)}
          onOpenIdea={(id) => setOpenIdeaId(id)}
        />
      </div>

      <NewIdeaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      <IdeaDetailModal
        ideaId={openIdeaId}
        onClose={() => setOpenIdeaId(null)}
        onIdeaChanged={replaceIdea}
        onIdeaDeleted={removeIdea}
      />
    </main>
  );
}
