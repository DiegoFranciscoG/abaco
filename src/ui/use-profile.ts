import { useLiveQuery } from 'dexie-react-hooks';
import { getProfile } from '../data/repositories';
import { DEFAULT_PROFILE, type Perfil } from '../data/types';

/** Student profile from IndexedDB (only views that need it import Dexie). */
export function useProfile(): Perfil {
  return useLiveQuery(() => getProfile(), [], DEFAULT_PROFILE) ?? DEFAULT_PROFILE;
}
