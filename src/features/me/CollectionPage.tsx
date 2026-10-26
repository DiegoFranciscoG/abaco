import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { encodeCollectionLink, exportCollection } from '../../data/backup';
import { countUsage } from '../../data/everyday-repositories';
import { getDb } from '../../data/db';
import {
  deleteCollection,
  moveInCollection,
  removeFromCollection,
  updateCollection,
} from '../../data/repositories';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, EmptyState, PageHeader, Skeleton } from '../../ui/primitives';
import { downloadFile } from '../../ui/utils';
import { useToast } from '../../ui/use-toast';
import { COLOR_HEX } from './colors';

export default function CollectionPage() {
  const { coleccionId = '' } = useParams();
  const collection = useLiveQuery(() => getDb().colecciones.get(coleccionId), [coleccionId], null);
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useDocumentTitle(collection?.nombre ?? 'Colección');

  if (collection === null) return <Skeleton lines={3} />;
  if (collection === undefined)
    return (
      <EmptyState icon="folder" title="Esta colección no existe en este dispositivo">
        <AppLink to="/mi-espacio?tab=colecciones" className="link-red">
          Ver mis colecciones
        </AppLink>
      </EmptyState>
    );

  const share = async () => {
    const text = exportCollection(collection);
    const fileName = `coleccion-${collection.nombre
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .toLowerCase()
      .slice(0, 40)}.json`;
    const file = new File([text], fileName, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: collection.nombre });
        return;
      } catch {
        // The student cancelled the share sheet: fall back to download.
      }
    }
    downloadFile(fileName, text, 'application/json');
    void countUsage('coleccion-compartida');
    toast.show('Colección descargada: envíala a tu grupo y la pueden importar en Mi espacio');
  };

  const copyLink = async () => {
    const encoded = encodeCollectionLink(collection);
    if (!encoded) {
      toast.show('La colección es muy grande para un enlace: compártela como archivo.', 'info');
      return;
    }
    const url = `${location.origin}${location.pathname}#/coleccion-compartida?d=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      void countUsage('coleccion-compartida');
      toast.show('Enlace copiado: lleva la lista de la colección, sin tus apuntes.');
    } catch {
      toast.show('Tu navegador no permitió copiar el enlace.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        back={{ to: '/mi-espacio?tab=colecciones', label: 'Mis colecciones' }}
        eyebrow={`${collection.items.length} elementos`}
        title={
          <span className="flex items-center gap-3">
            <span className="h-8 w-2 rounded-full" style={{ background: COLOR_HEX[collection.color] }} />
            {collection.nombre}
          </span>
        }
        subtitle={collection.descripcion || undefined}
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setName(collection.nombre);
                setDescription(collection.descripcion);
                setEditing((v) => !v);
              }}
            >
              <Icon name="note" size={18} /> Editar
            </button>
            <button type="button" className="btn btn-soft" onClick={() => void share()}>
              <Icon name="upload" size={18} /> Compartir archivo
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void copyLink()}>
              <Icon name="copy" size={18} /> Copiar enlace
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                if (
                  !window.confirm(
                    `¿Eliminar la colección «${collection.nombre}»? Los elementos no se borran de ÁBACO.`,
                  )
                )
                  return;
                await deleteCollection(collection.id);
                toast.show('Colección eliminada');
                navigate('/mi-espacio?tab=colecciones');
              }}
            >
              <Icon name="trash" size={18} /> Eliminar
            </button>
          </>
        }
      />
      {editing ? (
        <form
          className="card mb-6 space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateCollection(collection.id, { nombre: name, descripcion: description });
              setEditing(false);
              toast.show('Colección actualizada');
            } catch (error) {
              toast.error(error);
            }
          }}
        >
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            aria-label="Nombre"
          />
          <textarea
            className="field min-h-20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            aria-label="Descripción"
            placeholder="Para qué es esta colección"
          />
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      ) : null}
      {collection.items.length === 0 ? (
        <EmptyState icon="folder" title="Colección vacía">
          Agrega fórmulas, subtemas o artículos con el botón «Colección».
        </EmptyState>
      ) : (
        <ol className="space-y-2">
          {collection.items.map((item, index) => (
            <li key={`${item.tipo}:${item.refId}`} className="card flex items-center gap-2 p-3">
              <span className="tnum w-7 text-center font-display text-lg font-semibold text-red">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                {item.ruta ? (
                  <AppLink to={item.ruta} className="font-semibold hover:text-red">
                    {item.titulo}
                  </AppLink>
                ) : item.snapshot ? (
                  <a
                    href={item.snapshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:text-red"
                  >
                    {item.titulo}
                  </a>
                ) : (
                  <span className="font-semibold">{item.titulo}</span>
                )}
                <span className="block text-xs text-muted">
                  {item.snapshot ? item.snapshot.cita : item.tipo}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-icon btn-ghost min-h-10 min-w-10 border-0"
                aria-label="Subir"
                disabled={index === 0}
                onClick={() => void moveInCollection(collection.id, index, index - 1)}
              >
                <Icon name="up" size={18} />
              </button>
              <button
                type="button"
                className="btn btn-icon btn-ghost min-h-10 min-w-10 border-0"
                aria-label="Bajar"
                disabled={index === collection.items.length - 1}
                onClick={() => void moveInCollection(collection.id, index, index + 1)}
              >
                <Icon name="down" size={18} />
              </button>
              <button
                type="button"
                className="btn btn-icon btn-ghost min-h-10 min-w-10 border-0"
                aria-label={`Quitar «${item.titulo}»`}
                onClick={() => void removeFromCollection(collection.id, item.tipo, item.refId)}
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
