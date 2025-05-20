// Fix for the RiskIndicatorChart.jsx file
// Replace or update the domainColors object where the duplicate 'Academic' key exists

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const RiskIndicatorChart = ({ riskFactors }) => {
  // Group risk factors by domain and calculate weighted risk
  const domainRisks = riskFactors.reduce((domains, factor) => {
    const domain = factor.domain;
    if (!domains[domain]) {
      domains[domain] = {
        name: domain,
        value: 0,
        factors: []
      };
    }
    domains[domain].value += factor.weighted_risk;
    domains[domain].factors.push(factor);
    return domains;
  }, {});

  // Convert to array and sort by risk value
  const data = Object.values(domainRisks).sort((a, b) => b.value - a.value);

  // Assign colors to different domains
  const domainColors = {
    'PASS': '#4361ee',
    'CAT4': '#4cc9f0',
    'Emotional': '#f72585',
    'Cognitive': '#7209b7',
    'Behavioral': '#f72585',
    'Social': '#4cc9f0',
    'Academic': '#3a0ca3',
    'Combined': '#4895ef'
  };

  // Custom tooltip to show the risk factors within each domain
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p><strong>{data.name} Risk Factors</strong></p>
          <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
            {data.factors.map((factor, i) => (
              <li key={i}>
                {factor.factor}: {(factor.weighted_risk * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  // Render empty state if no data
  if (data.length === 0) {
    return <div>No risk factors identified</div>;
  }

  return (
    <div style={{ height: 300, width: '100%' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={domainColors[entry.name] || '#' + ((Math.random() * 0xffffff) << 0).toString(16)} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskIndicatorChart;