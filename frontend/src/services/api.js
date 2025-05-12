// frontend/src/services/api.js
import axios from 'axios';

const API_URL = '/api'; // Using the proxy in vite.config.js

// Log for debugging
console.log("API URL configured as:", API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.log('API Request:', request.method.toUpperCase(), request.url);
  return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('API Error:', error.message, error.config?.url);
    return Promise.reject(error);
  }
);


// Store the session ID from successful upload
let currentSessionId = localStorage.getItem('sessionId') || 'demo';

export const fetchGradeLevelData = async (gradeId) => {
  try {
    const response = await api.get(`/grades/${gradeId}?session_id=${currentSessionId}`);
    return response.data;
  } catch (error) {
    // For demo purposes, return mock data if API fails
    console.error('API error:', error);
    return getMockGradeData(gradeId);
  }
};

export const fetchStudentData = async (studentId) => {
  try {
    const response = await api.get(`/students/${studentId}?session_id=${currentSessionId}`);
    return response.data;
  } catch (error) {
    // For demo purposes, return mock data if API fails
    console.error('API error:', error);
    return getMockStudentData(studentId);
  }
};

export const downloadStudentReport = async (studentId) => {
  try {
    window.open(`${API_URL}/students/${studentId}/report?session_id=${currentSessionId}`, '_blank');
    return true;
  } catch (error) {
    console.error('API error:', error);
    return false;
  }
};

export const uploadStudentData = async (formData) => {
  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Store session ID for future requests
    if (response.data && response.data.session_id) {
      currentSessionId = response.data.session_id;
      localStorage.setItem('sessionId', currentSessionId);
    }
    
    return response.data;
  } catch (error) {
    console.error('API error:', error);
    throw new Error(error.response?.data?.detail || 'Upload failed. Please try again.');
  }
};

// Mock data for demonstration when backend is not available
function getMockGradeData(gradeId) {
  return {
    summary: {
      total_students: 120,
      at_risk_count: 24,
      fragile_learners_count: 15,
      academic_concerns_count: 18
    },
    riskData: [
      { id: 'S1', name: 'John Smith', section: 'Class A', riskCount: 3 },
      { id: 'S2', name: 'Emma Johnson', section: 'Class A', riskCount: 2 },
      { id: 'S3', name: 'Michael Brown', section: 'Class B', riskCount: 5 },
      { id: 'S4', name: 'Olivia Davis', section: 'Class B', riskCount: 0 },
      { id: 'S5', name: 'William Wilson', section: 'Class C', riskCount: 1 }
    ],
    atRiskStudents: [
      { 
        id: 'S1', 
        name: 'John Smith', 
        risk_count: 3,
        riskAreas: [
          { factor: 'Self Regard', level: 'at-risk', type: 'Self Regard' },
          { factor: 'Emotional Control', level: 'at-risk', type: 'Emotional Control' },
          { factor: 'Verbal Reasoning', level: 'weakness', type: 'Verbal' }
        ],
        intervention_count: 2
      },
      { 
        id: 'S3', 
        name: 'Michael Brown', 
        risk_count: 5,
        riskAreas: [
          { factor: 'Self Regard', level: 'at-risk', type: 'Self Regard' },
          { factor: 'Work Ethic', level: 'at-risk', type: 'Work Ethic' },
          { factor: 'Fragile Learner', level: 'high', type: 'Fragile Learner' },
          { factor: 'Quantitative Reasoning', level: 'weakness', type: 'Quantitative' },
          { factor: 'Nonverbal Reasoning', level: 'weakness', type: 'Nonverbal' }
        ],
        intervention_count: 4
      },
      { 
        id: 'S5', 
        name: 'William Wilson', 
        risk_count: 1,
        riskAreas: [
          { factor: 'Curriculum Demand', level: 'at-risk', type: 'Curriculum' }
        ],
        intervention_count: 1
      }
    ]
  };
}

function getMockStudentData(studentId) {
  return {
    student_id: studentId,
    name: studentId === 'S1' ? 'John Smith' : 'Michael Brown',
    grade: '10',
    id: studentId,
    passData: {
      factors: [
        { name: 'Self Regard', percentile: 35, level: 'at-risk' },
        { name: 'Learning Confidence', percentile: 55, level: 'balanced' },
        { name: 'Work Ethic', percentile: 45, level: 'balanced' },
        { name: 'Emotional Control', percentile: 30, level: 'at-risk' },
        { name: 'Social Confidence', percentile: 60, level: 'balanced' },
        { name: 'Curriculum Demand', percentile: 50, level: 'balanced' }
      ],
      riskAreas: [
        { factor: 'Self Regard', percentile: 35, level: 'at-risk' },
        { factor: 'Emotional Control', percentile: 30, level: 'at-risk' }
      ]
    },
    cat4Data: {
      isFragileLearner: studentId === 'S3',
      domains: [
        { name: 'Verbal Reasoning', stanine: 3, level: 'weakness' },
        { name: 'Quantitative Reasoning', stanine: 5, level: 'average' },
        { name: 'Nonverbal Reasoning', stanine: 4, level: 'average' },
        { name: 'Spatial Reasoning', stanine: 6, level: 'average' }
      ]
    },
    academicData: {
      subjects: {
        'English': { mark: 65, level: 'average', comparison: 'As Expected' },
        'Math': { mark: 70, level: 'average', comparison: 'As Expected' },
        'Science': { mark: 58, level: 'low', comparison: 'Underperforming' },
        'History': { mark: 72, level: 'average', comparison: 'As Expected' }
      }
    },
    interventions: [
      {
        domain: 'emotional',
        factor: 'Self Regard',
        title: 'Self-Esteem Building',
        description: 'Weekly sessions focusing on identifying and celebrating strengths. Include positive affirmation activities and reflective journaling.',
        priority: 'high'
      },
      {
        domain: 'emotional',
        factor: 'Emotional Control',
        title: 'Emotional Regulation Therapy',
        description: 'Sessions focused on identifying emotional triggers and developing healthy coping mechanisms.',
        priority: 'medium'
      },
      {
        domain: 'cognitive',
        factor: 'Verbal Reasoning',
        title: 'Verbal Skills Development',
        description: 'Explicit instruction in vocabulary development, reading comprehension strategies, and verbal expression.',
        priority: 'medium'
      }
    ]
  };
}