import { useState } from 'react';
import type { Exercise } from '../../domain/types';
import { Button, Spinner } from './basic';
import { ExerciseBrowser } from './ExerciseBrowser';
import { Sheet } from './Sheet';
import { useLibrary } from '../hooks/data';

/** Výber jedného alebo viacerých cvikov zo skutočnej knižnice (bez skrytých). */
export function ExercisePicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (exercises: Exercise[]) => void;
}) {
  const lib = useLibrary();
  const [sel, setSel] = useState<Exercise[]>([]);
  const close = () => {
    setSel([]);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title="Pridať cviky" tall>
      {!lib ? (
        <Spinner />
      ) : (
        <>
          <ExerciseBrowser
            exercises={lib.visible}
            selected={new Set(sel.map((e) => e.id))}
            onPick={(e) => setSel((s) => (s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]))}
          />
          <div className="sticky bottom-0 -mx-5 mt-4 bg-card px-5 pb-2 pt-3">
            <Button
              variant="primary"
              block
              disabled={sel.length === 0}
              onClick={() => {
                onAdd(sel);
                setSel([]);
                onClose();
              }}
            >
              {sel.length ? `Pridať (${sel.length})` : 'Vyber cviky'}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
