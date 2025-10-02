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

interface DecelChartProps {
  data: { t: number; decel: boolean }[];
  height?: number;
  showZoomControls?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DecelChart = forwardRef<any, DecelChartProps>(({
  data,
  height = 120,
  showZoomControls = false,
}, ref) => {
  return (
    <div style={{ height }}>
      <Line
          ref={ref}
          data={{
            datasets: [
              {
                label: 'Decelerations',
                data: data.map(p => ({ x: p.t, y: p.decel ? 1 : null })),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                fill: false,
                tension: 0,
                borderWidth: 3,
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
              y: {
                title: { display: false, text: '' },
                min: 0,
                max: 1.1,
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

DecelChart.displayName = 'DecelChart';

export default DecelChart;
