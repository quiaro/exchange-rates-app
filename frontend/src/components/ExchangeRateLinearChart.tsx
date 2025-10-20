import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { DataPoint } from '../../../shared/interfaces';

interface ExchangeRateLinearChartProps {
  data: DataPoint[];
  color?: string;
}

export const ExchangeRateLinearChart: React.FC<
  ExchangeRateLinearChartProps
> = ({ data, color = '#61dafb' }) => {
  // Transform data for Nivo format
  const chartData = [
    {
      id: 'exchange-rate',
      data: data.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    },
  ];

  return (
    <div style={{ height: '120px', width: '100%' }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false,
        }}
        axisBottom={null}
        axisLeft={null}
        enablePoints={false}
        enableCrosshair={false}
        useMesh={true}
        colors={[color]}
        lineWidth={2}
        animate={true}
        motionConfig="gentle"
        tooltip={({ point }) => (
          <div
            style={{
              background: '#ffffff',
              padding: '8px 12px',
              borderRadius: '4px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              border: '1px solid #ddd',
              fontSize: '12px',
              color: '#333',
            }}
          >
            <div>
              <strong>Time:</strong>{' '}
              {new Date(point.data.x as number).toLocaleTimeString()}
            </div>
            <div>
              <strong>Price:</strong> {point.data.yFormatted}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default ExchangeRateLinearChart;
