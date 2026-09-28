import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';

const W = 390;
const H = 844;

/**
 * Vývojový náhľad: samotná aplikácia (tie isté komponenty, tá istá databáza) v iframe
 * s viewportom 390 × 844, takže sa uplatní skutočný mobilný layout a bezpečné okraje.
 */
export function MobilePreview() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 150) / (H + 24)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const src = `${window.location.href.split('#')[0]}#/`;

  return (
    <>
      <PageHeader title="Mobilný náhľad" subtitle="Rovnaká aplikácia a rovnaké dáta ako vľavo" />
      <div className="flex justify-center px-4 pb-8" style={{ height: (H + 24) * scale + 24 }}>
        <div style={{ width: (W + 24) * scale, height: (H + 24) * scale }}>
          <div
            className="rounded-[56px] border-[12px] border-[#1c1c22] bg-black shadow-2xl"
            style={{ width: W + 24, height: H + 24, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <iframe
              title="Mobilný náhľad aplikácie"
              src={src}
              width={W}
              height={H}
              className="block rounded-[44px] bg-bg"
              style={{ border: 0 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
