import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

function AcademicComparisonChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Check if we have academic data
    if (!data || 
        !data.academic_analysis || 
        !data.academic_analysis.available || 
        !data.academic_analysis.subjects || 
        data.academic_analysis.subjects.length === 0) {
      return;
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    // Extract academic data
    const subjects = data.academic_analysis.subjects.map(subject => subject.name);
    const academicStanines = data.academic_analysis.subjects.map(subject => subject.stanine);
    
    // Prepare arrays for cognitive potential comparison if available
    const hasCat4Comparison = data.performance_comparison && data.performance_comparison.available;
    
    let cat4Stanines = [];
    if (hasCat4Comparison) {
      cat4Stanines = data.academic_analysis.subjects.map(subject => {
        return data.performance_comparison.comparisons[subject.name]?.cat4_stanine || null;
      });
    }
    
    // Determine comparison status for labeling
    const comparisonStatus = hasCat4Comparison ? 
      data.academic_analysis.subjects.map(subject => {
        return data.performance_comparison.comparisons[subject.name]?.status || 'No Data';
      }) : [];
    
    // Create datasets
    const datasets = [
      {
        label: 'Academic Performance',
        data: academicStanines,
        backgroundColor: 'rgba(66, 165, 245, 0.7)',
        borderColor: 'rgba(21, 101, 192, 1)',
        borderWidth: 1
      }
    ];
    
    // Add CAT4 comparison dataset if available
    if (hasCat4Comparison) {
      datasets.push({
        label: 'Cognitive Potential (CAT4)',
        data: cat4Stanines,
        backgroundColor: 'rgba(255, 152, 0, 0.3)',
        borderColor: 'rgba(255, 152, 0, 0.7)',
        borderWidth: 2,
        borderDash: [5, 5],
        type: 'line',
        pointStyle: 'triangle',
        pointRadius: 6,
        pointHoverRadius: 8
      });
    }
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: subjects,
        datasets: datasets
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 9,
            ticks: {
              stepSize: 1,
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Stanine (1-9)',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 11
              }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          annotation: {
            annotations: {
              weaknessLine: {
                type: 'line',
                yMin: 3.5,
                yMax: 3.5,
                borderColor: 'rgba(239, 83, 80, 0.7)',
                borderWidth: 2,
                borderDash: [5, 5]
              }
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
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
                if (context.dataset.label === 'Academic Performance') {
                  return `Academic Stanine: ${context.raw}/9`;
                } else {
                  return `Cognitive Potential: ${context.raw}/9`;
                }
              },
              afterLabel: function(context) {
                if (hasCat4Comparison && context.datasetIndex === 0) {
                  const status = comparisonStatus[context.dataIndex];
                  return [`Performance Status: ${status}`];
                }
                return [];
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
  
  if (!data || 
      !data.academic_analysis || 
      !data.academic_analysis.available || 
      !data.academic_analysis.subjects || 
      data.academic_analysis.subjects.length === 0) {
    return <div className="no-data-chart">No academic data available</div>;
  }
  
  return (
    <div className="chart-container" style={{ height: '100%', width: '100%' }}>
      <canvas ref={chartRef} />
      
      {data.performance_comparison && data.performance_comparison.available && (
        <div className="comparison-legend">
          <div className="legend-item">
            <span className="legend-indicator underperforming"></span>
            <span className="legend-label">Underperforming</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator as-expected"></span>
            <span className="legend-label">As Expected</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator overperforming"></span>
            <span className="legend-label">Overperforming</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademicComparisonChart;