import React from 'react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';

/**
 * RiskIndicatorChart component to visualize risk factors in a radar chart
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.riskFactors - Risk factors with levels [{factor: string, level: number, domain: string}]
 * @param {String} props.title - Chart title (optional)
 * @param {Function} props.formatValue - Function to format values for tooltip (optional)
 * @param {Object} props.thresholds - Threshold levels for highlighting (e.g., {high: 0.7, medium: 0.4})
 */
const RiskIndicatorChart = ({
  riskFactors = [],
  title = "Risk Analysis",
  formatValue = (val) => Math.round(val * 100) + '%',
  thresholds = { high: 0.7, medium: 0.4, low: 0.2 }
}) => {
  // Process risk data for radar chart
  const processRiskData = () => {
    // Group by domain first to show risk by category
    const domains = {};
    riskFactors.forEach(risk => {
      if (!domains[risk.domain]) {
        domains[risk.domain] = [];
      }
      domains[risk.domain].push(risk);
    });
    
    // Format for radar chart - we want each risk factor as an angle axis
    const radarData = [];
    const factorsByDomain = {};
    
    // Convert to radar chart format
    riskFactors.forEach(risk => {
      // For each risk factor, create an entry in radarData
      const domainColor = getDomainColor(risk.domain);
      
      // Track factors by domain for legend grouping
      if (!factorsByDomain[risk.domain]) {
        factorsByDomain[risk.domain] = {
          domain: risk.domain,
          color: domainColor,
          factors: []
        };
      }
      factorsByDomain[risk.domain].factors.push(risk.factor);
      
      radarData.push({
        factor: risk.factor,
        domain: risk.domain,
        value: risk.level,
        color: domainColor,
        weighted_risk: risk.weighted_risk || risk.level
      });
    });
    
    return { radarData, factorsByDomain };
  };
  
  // Get color based on domain
  const getDomainColor = (domain) => {
    const domainColors = {
      'PASS': '#4361ee',
      'CAT4': '#7209b7',
      'Academic': '#f72585',
      'Performance Gap': '#4cc9f0',
      'Combined': '#3a0ca3',
      'Emotional': '#4361ee',
      'Cognitive': '#7209b7',
      'Behavioral': '#f72585',
      'Social': '#4cc9f0',
      'Academic': '#3a0ca3'
    };
    
    return domainColors[domain] || '#6c757d';
  };
  
  // Get color based on risk level
  const getRiskLevelColor = (value) => {
    if (value >= thresholds.high) return '#e63946'; // High risk - red
    if (value >= thresholds.medium) return '#f3722c'; // Medium risk - orange
    if (value >= thresholds.low) return '#f9c74f'; // Low risk - yellow
    return '#90be6d'; // Very low risk - green
  };
  
  // Custom tooltip
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const risk = payload[0].payload;
    
    return (
      <div className="risk-tooltip" style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '250px'
      }}>
        <p style={{ 
          margin: '0 0 5px 0', 
          fontWeight: 'bold',
          borderBottom: `2px solid ${risk.color}`,
          paddingBottom: '3px'
        }}>{risk.factor}</p>
        <p style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span>Domain:</span>
          <span style={{ fontWeight: 'bold', color: risk.color }}>{risk.domain}</span>
        </p>
        <p style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
          <span>Risk Level:</span>
          <span style={{ 
            fontWeight: 'bold', 
            color: getRiskLevelColor(risk.value)
          }}>{formatValue(risk.value)}</span>
        </p>
        {risk.weighted_risk && (
          <p style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Weighted Risk:</span>
            <span style={{ fontWeight: 'bold' }}>{formatValue(risk.weighted_risk)}</span>
          </p>
        )}
        {risk.details && (
          <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>{risk.details}</p>
        )}
      </div>
    );
  };
  
  // Custom legend that shows domains
  const renderLegend = ({ payload }) => {
    const { factorsByDomain } = processRiskData();
    
    return (
      <div className="risk-legend" style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center',
        marginTop: '10px'
      }}>
        {Object.values(factorsByDomain).map((item) => (
          <div key={item.domain} style={{ 
            display: 'flex',
            alignItems: 'center',
            marginRight: '15px'
          }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: item.color,
              marginRight: '5px'
            }} />
            <span style={{ fontSize: '0.85rem' }}>{item.domain} ({item.factors.length})</span>
          </div>
        ))}
      </div>
    );
  };
  
  // If no data, display message
  if (!riskFactors || riskFactors.length === 0) {
    return (
      <div className="empty-chart" style={{ 
        textAlign: 'center', 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        color: '#6c757d'
      }}>
        <h3>{title}</h3>
        <p>No risk factors identified</p>
      </div>
    );
  }
  
  const { radarData } = processRiskData();
  
  return (
    <div className="risk-indicator-chart">
      <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>{title}</h3>
      
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer>
          <RadarChart outerRadius={90} data={radarData}>
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis 
              dataKey="factor" 
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 1]} 
              tick={{ fontSize: 10 }}
              tickFormatter={formatValue}
              tickCount={5}
            />
            <Radar 
              name="Risk Level" 
              dataKey="value" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.5}
              activeDot={{ strokeWidth: 2, r: 6 }}
            />
            <Tooltip content={renderTooltip} />
            <Legend content={renderLegend} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Risk level legend */}
      <div className="risk-level-legend" style={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        marginTop: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#e63946', marginRight: '5px' }} />
          <span style={{ fontSize: '0.85rem' }}>High Risk (&gt;{formatValue(thresholds.high)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#f3722c', marginRight: '5px' }} />
          <span style={{ fontSize: '0.85rem' }}>Medium Risk (&gt;{formatValue(thresholds.medium)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#f9c74f', marginRight: '5px' }} />
          <span style={{ fontSize: '0.85rem' }}>Low Risk (&gt;{formatValue(thresholds.low)})</span>
        </div>
      </div>
    </div>
  );
};

export default RiskIndicatorChart;