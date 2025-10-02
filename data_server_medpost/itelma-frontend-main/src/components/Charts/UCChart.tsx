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

interface UCChartProps {
  data: { t: number; uc: number }[];
  height?: number;
  showZoomControls?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UCChart = forwardRef<any, UCChartProps>(({
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
                label: 'UC (мм рт. ст.)',
                data: data.map(p => ({ x: p.t, y: p.uc })),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
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
              y: { title: { display: true, text: 'мм рт. ст.' } },
            },
            animation: false,
          }}
        />
    </div>
  );
});

UCChart.displayName = 'UCChart';

export default UCChart;
