import { AUTHOR, type AuthorLink } from '../../config/author';
import { Icon } from '../../ui/icons';

const LINK_HINT: Record<AuthorLink['id'], string> = {
  github: 'Código de todos mis proyectos',
  linkedin: 'Experiencia y certificaciones',
  instagram: 'Lo que voy haciendo',
  portafolio: 'Proyectos, experiencia y contacto',
};

/** Author's social profiles and selected public projects. Plain outbound links: no embeds, widgets or trackers. */
export function AuthorPanel({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="space-y-8">
      <section aria-labelledby="autor-redes" className="space-y-4">
        <div>
          <H id="autor-redes" className="font-display text-2xl font-semibold">
            Visita mis otras redes y mis otros trabajos
          </H>
          <p className="mt-1 text-sm text-muted">
            Soy {AUTHOR.nombre}, {AUTHOR.rol.toLowerCase()}. Hice ÁBACO para que estudiar estas carreras sea más fácil.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {AUTHOR.redes.map((red) => (
            <li key={red.id}>
              <a href={red.url} target="_blank" rel="noopener noreferrer" className="card card-lift flex items-center gap-3 p-4">
                <span className="tile tile-sm shrink-0">
                  <Icon name={red.id === 'portafolio' ? 'globe' : red.id === 'github' ? 'lab' : red.id === 'linkedin' ? 'me' : 'sparkle'} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {red.nombre} <span className="font-normal text-muted">· {red.usuario}</span>
                  </span>
                  <span className="text-sm text-muted">{LINK_HINT[red.id]}</span>
                </span>
                <Icon name="external" size={18} className="text-muted" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="autor-proyectos" className="space-y-4">
        <H id="autor-proyectos" className="font-display text-2xl font-semibold">
          Estos son mis proyectos
        </H>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUTHOR.proyectos.map((p) => (
            <li key={p.nombre} className="card flex h-full flex-col gap-2 p-4">
              <span className="font-mono text-sm font-semibold text-red">{p.nombre}</span>
              <span className="text-sm text-ink-2">{p.descripcion}</span>
              <span className="text-xs text-muted">{p.tecnologias}</span>
              <span className="mt-auto flex flex-wrap gap-3 pt-1 text-sm">
                <a href={p.repositorio} target="_blank" rel="noopener noreferrer" className="link-red">
                  Ver el código<span className="sr-only"> de {p.nombre} (se abre en una pestaña nueva)</span>
                </a>
                {'demo' in p && p.demo ? (
                  <a href={p.demo} target="_blank" rel="noopener noreferrer" className="link-red">
                    Probarlo<span className="sr-only"> ({p.nombre}, se abre en una pestaña nueva)</span>
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <a href={AUTHOR.repositorios} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
          Ver todos mis repositorios <Icon name="external" size={18} />
        </a>
      </section>
    </div>
  );
}
