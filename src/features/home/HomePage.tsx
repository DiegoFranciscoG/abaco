import { m } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { carreras, getCarrera, universidades } from '../../data/content';
import { updateProfile } from '../../data/repositories';
import { AbacusArt, QuestionArt } from '../../ui/art';
import { useDocumentTitle, useProfile, useReducedMotion } from '../../ui/hooks';
import { Icon, type IconName } from '../../ui/icons';
import { Accordion, AppLink, TiltCard } from '../../ui/primitives';

const Abacus3D = lazy(() => import('../../ui/three/Abacus3D'));

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function HeroAbacus() {
  const reduce = useReducedMotion();
  const [show3D, setShow3D] = useState(false);
  const [value, setValue] = useState(2026);

  useEffect(() => {
    if (reduce || !webglAvailable()) return;
    // The 3D scene is downloaded only after the page is usable.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(() => setShow3D(true), { timeout: 2500 }) : undefined;
      if (idle === undefined) setShow3D(true);
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
    };
  }, [reduce]);

  return (
    <div className="relative">
      <div className="relative aspect-[4/3] w-full">
        <AbacusArt value={value} className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${show3D ? 'opacity-0' : 'opacity-100'}`} />
        {show3D ? (
          <Suspense fallback={null}>
            <m.div className="absolute inset-0" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <Abacus3D initialValue={value} onValueChange={setValue} />
            </m.div>
          </Suspense>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-sm text-muted">
        <span>El ábaco marca</span>
        <m.output
          key={value}
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="tnum font-display rounded-lg bg-surface px-2.5 py-0.5 text-xl font-semibold text-red shadow-sm"
          aria-live="polite"
        >
          {value}
        </m.output>
        <span className="hidden sm:inline">{show3D ? '· toca una cuenta' : ''}</span>
      </div>
    </div>
  );
}

const FEATURES: { to: string; icon: IconName; title: string; text: string; cta: string }[] = [
  { to: '/carreras', icon: 'mallas', title: 'Mallas reales', text: '13 carreras de la UCuenca y la Católica, ciclo por ciclo, con enlace a la fuente oficial.', cta: 'Ver mallas' },
  { to: '/formulas', icon: 'formula', title: 'Fórmulas verificadas', text: '84 fórmulas con variables explicadas, ejemplo resuelto y sintaxis de Excel en español.', cta: 'Buscar fórmula' },
  { to: '/laboratorio', icon: 'lab', title: 'Laboratorio', text: 'Una hoja de cálculo en tu teléfono: practica, comprueba y descarga el .xlsx.', cta: 'Abrir hoja' },
  { to: '/buscar', icon: 'book', title: 'Buscador académico', text: 'Artículos y tesis de Crossref, OpenAlex, DOAJ y LA Referencia, con cita APA lista.', cta: 'Buscar artículos' },
  { to: '/practica', icon: 'target', title: 'Práctica', text: 'Ejercicios con respuesta verificable, pistas y tu historial de intentos.', cta: 'Practicar' },
  { to: '/comparar', icon: 'compare', title: 'Comparador', text: 'Pon dos mallas lado a lado y mira qué asignaturas comparten.', cta: 'Comparar' },
];

const FAQ = [
  {
    q: '¿Dónde se guardan mis apuntes?',
    a: 'Solo en este navegador, dentro de tu teléfono o computadora. No hay cuentas ni servidores: nadie más puede verlos. Por eso conviene descargar un respaldo desde Ajustes de vez en cuando.',
  },
  {
    q: '¿De dónde sale el contenido?',
    a: 'Las mallas se copiaron de las páginas oficiales de cada carrera (con enlace y fecha). Las fórmulas, temas y ejercicios son redacción propia y cada ficha cita su norma o libro de referencia. Cada ejemplo numérico se recalcula automáticamente antes de publicarse.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'Sí. Después de abrir ÁBACO una vez con conexión, las mallas, las fórmulas, tus apuntes y el laboratorio funcionan sin internet. Solo el buscador académico necesita conexión.',
  },
  {
    q: '¿ÁBACO es de mi universidad?',
    a: 'No. ÁBACO no está afiliado a ninguna universidad. Es una herramienta de estudio independiente que enlaza siempre a la fuente oficial.',
  },
];

function MyCareer() {
  const profile = useProfile();
  const carrera = profile.carrera ? getCarrera(profile.carrera) : undefined;
  if (carrera) {
    return (
      <AppLink to={`/carrera/${carrera.id}`} className="card card-lift flex items-center gap-4 p-5">
        <span className="tile">
          <Icon name="mallas" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">Tu malla</span>
          <span className="block truncate font-display text-xl font-semibold">{carrera.nombre}</span>
          <span className="text-sm text-muted">
            {universidades.find((u) => u.id === carrera.universidad)?.siglas}
            {profile.ciclo ? ` · ciclo ${profile.ciclo}` : ''}
          </span>
        </span>
        <Icon name="arrow-right" className="text-red" />
      </AppLink>
    );
  }
  return (
    <div className="card p-5">
      <label htmlFor="carrera-rapida" className="eyebrow block">
        Empieza por tu carrera
      </label>
      <select
        id="carrera-rapida"
        className="field mt-3"
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          const c = getCarrera(id);
          if (c) void updateProfile({ carrera: id, universidad: c.universidad });
        }}
      >
        <option value="" disabled>
          Elige tu carrera…
        </option>
        {universidades.map((u) => (
          <optgroup key={u.id} label={u.nombre}>
            {carreras
              .filter((c) => c.universidad === u.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-2 text-xs text-muted">Se guarda solo en este dispositivo.</p>
    </div>
  );
}

export default function HomePage() {
  useDocumentTitle('');
  const totalSubjects = carreras.reduce((acc, c) => acc + c.asignaturas_listadas, 0);
  return (
    <div className="space-y-16 md:space-y-24">
      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
        <div className="rise">
          <p className="eyebrow mb-4">Contabilidad · Finanzas · Economía · Administración</p>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4.4rem)] leading-[0.98] font-semibold tracking-tight">
            Tu malla real.
            <br />
            <span className="text-red">Tus fórmulas</span> verificadas.
            <br />
            Tus apuntes, en tu bolsillo.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Para estudiantes del área económica y administrativa de Cuenca. Sin registrarte, sin servidores y sin costo:
            lo que escribes se queda en tu teléfono.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <AppLink to="/carreras" className="btn btn-primary">
              Ver mi malla <Icon name="arrow-right" size={18} />
            </AppLink>
            <AppLink to="/laboratorio" className="btn btn-ghost">
              <Icon name="lab" size={18} /> Abrir el laboratorio
            </AppLink>
          </div>
          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {[
              [String(carreras.length), 'carreras'],
              [String(totalSubjects), 'asignaturas'],
              ['84', 'fórmulas'],
            ].map(([n, label]) => (
              <div key={label} className="border-l-2 border-red pl-3">
                <dt className="sr-only">{label}</dt>
                <dd className="tnum font-display text-3xl font-semibold">{n}</dd>
                <dd className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroAbacus />
      </section>

      <section aria-labelledby="accesos">
        <h2 id="accesos" className="sr-only">
          Accesos
        </h2>
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1.4fr] md:items-end">
          <MyCareer />
          <p className="text-muted md:text-right">
            Todo está ordenado como en tu universidad: carrera → ciclo → asignatura → tema → subtema.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {FEATURES.map((f, i) => (
            <li key={f.to} className="rise" style={{ animationDelay: `${80 + i * 50}ms` }}>
              <AppLink to={f.to} className="block h-full">
                <TiltCard className="flex flex-col items-center gap-2 px-4 pt-0 pb-5 text-center md:items-start md:px-6 md:text-left">
                  <span className="tile -mt-px rounded-t-none">
                    <Icon name={f.icon} />
                  </span>
                  <span className="mt-1 font-semibold text-ink md:text-lg">{f.title}</span>
                  <span className="hidden text-sm leading-relaxed text-muted md:block">{f.text}</span>
                  <span className="link-red mt-auto text-sm">
                    {f.cta} →
                  </span>
                </TiltCard>
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq" className="pb-4">
        <div className="mx-auto mb-10 h-px w-40 bg-line-strong" />
        <h2 id="faq" className="mb-8 text-center font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold">
          Preguntas frecuentes
        </h2>
        <div className="grid items-center gap-8 md:grid-cols-[1fr_1.3fr]">
          <div className="card hidden overflow-hidden bg-red-tint p-6 md:block">
            <QuestionArt className="w-full" />
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <Accordion key={item.q} title={item.q} defaultOpen={false} id={i === 0 ? 'faq-datos' : undefined}>
                <p className="leading-relaxed text-muted">{item.a}</p>
              </Accordion>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
