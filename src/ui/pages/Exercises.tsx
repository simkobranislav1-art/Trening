import { Link, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '../components/basic';
import { ExerciseBrowser } from '../components/ExerciseBrowser';
import { PageHeader } from '../components/PageHeader';
import { useLibrary } from '../hooks/data';

export function Exercises() {
  const lib = useLibrary();
  const nav = useNavigate();
  return (
    <>
      <PageHeader
        title="Cviky"
        action={
          <Link to="/cviky/novy">
            <Button variant="primary" small tabIndex={-1}>
              + Vlastný
            </Button>
          </Link>
        }
      />
      <div className="px-4 pb-6">
        {!lib ? (
          <Spinner />
        ) : (
          <ExerciseBrowser exercises={lib.all} hiddenIds={lib.hidden} onPick={(e) => nav(`/cviky/${encodeURIComponent(e.id)}`)} />
        )}
      </div>
    </>
  );
}
