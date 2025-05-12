// components/RadarChart.jsx - Visualization component for PASS data
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function RadarChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.factors.map(factor => factor.name),
        datasets: [{
          label: 'Student Profile',
          data: data.factors.map(factor => factor.percentile),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: data.factors.map(factor => {
            if (factor.percentile < 45) return 'rgb(255, 99, 132)';
            if (factor.percentile >= 65) return 'rgb(75, 192, 192)';
            return 'rgb(255, 205, 86)';
          }),
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        scales: {
          r: {
            angleLines: {
              display: true
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const factor = data.factors[index];
                return [
                  `Status: ${factor.percentile < 45 ? 'At Risk' : factor.percentile >= 65 ? 'Strength' : 'Balanced'}`,
                  factor.description
                ];
              }
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);
  
  return (
    <div className="radar-chart-container">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

export default RadarChart;
