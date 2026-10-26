import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { decodeCollectionLink, saveSharedCollection, type SharedCollection } from '../../data/backup';
import { useDocumentTitle } from '../../ui/hooks';
import { Icon } from '../../ui/icons';
import { AppLink, EmptyState, PageHeader } from '../../ui/primitives';
import { useToast } from '../../ui/use-toast';

function decode(param: string | null): SharedCollection['coleccion'] | Error {
  if (!param) return new Error('Este enlace no trae ninguna colección.');
  try {
    return decodeCollectionLink(param);
  } catch (error) {
    return error instanceof Error ? error : new Error('El enlace no se pudo leer.');
  }
}

/** Opens a collection shared by link: its list is inside the link, nothing is downloaded from a server. */
export default function SharedCollectionPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const data = decode(params.get('d'));
  useDocumentTitle(data instanceof Error ? 'Colección compartida' : data.nombre);
  if (data instanceof Error) {
    return (
      <EmptyState icon="folder" title="No se pudo abrir la colección">
        <p className="text-sm text-muted">{data.message}</p>
        <AppLink to="/mi-espacio?tab=colecciones" className="link-red">
          Ver mis colecciones
        </AppLink>
      </EmptyState>
    );
  }
  const save = async () => {
    setSaving(true);
    try {
      const id = await saveSharedCollection(data);
      toast.show('Colección guardada en este dispositivo');
      navigate(`/coleccion/${id}`);
    } catch (error) {
      toast.error(error);
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Colección compartida · ${data.items.length} elementos`}
        title={data.nombre}
        subtitle={
          data.descripcion ||
          'Alguien de tu grupo te compartió esta lista. Guárdala para tenerla en Mi espacio.'
        }
        actions={
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            <Icon name="plus" size={18} /> Guardar en mis colecciones
          </button>
        }
      />
      <ul className="space-y-2">
        {data.items.map((item, i) => (
          <li key={`${item.tipo}-${item.refId}-${i}`} className="card p-4">
            {item.ruta ? (
              <AppLink to={item.ruta} className="font-semibold text-ink hover:text-red">
                {item.titulo}
              </AppLink>
            ) : (
              <span className="font-semibold">{item.titulo}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        La colección viaja dentro del enlace: no lleva apuntes, fechas ni datos del teléfono de quien la
        compartió.
      </p>
    </div>
  );
}
