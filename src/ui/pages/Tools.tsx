import { Card, Spinner } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { PlateCalculator } from '../components/PlateCalculator';
import { useSettings } from '../hooks/data';

export function ToolsPage() {
  const settings = useSettings();
  return (
    <>
      <PageHeader title="Kalkulačka kotúčov" back="/nastavenia" />
      <div className="px-4 pb-8">{settings ? <Card><PlateCalculator settings={settings} /></Card> : <Spinner />}</div>
    </>
  );
}
