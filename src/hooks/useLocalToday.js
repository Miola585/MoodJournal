import { useEffect, useState } from 'react';
import { todayKey } from '../utils/journalUtils.js';

export function useLocalToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      setToday(todayKey());
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 20);
      timer = setTimeout(refresh, Math.max(20, midnight.getTime() - Date.now()));
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return today;
}
