import { countUsage } from '../../data/everyday-repositories';
import type { Plantilla } from '../../domain/content/schemas';
import { Icon } from '../../ui/icons';
import { useToast } from '../../ui/use-toast';
import { downloadFile, XLSX_TYPE } from '../../ui/utils';
import { templateToCells } from './convert';

/** Downloads a template as a real .xlsx with its live formulas, without opening the lab first. */
export function TemplateDownloadButton({
  plantilla,
  compact = false,
}: {
  plantilla: Plantilla;
  compact?: boolean;
}) {
  const toast = useToast();
  const download = async () => {
    try {
      // The spreadsheet library is only downloaded when a student exports.
      const { exportXlsx } = await import('../../domain/sheet/xlsx');
      const bytes = exportXlsx(templateToCells(plantilla, 'en'), plantilla.formatos, 'en', plantilla.nombre);
      downloadFile(`abaco-${plantilla.id}.xlsx`, bytes as BlobPart, XLSX_TYPE);
      void countUsage('exportacion');
      toast.show('Plantilla descargada, con las fórmulas vivas.');
    } catch {
      toast.show('No se pudo crear el Excel de la plantilla.', 'error');
    }
  };
  return (
    <button
      type="button"
      onClick={() => void download()}
      className={compact ? 'btn btn-icon btn-ghost' : 'btn btn-ghost'}
      aria-label={compact ? `Descargar en Excel: ${plantilla.nombre}` : undefined}
    >
      <Icon name="download" size={18} />
      {compact ? null : 'Descargar Excel'}
    </button>
  );
}
