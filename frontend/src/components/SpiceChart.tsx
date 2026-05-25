// @ts-nocheck
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SpiceChartProps {
  data: {
    name: string;
    type: string;
    values: number[];
  }[];
}

const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export default function SpiceChart({ data }: SpiceChartProps) {
  if (!data || data.length === 0) return null;

  // Find the 'time' or primary X-axis array
  const timeSeries = data.find((d) => d.name === 'time' || d.type === 'time');
  const labels = timeSeries ? timeSeries.values : data[0].values;

  // Filter out the X-axis for the datasets
  const dataSeries = data.filter((d) => d.name !== 'time' && d.type !== 'time');

  const chartData = {
    labels: labels.map((v) => Number(v).toExponential(2)),
    datasets: dataSeries.map((series, idx) => ({
      label: series.name,
      data: series.values,
      borderColor: COLORS[idx % COLORS.length],
      backgroundColor: COLORS[idx % COLORS.length],
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 10,
      tension: series.type === 'digital' ? 0 : 0.1,
      stepped: series.type === 'digital' ? true : false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          color: '#9ca3af', // gray-400
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // gray-900
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)', // gray-400 with opacity
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 10,
        },
        title: {
          display: true,
          text: timeSeries ? 'Time (s)' : 'Index',
          color: '#6b7280', // gray-500
        },
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
        title: {
          display: true,
          text: 'Magnitude (V / A)',
          color: '#6b7280',
        },
      },
    },
  };

  return (
    <div className="w-full h-full relative p-2">
      <Line data={chartData} options={options} />
    </div>
  );
}
