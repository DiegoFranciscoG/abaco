import { m } from 'motion/react';
import { lazy, Suspense, useState } from 'react';
import { getCarrera, getMateria } from '../../data/content';
import stats from '../../generated/stats.json';
import { AbacusArt, QuestionArt } from '../../ui/art';
import { useDocumentTitle, useReducedMotion } from '../../ui/hooks';
import { useProfile } from '../../ui/use-profile';
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
  const [webgl] = useState(webglAvailable);
  const can3D = webgl && !reduce;
  const [value, setValue] = useState(2026);

  // WebGL is loaded only when the student reaches for the abacus (hover, tap or keyboard focus):
  // the first view stays light on modest phones and the animated SVG is shown meanwhile.
  const activate = () => {
    if (can3D) setShow3D(true);
  };

  return (
    <div className="relative" onPointerEnter={activate} onPointerDown={activate} onFocus={activate}>
      <div className="relative aspect-[4/3] w-full">
        <AbacusArt
          value={value}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${show3D ? 'opacity-0' : 'opacity-100'}`}
        />
        {show3D ? (
          <Suspense fallback={null}>
            <m.div
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
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
        {show3D ? (
          <span className="hidden sm:inline">· toca una cuenta</span>
        ) : can3D ? (
          <button type="button" className="link-red min-h-11 px-1 text-sm" onClick={activate}>
            Ver en 3D
          </button>
        ) : null}
      </div>
    </div>
  );
}

const FEATURES: { to: string; icon: IconName; title: string; text: string; cta: string }[] = [
  {
    to: '/entregables',
    icon: 'ledger',
    title: 'Entregables',
    text: 'Rol de pagos, kardex, amortización, VAN y más: escribe tus datos y llévate el procedimiento paso a paso, en Excel o PDF.',
    cta: 'Resolver mi deber',
  },
  {
    to: '/enunciado',
    icon: 'search',
    title: 'Pega tu enunciado',
    text: 'Pega el texto de tu tarea y ÁBACO te dice qué tema, qué fórmula y qué herramienta aplican.',
    cta: '¿Qué tema es?',
  },
  {
    to: '/herramientas/notas',
    icon: 'target',
    title: '¿Cuánto necesito?',
    text: 'Con tus notas y los pesos de tu docente, cuánto necesitas en lo que falta para pasar.',
    cta: 'Calcular',
  },
  {
    to: '/cifras',
    icon: 'receipt',
    title: 'Ecuador en cifras',
    text: 'SBU, IESS, IVA, renta, retenciones, inflación y tasas, con su fuente oficial y su vigencia.',
    cta: 'Ver cifras',
  },
  {
    to: '/materias',
    icon: 'materias',
    title: 'Materias',
    text: `${stats.materias} materias con ${stats.subtemas} subtemas explicados; cada uno cita la sección exacta de su fuente.`,
    cta: 'Ver materias',
  },
  {
    to: '/estudiar',
    icon: 'cards',
    title: 'Área de estudio',
    text: 'Estudia una materia con su teoría y ejemplos, con tus propios PDF o con ambos: tarjetas para memorizar y exámenes de práctica.',
    cta: 'Empezar a estudiar',
  },
  {
    to: '/herramientas',
    icon: 'tools',
    title: 'Herramientas',
    text: 'Editor con fórmulas, libro diario, estadística, graficador, oferta y demanda, rol de pagos y más.',
    cta: 'Abrir herramientas',
  },
  {
    to: '/formulas',
    icon: 'formula',
    title: 'Fórmulas verificadas',
    text: `${stats.formulas} fórmulas con variables explicadas, ejemplo recalculado y sintaxis de Excel en español.`,
    cta: 'Buscar fórmula',
  },
  {
    to: '/laboratorio',
    icon: 'lab',
    title: 'Laboratorio',
    text: 'Una hoja de cálculo en tu teléfono: practica, comprueba y descarga el .xlsx.',
    cta: 'Abrir hoja',
  },
  {
    to: '/buscar',
    icon: 'book',
    title: 'Buscador académico',
    text: 'Artículos, tesis y libros de fuentes abiertas, con la referencia APA lista para copiar.',
    cta: 'Buscar artículos',
  },
  {
    to: '/practica',
    icon: 'target',
    title: 'Práctica',
    text: `${stats.ejercicios} ejercicios con respuesta verificable, pistas y tu historial de intentos.`,
    cta: 'Practicar',
  },
];

const FAQ = [
  {
    q: '¿Dónde se guardan mis apuntes?',
    a: 'Solo en este navegador, dentro de tu teléfono o computadora. No hay cuentas ni servidores: nadie más puede verlos. Por eso conviene descargar un respaldo desde Ajustes de vez en cuando.',
  },
  {
    q: '¿De dónde sale el contenido?',
    a: 'Las materias se eligieron por lo frecuentes que son en las carreras económicas y administrativas; ÁBACO no copia planes de estudio. Los temas, subtemas, fórmulas y ejercicios son redacción propia y cada uno cita su norma o libro de referencia. Cada ejemplo numérico se recalcula automáticamente antes de publicarse.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'Sí. Después de abrir ÁBACO una vez con conexión, las materias, las fórmulas, tus apuntes, el laboratorio y casi todas las herramientas funcionan sin internet. Solo el buscador académico, los datos macro y los tipos de cambio necesitan conexión.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'Nada. No hay pagos, suscripciones, publicidad ni cobros ocultos, y no hace falta crear una cuenta.',
  },
  {
    q: '¿ÁBACO es de mi universidad?',
    a: 'No. ÁBACO no está afiliado a ninguna universidad. Es una herramienta de estudio independiente que enlaza siempre a la fuente oficial.',
  },
];

function MySubjects() {
  const profile = useProfile();
  const mine = profile.materias.map(getMateria).filter((m) => m !== undefined);
  const carrera = profile.carrera ? getCarrera(profile.carrera) : undefined;
  const cycleLink = carrera
    ? `/materias?carrera=${carrera.id}${profile.ciclo ? `&ciclo=${profile.ciclo}` : ''}`
    : '/materias';
  if (mine.length > 0) {
    return (
      <div className="card p-5">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="eyebrow block">Mis materias</span>
          {carrera ? (
            <AppLink to={cycleLink} className="link-red text-sm">
              {carrera.nombre}
              {profile.ciclo ? ` · ${profile.ciclo}.º ciclo` : ''} →
            </AppLink>
          ) : null}
        </span>
        <ul className="mt-3 flex flex-wrap gap-2">
          {mine.map((m) => (
            <li key={m.id}>
              <AppLink to={`/materia/${m.id}`} className="chip min-h-10 hover:border-red hover:text-red">
                {m.nombre}
              </AppLink>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <AppLink to={cycleLink} className="card card-lift flex items-center gap-4 p-5">
      <span className="tile">
        <Icon name="materias" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow block">Empieza aquí</span>
        <span className="block font-display text-xl font-semibold">
          {carrera ? `Tus materias de ${carrera.nombre}` : 'Elige tu carrera y tu ciclo'}
        </span>
        <span className="text-sm text-muted">
          Marca las materias que llevas; se guardan solo en este dispositivo.
        </span>
      </span>
      <Icon name="arrow-right" className="text-red" />
    </AppLink>
  );
}

export default function HomePage() {
  useDocumentTitle('');
  return (
    <div className="space-y-16 md:space-y-24">
      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
        <div>
          <p className="eyebrow mb-4">Contabilidad · Finanzas · Economía · Administración</p>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4.4rem)] leading-[0.98] font-semibold tracking-tight">
            Tus materias, tema por tema.
            <br />
            <span className="text-red">Tus fórmulas</span> verificadas.
            <br />
            Tus apuntes, en tu bolsillo.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Para estudiantes de carreras económicas y administrativas en Ecuador. Sin registrarte, sin
            servidores y sin costo: lo que escribes se queda en tu dispositivo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <AppLink to="/entregables" className="btn btn-primary">
              Resolver mi deber <Icon name="arrow-right" size={18} />
            </AppLink>
            <AppLink to="/materias" className="btn btn-ghost">
              <Icon name="materias" size={18} /> Ver materias
            </AppLink>
            <AppLink to="/herramientas" className="btn btn-ghost">
              <Icon name="tools" size={18} /> Herramientas
            </AppLink>
          </div>
          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {[
              [String(stats.materias), 'materias'],
              [String(stats.subtemas), 'subtemas'],
              [String(stats.formulas), 'fórmulas'],
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
          <MySubjects />
          <p className="text-muted md:text-right">
            Todo está ordenado de lo general a lo particular: materia → tema → subtema, con herramientas para
            practicar cada uno.
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
                  <span className="link-red mt-auto text-sm">{f.cta} →</span>
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
              <Accordion
                key={item.q}
                title={item.q}
                defaultOpen={false}
                id={i === 0 ? 'faq-datos' : undefined}
              >
                <p className="leading-relaxed text-muted">{item.a}</p>
              </Accordion>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
