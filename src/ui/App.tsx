import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ensureSeeded } from '../db/repo';
import { Spinner } from './components/basic';
import { useSettings } from './hooks/data';
import { Layout } from './Layout';
import { About } from './pages/About';
import { BodyPage } from './pages/Body';
import { CalendarPage } from './pages/Calendar';
import { StatsPage } from './pages/Stats';
import { ToolsPage } from './pages/Tools';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { ExerciseForm } from './pages/ExerciseForm';
import { Exercises } from './pages/Exercises';
import { HistoryDetail } from './pages/HistoryDetail';
import { HistoryPage } from './pages/History';
import { Home } from './pages/Home';
import { MobilePreview } from './pages/MobilePreview';
import { RoutineEdit } from './pages/RoutineEdit';
import { SettingsPage } from './pages/Settings';
import { WorkoutPage } from './pages/Workout';
import { WorkoutProvider } from './WorkoutContext';

function ThemeSync() {
  const settings = useSettings();
  useEffect(() => {
    if (!settings) return;
    const light = settings.theme === 'light';
    document.documentElement.classList.toggle('light', light);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f4f5f8' : '#08080a');
    try {
      localStorage.setItem('theme', settings.theme);
    } catch {
      /* úložisko nemusí byť dostupné */
    }
  }, [settings]);
  return null;
}

export function App() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div className="mx-auto max-w-md p-6 pt-20 text-center">
        <p className="mb-2 text-xl font-bold">Úložisko nie je dostupné</p>
        <p className="text-muted">
          Aplikácia potrebuje lokálne úložisko prehliadača (IndexedDB). Vypni súkromné okno alebo povoľ ukladanie
          dát pre túto stránku a načítaj ju znova.
        </p>
      </div>
    );
  }
  if (!ready) return <Spinner />;

  return (
    <WorkoutProvider>
      <HashRouter>
        <ThemeSync />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="trening" element={<WorkoutPage />} />
            <Route path="rutiny/:id" element={<RoutineEdit />} />
            <Route path="historia" element={<HistoryPage />} />
            <Route path="historia/kalendar" element={<CalendarPage />} />
            <Route path="historia/statistiky" element={<StatsPage />} />
            <Route path="historia/:id" element={<HistoryDetail />} />
            <Route path="telo" element={<BodyPage />} />
            <Route path="kotuce" element={<ToolsPage />} />
            <Route path="cviky" element={<Exercises />} />
            <Route path="cviky/novy" element={<ExerciseForm />} />
            <Route path="cviky/:id" element={<ExerciseDetail />} />
            <Route path="cviky/:id/upravit" element={<ExerciseForm />} />
            <Route path="nastavenia" element={<SettingsPage />} />
            <Route path="nastavenia/o-aplikacii" element={<About />} />
            <Route path="nahlad" element={<MobilePreview />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </WorkoutProvider>
  );
}
