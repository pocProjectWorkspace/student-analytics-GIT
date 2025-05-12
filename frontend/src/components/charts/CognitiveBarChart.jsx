// frontend/src/components/charts/CognitiveBarChart.jsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const CognitiveBarChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    if (!data || !data.domains || Object.keys(data.domains).length === 0) {
      return;
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    const domains = Object.keys(data.domains).map(key => data.domains[key].name || key.replace('_', ' '));
    const stanines = Object.keys(data.domains).map(key => data.domains[key].stanine);
    
    // Define colors based on stanine level
    const backgroundColors = stanines.map(stanine => {
      if (stanine <= 3) return 'rgba(255, 99, 132, 0.2)'; // Weakness
      if (stanine >= 7) return 'rgba(75, 192, 192, 0.2)'; // Strength
      return 'rgba(54, 162, 235, 0.2)'; // Average
    });
    
    const borderColors = stanines.map(stanine => {
      if (stanine <= 3) return 'rgb(255, 99, 132)'; // Weakness
      if (stanine >= 7) return 'rgb(75, 192, 192)'; // Strength
      return 'rgb(54, 162, 235)'; // Average
    });
    
    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: domains,
        datasets: [{
          label: 'Cognitive Abilities (Stanine)',
          data: stanines,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 9,
            ticks: {
              stepSize: 1
            },
            title: {
              display: true,
              text: 'Stanine (1-9)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Cognitive Domain'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const stanine = stanines[index];
                let level;
                
                if (stanine <= 3) level = 'Weakness';
                else if (stanine >= 7) level = 'Strength';
                else level = 'Average';
                
                return [
                  `Level: ${level}`,
                  `Stanine: ${stanine}/9`
                ];
              }
            }
          },
          annotation: {
            annotations: {
              weaknessLine: {
                type: 'line',
                yMin: 3.5,
                yMax: 3.5,
                borderColor: 'rgba(255, 99, 132, 0.5)',
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  content: 'Weakness Threshold',
                  enabled: true,
                  position: 'left'
                }
              },
              strengthLine: {
                type: 'line',
                yMin: 6.5,
                yMax: 6.5,
                borderColor: 'rgba(75, 192, 192, 0.5)',
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  content: 'Strength Threshold',
                  enabled: true,
                  position: 'left'
                }
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
  
  if (!data || !data.domains || Object.keys(data.domains).length === 0) {
    return <div className="no-data">No cognitive data available.</div>;
  }
  
  return (
    <div className="cognitive-chart-container">
      <canvas ref={chartRef}></canvas>
      {data.isFragileLearner && (
        <div className="fragile-learner-alert">
          This student is identified as a Fragile Learner based on cognitive profile
        </div>
      )}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color weakness"></span> Weakness (Stanine 1-3)
        </div>
        <div className="legend-item">
          <span className="legend-color average"></span> Average (Stanine 4-6)
        </div>
        <div className="legend-item">
          <span className="legend-color strength"></span> Strength (Stanine 7-9)
        </div>
      </div>
    </div>
  );
};

export default CognitiveBarChart;