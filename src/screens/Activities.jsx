import { Navigate, useSearchParams } from 'react-router-dom';
import { DailyGroundingTools } from '../components/games/DailyGroundingTools';
import { SmallWonders } from '../components/games/SmallWonders';
import { todayKey } from '../utils/journalUtils';

export function Activities({ nav, privateStorage }) {
  const [searchParams] = useSearchParams();
  const tool = searchParams.get('tool');
  const today = todayKey();

  if (!['breathing', 'senses', 'scavenger'].includes(tool)) {
    return <Navigate to="/explore" replace />;
  }

  return (
    <section className="screen app-screen activities-screen focused-pause">
      {nav}
      {tool === 'scavenger'
        ? <SmallWonders key={`${privateStorage.ownerId}:${today}`} today={today} privateStorage={privateStorage} />
        : <DailyGroundingTools todayKey={todayKey} selectedTool={tool} focusActiveTool active privateStorage={privateStorage} />}
    </section>
  );
}
