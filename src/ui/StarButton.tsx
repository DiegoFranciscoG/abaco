import { useLiveQuery } from 'dexie-react-hooks';
import { m } from 'motion/react';
import { isStarred, toggleStar, type StarInput } from '../data/repositories';
import { Icon } from './icons';
import { useToast } from './use-toast';

export function StarButton({ star, compact = false }: { star: StarInput; compact?: boolean }) {
  const toast = useToast();
  const starred = useLiveQuery(() => isStarred(star.tipo, star.refId), [star.tipo, star.refId], false);
  const onClick = async () => {
    try {
      const now = await toggleStar(star);
      toast.show(now ? 'Marcado con estrella' : 'Estrella quitada');
    } catch (error) {
      toast.error(error);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={starred}
      aria-label={starred ? `Quitar estrella de ${star.titulo}` : `Marcar con estrella ${star.titulo}`}
      className={`btn ${compact ? 'btn-icon' : ''} ${starred ? 'btn-soft' : 'btn-ghost'}`}
    >
      <m.span
        key={String(starred)}
        initial={{ scale: 0.6, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 18 }}
      >
        <Icon name={starred ? 'star-filled' : 'star'} size={19} className={starred ? 'text-gold' : ''} />
      </m.span>
      {compact ? null : <span>{starred ? 'Importante' : 'Marcar'}</span>}
    </button>
  );
}
