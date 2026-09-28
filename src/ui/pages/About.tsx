import { BUILTIN_EXERCISES } from '../../domain/exercises';
import { Card, SectionTitle } from '../components/basic';
import { PageHeader } from '../components/PageHeader';

const LICENSES = [
  ['Free Exercise DB', 'Unlicense (public domain) – zoznam cvikov a návody, github.com/yuhonas/free-exercise-db. Názvy a návody sú preložené do slovenčiny.'],
  ['React, React Router', 'MIT'],
  ['Dexie.js', 'Apache 2.0'],
  ['Tailwind CSS, Vite, Workbox', 'MIT'],
];

export function About() {
  return (
    <>
      <PageHeader title="O aplikácii" back="/nastavenia" />
      <div className="px-4 pb-8">
        <Card>
          <p className="text-lg font-semibold">Osobný tréningový denník</p>
          <p className="mt-1 text-muted">
            Verzia 1.0 · bez účtu, reklám, sledovania a cloudu. Dáta sú iba v tomto zariadení a appka funguje aj offline.
          </p>
        </Card>

        <SectionTitle>Ako sa počíta</SectionTitle>
        <Card className="space-y-2 text-[15px] leading-relaxed">
          <p>
            <b>Objem série</b> = váha × opakovania.
          </p>
          <p>
            <b>Objem tréningu</b> = súčet objemu dokončených pracovných a drop sérií.{' '}
            <b>Zahrievacie série sa nezapočítavajú</b> – ani do objemu, ani do rekordov.
          </p>
          <p>
            <b>Odhadované 1RM</b> (Epley) = váha × (1 + opakovania / 30).
          </p>
          <p>
            <b>Osobný rekord</b> vznikne, keď dokončená pracovná séria prekoná doterajšie maximum cviku v váhe,
            odhadovanom 1RM alebo objeme série. Prvý zaznamenaný výkon je iba základ, nie rekord.
          </p>
          <p>
            <b>Najbližší tréning</b> je najbližší deň z týždenného plánu; bez plánu ďalšia rutina v poradí po naposledy
            odcvičenej.
          </p>
          <p>
            <b>Návrh váhy</b> (dvojitá progresia, rozsah 8–12 opakovaní): ak si minule v najťažšej sérii zvládol 12
            opakovaní, navrhne sa vyššia váha (o nastavený krok) na 8 opakovaní, inak rovnaká váha a o opakovanie viac.
            Je to len odporúčanie.
          </p>
          <p>
            <b>Synchronizácia</b> je súborová: exportuj zálohu na jednom zariadení, na druhom ju „Zlúč“. Novšie zmeny a
            zmazania vyhrávajú, nič sa nestratí. Nastavenia a rozpracovaný tréning ostávajú lokálne.
          </p>
        </Card>

        <SectionTitle>Licencie open-source dát</SectionTitle>
        <Card className="divide-y divide-line !p-0">
          {LICENSES.map(([n, l]) => (
            <div key={n} className="p-4">
              <p className="font-semibold">{n}</p>
              <p className="text-sm text-muted">{l}</p>
            </div>
          ))}
        </Card>
        <p className="mt-3 px-1 text-sm text-muted">
          Knižnica obsahuje {BUILTIN_EXERCISES.length} cvikov vybraných z Free Exercise DB. Aplikácia
          nepoužíva žiadne obrázky ani médiá tretích strán.
        </p>
      </div>
    </>
  );
}
