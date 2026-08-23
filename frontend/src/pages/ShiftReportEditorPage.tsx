import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  FileDown,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import {
  warehouseShiftService,
  type WarehouseShiftSummary,
  type ShiftReportDraft,
} from '../api/services';
import {
  injectChartImages,
  renderPaceChartPng,
  renderTopPickersChartPng,
} from '../utils/reportCharts';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ShiftReportEditorPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shift, setShift] = useState<WarehouseShiftSummary | null>(null);
  const [draft, setDraft] = useState<ShiftReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exporting, setExporting] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const skipSave = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: { type: 'doc', content: [] },
    onUpdate: ({ editor: ed }) => {
      if (skipSave.current || !shiftId || !draft) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaveState('saving');
      saveTimer.current = window.setTimeout(async () => {
        try {
          const updated = await warehouseShiftService.saveReport(shiftId, {
            title: draft.title,
            contentJson: ed.getJSON() as Record<string, unknown>,
          });
          setDraft(updated);
          setSaveState('saved');
        } catch {
          setSaveState('idle');
        }
      }, 700);
    },
  });

  const applyContentWithCharts = useCallback(
    async (content: Record<string, unknown>, metricsShift: WarehouseShiftSummary) => {
      if (!editor) return content;
      let pace: string | null = null;
      let top: string | null = null;
      try {
        if (metricsShift.hourlyBuckets.length) {
          pace = await renderPaceChartPng(metricsShift.hourlyBuckets);
        }
        if (metricsShift.topPickers.length) {
          top = await renderTopPickersChartPng(metricsShift.topPickers);
        }
      } catch {
        /* charts optional */
      }
      const enriched = injectChartImages(content, pace, top);
      skipSave.current = true;
      editor.commands.setContent(enriched);
      queueMicrotask(() => {
        skipSave.current = false;
      });
      return enriched;
    },
    [editor]
  );

  useEffect(() => {
    if (!shiftId || !editor) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      skipSave.current = true;
      try {
        const [s, d] = await Promise.all([
          warehouseShiftService.get(shiftId),
          warehouseShiftService.getReport(shiftId),
        ]);
        if (cancelled) return;
        setShift(s);
        setDraft(d);
        const enriched = await applyContentWithCharts(d.contentJson, s);
        if (!cancelled) {
          const hasPlaceholder = JSON.stringify(d.contentJson).includes('[Діаграма');
          if (hasPlaceholder) {
            const saved = await warehouseShiftService.saveReport(shiftId, {
              title: d.title,
              contentJson: enriched,
            });
            if (!cancelled) setDraft(saved);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          skipSave.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shiftId, editor, applyContentWithCharts]);

  const handleReset = async () => {
    if (!shiftId || !shift || !editor) return;
    const d = await warehouseShiftService.resetReport(shiftId);
    setDraft(d);
    const enriched = await applyContentWithCharts(d.contentJson, shift);
    await warehouseShiftService.saveReport(shiftId, {
      title: d.title,
      contentJson: enriched,
    });
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    if (!shiftId || !editor || !draft) return;
    setExporting(format);
    try {
      const html = editor.getHTML();
      const blob = await warehouseShiftService.exportReport(shiftId, format, html, draft.title);
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'html';
      downloadBlob(blob, `${draft.title || 'shift-report'}.${ext}`);
    } finally {
      setExporting(null);
    }
  };

  if (!shiftId) {
    navigate('/reports');
    return null;
  }

  return (
    <div className="shift-report-editor">
      <header className="shift-report-editor-header">
        <div className="shift-report-editor-nav">
          <Link to="/reports" className="btn btn-ghost">
            <ArrowLeft size={16} />
            {t('shiftReports.backToList')}
          </Link>
          <div>
            <h1 className="page-title">{draft?.title || t('shiftReports.editorTitle')}</h1>
            {shift && (
              <p className="page-subtitle">
                {new Date(shift.startedAt).toLocaleString()} · {shift.wavesCompleted}{' '}
                {t('shiftReports.colWaves').toLowerCase()} · {shift.itemsPicked}{' '}
                {t('shiftReports.colPicked').toLowerCase()} · {shift.pickRatePerHour}/h
              </p>
            )}
          </div>
        </div>
        <div className="shift-report-editor-actions">
          <span className="save-indicator">
            {saveState === 'saving'
              ? t('shiftReports.saving')
              : saveState === 'saved'
                ? t('shiftReports.saved')
                : ''}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => void handleReset()}>
            <RotateCcw size={16} />
            {t('shiftReports.resetTemplate')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!!exporting}
            onClick={() => void handleExport('pdf')}
          >
            <FileDown size={16} />
            {t('shiftReports.exportPdf')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!!exporting}
            onClick={() => void handleExport('docx')}
          >
            {t('shiftReports.exportDocx')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!!exporting}
            onClick={() => void handleExport('html')}
          >
            {t('shiftReports.exportHtml')}
          </button>
        </div>
      </header>

      {loading || !editor ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="report-editor-toolbar" role="toolbar">
            <button
              type="button"
              className={editor.isActive('bold') ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              className={editor.isActive('italic') ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              type="button"
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Heading"
            >
              <Heading2 size={16} />
            </button>
            <button
              type="button"
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet list"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Ordered list"
            >
              <ListOrdered size={16} />
            </button>
          </div>
          <div className="report-editor-surface">
            <EditorContent editor={editor} />
          </div>
        </>
      )}
    </div>
  );
}
