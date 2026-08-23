import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';
import type { WarehouseShiftBucket, WarehouseShiftTopPicker } from '../api/services';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

function canvasToPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

export async function renderPaceChartPng(buckets: WarehouseShiftBucket[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 280;
  const labels = buckets.map((b) => {
    const d = new Date(b.time);
    return Number.isNaN(d.getTime())
      ? b.time.slice(11, 16)
      : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  });

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Picked',
          data: buckets.map((b) => b.picked),
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
        },
        {
          label: 'Inbound',
          data: buckets.map((b) => b.inbound),
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: false, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true },
      },
    },
  });
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  const png = canvasToPng(canvas);
  chart.destroy();
  return png;
}

export async function renderTopPickersChartPng(pickers: WarehouseShiftTopPicker[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 280;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: pickers.map((p) => p.name),
      datasets: [
        {
          label: 'Items',
          data: pickers.map((p) => p.items),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  const png = canvasToPng(canvas);
  chart.destroy();
  return png;
}

type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: unknown[];
};

function nodeText(node: TipTapNode): string {
  if (node.text) return node.text;
  return (node.content || []).map(nodeText).join('');
}

function imageNode(src: string, alt: string): TipTapNode {
  return { type: 'image', attrs: { src, alt } };
}

/** Replace chart placeholder paragraphs with PNG images. */
export function injectChartImages(
  doc: Record<string, unknown>,
  pacePng: string | null,
  topPng: string | null
): Record<string, unknown> {
  const root = JSON.parse(JSON.stringify(doc)) as TipTapNode;
  if (!root.content) return doc;

  root.content = root.content.flatMap((node) => {
    if (node.type !== 'paragraph') return [node];
    const text = nodeText(node);
    if (pacePng && text.includes('[Діаграма темпу]')) {
      return [imageNode(pacePng, 'Pace chart')];
    }
    if (topPng && text.includes('[Діаграма топ')) {
      return [imageNode(topPng, 'Top pickers chart')];
    }
    return [node];
  });

  return root as unknown as Record<string, unknown>;
}
