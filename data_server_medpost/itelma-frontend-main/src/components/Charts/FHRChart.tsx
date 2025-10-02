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

interface FHRChartProps {
  data: { t: number; fhr: number }[];
  height?: number;
  showZoomControls?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FHRChart = forwardRef<any, FHRChartProps>(({
  data,
  height = 320,
  showZoomControls = false,
}, ref) => {
  return (
    <div style={{ height }}>
      <Line
          ref={ref}
          data={{
            datasets: [
              {
                label: 'FHR (bpm)',
                data: data.map(p => ({ x: p.t, y: p.fhr })),
                borderColor: 'rgba(115, 252, 142, 1)',
                backgroundColor: 'rgba(115, 252, 142, 0.1)',
                fill: false,
                pointRadius: 0,
                borderWidth: 1.5,
                tension: 0.2,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
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
              y: { title: { display: true, text: 'bpm' } },
            },
            animation: false,
          }}
        />
    </div>
  );
});

FHRChart.displayName = 'FHRChart';

export default FHRChart;
