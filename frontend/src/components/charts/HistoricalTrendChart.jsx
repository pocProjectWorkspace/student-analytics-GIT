import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';

/**
 * HistoricalTrendChart component to visualize student data trends over time
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.trendData - Historical data points [{timestamp: Date, value: number, domain: string}]
 * @param {String} props.title - Chart title (optional)
 * @param {String} props.domain - Domain to visualize (PASS, CAT4, Academic)
 * @param {String} props.metric - Metric to display (percentile, stanine, etc.)
 * @param {Number} props.thresholdValue - Risk threshold to display as reference line (optional)
 * @param {Function} props.formatValue - Function to format values for tooltip (optional)
 */
const HistoricalTrendChart = ({ 
  trendData = [], 
  title = "Historical Trends", 
  domain = "PASS",
  metric = "percentile",
  thresholdValue,
  formatValue = (val) => val
}) => {
  const [formattedData, setFormattedData] = useState([]);
  const [availableFactors, setAvailableFactors] = useState([]);
  const [selectedFactors, setSelectedFactors] = useState([]);
  const [timeRange, setTimeRange] = useState('all');
  
  // Chart colors for different factors
  const colors = [
    "#4361ee", "#3a0ca3", "#7209b7", "#f72585", 
    "#4cc9f0", "#4895ef", "#560bad", "#b5179e"
  ];
  
  // Process trend data
  useEffect(() => {
    if (!trendData || trendData.length === 0) return;
    
    // Extract available factors
    const factors = new Set();
    trendData.forEach(trend => {
      if (trend.factor) factors.add(trend.factor);
    });
    
    const factorsList = Array.from(factors);
    setAvailableFactors(factorsList);
    
    // Default to selecting up to 3 factors
    setSelectedFactors(factorsList.slice(0, 3));
    
    // Format data for the chart
    const formattedPoints = [];
    const dataByDate = {};
    
    // Group data points by date
    trendData.forEach(trend => {
      if (!trend.timestamp || !trend.factor) return;
      
      const date = new Date(trend.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = {
          date: dateStr,
          displayDate: date.toLocaleDateString(),
          timestamp: date
        };
      }
      
      dataByDate[dateStr][trend.factor] = trend.value;
    });
    
    // Convert to array and sort by date
    const sortedData = Object.values(dataByDate).sort(
      (a, b) => a.timestamp - b.timestamp
    );
    
    setFormattedData(sortedData);
  }, [trendData]);
  
  // Filter data based on time range
  const getFilteredData = () => {
    if (timeRange === 'all' || formattedData.length === 0) {
      return formattedData;
    }
    
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeRange) {
      case '1y':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      case '6m':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '3m':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      default:
        return formattedData;
    }
    
    return formattedData.filter(item => new Date(item.timestamp) >= cutoff);
  };
  
  // Handle factor selection
  const toggleFactor = (factor) => {
    if (selectedFactors.includes(factor)) {
      setSelectedFactors(selectedFactors.filter(f => f !== factor));
    } else {
      setSelectedFactors([...selectedFactors, factor]);
    }
  };
  
  // Build the Y-axis domain based on the metric
  const getYAxisDomain = () => {
    switch (metric.toLowerCase()) {
      case 'percentile':
        return [0, 100];
      case 'stanine':
        return [0, 9];
      case 'sas':
        return [60, 140];
      default:
        return 'auto';
    }
  };
  
  // Custom tooltip formatter
  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p className="tooltip-date" style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
          {payload[0].payload.displayDate}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ 
            margin: '3px 0', 
            color: entry.color,
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ marginRight: '10px' }}>{entry.name}:</span>
            <span style={{ fontWeight: 'bold' }}>
              {formatValue(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  };
  
  // No data message
  if (trendData.length === 0) {
    return (
      <div className="empty-chart" style={{ 
        textAlign: 'center', 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        color: '#6c757d'
      }}>
        <h3>{title}</h3>
        <p>No historical data available for trend analysis</p>
      </div>
    );
  }
  
  return (
    <div className="historical-trend-chart">
      <div className="chart-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <h3 style={{ margin: '0' }}>{title}</h3>
        
        <div className="chart-controls" style={{ display: 'flex', gap: '10px' }}>
          {/* Time range selector */}
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
          >
            <option value="all">All Time</option>
            <option value="1y">Last Year</option>
            <option value="6m">Last 6 Months</option>
            <option value="3m">Last 3 Months</option>
          </select>
        </div>
      </div>
      
      {/* Factors selector */}
      <div className="factor-selector" style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '15px'
      }}>
        {availableFactors.map((factor, index) => (
          <button
            key={factor}
            onClick={() => toggleFactor(factor)}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              backgroundColor: selectedFactors.includes(factor) 
                ? colors[index % colors.length] 
                : 'white',
              color: selectedFactors.includes(factor) ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {factor}
          </button>
        ))}
      </div>
      
      {/* Chart area */}
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer>
          <LineChart
            data={getFilteredData()}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fontSize: 12 }} 
              tickMargin={10} 
            />
            <YAxis 
              domain={getYAxisDomain()}
              tick={{ fontSize: 12 }}
              tickMargin={10}
              label={{ 
                value: metric, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            
            {/* Threshold reference line if specified */}
            {thresholdValue && (
              <ReferenceLine 
                y={thresholdValue} 
                stroke="red" 
                strokeDasharray="3 3"
                label={{ 
                  value: "Risk Threshold", 
                  position: 'right', 
                  fill: 'red',
                  fontSize: 12
                }}
              />
            )}
            
            {/* Lines for each selected factor */}
            {selectedFactors.map((factor, index) => (
              <Line
                key={factor}
                type="monotone"
                dataKey={factor}
                stroke={colors[index % colors.length]}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                connectNulls={true}
                animationDuration={500}
                animationEasing="ease-in-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistoricalTrendChart;