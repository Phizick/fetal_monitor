import { forwardRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, Legend, TimeScale, zoomPlugin);

interface MedicationsChartProps {
  data: { t: number; medications: string[] }[];
  height?: number;
  showZoomControls?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MedicationsChart = forwardRef<any, MedicationsChartProps>(({
  data,
  height = 120,
  showZoomControls = false,
}, ref) => {
  const unique = Array.from(new Set(data.flatMap(p => p.medications)));
  const chartHeight = Math.max(height, unique.length * 40);
  const palette = [
    'rgba(255, 159, 64, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)', 
    'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(83, 102, 255, 1)', 'rgba(199, 199, 199, 1)'
  ];

  return (
    <div style={{ height: chartHeight }}>
      <Line
          ref={ref}
          data={{
            datasets: unique.map((label, idx) => ({
              label,
              data: data.map(p => ({ x: p.t, y: p.medications.includes(label) ? idx + 1 : null })),
              borderColor: palette[idx % palette.length],
              backgroundColor: 'transparent',
              fill: false,
              pointRadius: 0,
              borderWidth: 3,
              tension: 0,
            }))
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: 'bottom' },
              tooltip: { enabled: true },
              ...(showZoomControls && {
                zoom: {
                  zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
                  pan: { enabled: true, mode: 'x' },
                }
              })
            },
            scales: {
              x: { type: 'time', time: { displayFormats: { second: 'HH:mm:ss' } } },
              y: {
                title: { display: false, text: '' },
                min: 0,
                max: Math.max(1, unique.length + 1),
                ticks: { display: false },
                grid: { display: false },
              },
            },
            animation: false,
          }}
        />
    </div>
  );
});

MedicationsChart.displayName = 'MedicationsChart';

export default MedicationsChart;
