import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { getProfile } from '../data/repositories';
import { setDisplayPrefs } from '../ui/display-prefs';
import { Onboarding } from './Onboarding';

/** Copies theme and motion from the stored profile into the first-paint cache (also after a restore). */
function PreferencesSync() {
  const profile = useLiveQuery(() => getProfile(), []);
  const tema = profile?.tema;
  const movimiento = profile?.movimiento;
  useEffect(() => {
    if (tema && movimiento) setDisplayPrefs({ tema, movimiento });
  }, [tema, movimiento]);
  return null;
}

/** Everything in the shell that needs IndexedDB, loaded after the first paint. */
export default function DeviceLayer() {
  return (
    <>
      <PreferencesSync />
      <Onboarding />
    </>
  );
}
