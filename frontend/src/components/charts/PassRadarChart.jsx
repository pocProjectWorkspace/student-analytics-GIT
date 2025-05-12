import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function PassRadarChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    if (!data || !data.factors || data.factors.length === 0) {
      return;
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    // Extract data from factors
    const labels = data.factors.map(factor => factor.name);
    const percentiles = data.factors.map(factor => factor.percentile);
    
    // Risk level boundary lines
    const lowRiskLine = Array(labels.length).fill(40);
    const highStrengthLine = Array(labels.length).fill(70);
    
    // Create a color array based on risk levels
    const pointBackgroundColors = data.factors.map(factor => {
      if (factor.level === 'at-risk') return 'rgba(239, 83, 80, 0.8)'; // Red
      if (factor.level === 'strength') return 'rgba(102, 187, 106, 0.8)'; // Green
      return 'rgba(66, 165, 245, 0.8)'; // Blue for balanced
    });
    
    chartInstance.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'PASS Factors',
            data: percentiles,
            fill: true,
            backgroundColor: 'rgba(66, 165, 245, 0.2)',
            borderColor: 'rgba(66, 165, 245, 0.7)',
            pointBackgroundColor: pointBackgroundColors,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(66, 165, 245, 1)',
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Risk Threshold',
            data: lowRiskLine,
            fill: false,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(239, 83, 80, 0.7)',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 1
          },
          {
            label: 'Strength Threshold',
            data: highStrengthLine,
            fill: false,
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderColor: 'rgba(102, 187, 106, 0.7)',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 1
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              font: {
                size: 10
              }
            },
            pointLabels: {
              font: {
                size: 12
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function(context) {
                const factor = data.factors[context.dataIndex];
                return `Percentile: ${factor.percentile}%`;
              },
              afterLabel: function(context) {
                const factor = data.factors[context.dataIndex];
                return [
                  `Status: ${factor.level.toUpperCase()}`,
                  `${factor.description}`
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
  
  if (!data || !data.factors || data.factors.length === 0) {
    return <div className="no-data-chart">No PASS data available</div>;
  }
  
  return (
    <div className="chart-container" style={{ height: '100%', width: '100%' }}>
      <canvas ref={chartRef} />
    </div>
  );
}

export default PassRadarChart;