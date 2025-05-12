// frontend/src/components/charts/AcademicChart.jsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const AcademicChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    if (!data || !data.subjects || Object.keys(data.subjects).length === 0) {
      return;
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    const subjects = Object.keys(data.subjects);
    const internalStanines = subjects.map(subject => data.subjects[subject].stanine);
    const assetStanines = subjects.map(subject => data.subjects[subject].asset_stanine || null);
    const cat4Stanines = subjects.map(subject => data.subjects[subject].cat4_stanine || null);
    
    // Define colors for each dataset
    const internalColor = 'rgba(54, 162, 235, 0.7)';
    const assetColor = 'rgba(255, 159, 64, 0.7)';
    const cat4Color = 'rgba(75, 192, 192, 0.7)';
    
    // Create datasets
    const datasets = [
      {
        label: 'Internal Stanine',
        data: internalStanines,
        backgroundColor: internalColor,
        borderColor: internalColor.replace('0.7', '1'),
        borderWidth: 1
      }
    ];
    
    // Add Asset stanines if available
    if (assetStanines.some(score => score !== null)) {
      datasets.push({
        label: 'Asset Stanine',
        data: assetStanines,
        backgroundColor: assetColor,
        borderColor: assetColor.replace('0.7', '1'),
        borderWidth: 1
      });
    }
    
    // Add CAT4 stanines if available
    if (cat4Stanines.some(score => score !== null)) {
      datasets.push({
        label: 'CAT4 Stanine',
        data: cat4Stanines,
        backgroundColor: cat4Color,
        borderColor: cat4Color.replace('0.7', '1'),
        borderWidth: 1
      });
    }
    
    // Create comparison indicators
    const comparisonLabels = subjects.map(subject => {
      const comparison = data.subjects[subject].comparison;
      if (comparison && comparison.includes('Below Expected')) return '↓';
      if (comparison && comparison.includes('Better Than Expected')) return '↑';
      return '';
    });
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: subjects,
        datasets: datasets
      },
      options: {
        responsive: true,
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
              text: 'Subject'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const index = context.dataIndex;
                const subject = subjects[index];
                const subjectData = data.subjects[subject];
                
                return [
                  `Internal Stanine: ${subjectData.stanine}`,
                  subjectData.asset_stanine ? `Asset Stanine: ${subjectData.asset_stanine}` : '',
                  subjectData.cat4_stanine ? `CAT4 Stanine: ${subjectData.cat4_stanine}` : '',
                  `Comparison: ${subjectData.comparison || 'Not Available'}`
                ].filter(line => line !== '');
              }
            }
          },
          legend: {
            position: 'top',
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
  
  if (!data || !data.subjects || Object.keys(data.subjects).length === 0) {
    return <div className="no-data">No academic data available.</div>;
  }
  
  return (
    <div className="academic-chart-container">
      <canvas ref={chartRef}></canvas>
      <div className="chart-legend">
        <div className="comparison-legend">
          <div className="legend-item">
            <span className="legend-marker below">↓</span> Below Expected
          </div>
          <div className="legend-item">
            <span className="legend-marker above">↑</span> Better Than Expected
          </div>
          <div className="legend-item">
            <span className="legend-marker meets">→</span> Meets Expectation
          </div>
        </div>
        <div className="stanine-explanation">
          <p><strong>Stanine Scale:</strong> 1-3 (Weakness), 4-6 (Average), 7-9 (Strength)</p>
        </div>
      </div>
    </div>
  );
};

export default AcademicChart;