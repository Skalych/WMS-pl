/** Open browser print dialog with a sheet of container barcode labels. */
export function printContainerLabels(barcodes: string[], documentTitle: string): void {
  if (barcodes.length === 0) return;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) return;

  const labelCells = barcodes
    .map(
      (barcode) => `
        <div class="label-cell">
          <div class="label-code">${barcode}</div>
        </div>
      `,
    )
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .meta {
      padding: 12px 16px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      border-bottom: 1px solid #ddd;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 12px;
    }
    .label-cell {
      border: 2px dashed #333;
      border-radius: 6px;
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
    }
    .label-code {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    @media print {
      .meta { display: none; }
      .sheet { gap: 4px; padding: 0; }
      .label-cell { border-style: solid; min-height: 64px; }
    }
  </style>
</head>
<body>
  <div class="meta">${documentTitle} · ${barcodes.length} labels · ${barcodes[0]} – ${barcodes[barcodes.length - 1]}</div>
  <div class="sheet">${labelCells}</div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}
