import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

/**
 * Reusable vitals trend line chart.
 *
 * Props:
 * - points: array of vitals entries (each with `recordedAt` + metric keys)
 * - series: [{ key, label, color }] — one line per entry
 * - unit:   string appended in tooltips (e.g. 'mmHg', 'kg')
 * - emptyHint: message shown when there is no data
 */
export default function VitalsTrendChart({ points = [], series = [], unit = '', emptyHint = 'No readings yet.' }) {
  const ref = useRef(null);
  useEffect(() => () => ref.current?.destroy?.(), []);

  const labels = points.map((p) =>
    new Date(p.recordedAt || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const hasData = points.length > 0 && series.some((s) => points.some((p) => p[s.key] != null));

  if (!hasData) {
    return <div className="h-48 flex items-center justify-center text-sm text-gray-400">{emptyHint}</div>;
  }

  const data = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: points.map((p) => (p[s.key] != null ? p[s.key] : null)),
      borderColor: s.color,
      backgroundColor: `${s.color}22`,
      fill: series.length === 1,
      tension: 0.35,
      spanGaps: true,
      pointBackgroundColor: s.color,
      pointRadius: 3,
      borderWidth: 2
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: series.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${unit ? ' ' + unit : ''}`
        }
      }
    },
    scales: {
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    }
  };

  return (
    <div className="h-48">
      <Line ref={ref} data={data} options={options} />
    </div>
  );
}
