// Updated api.js with downloadStudentReport and all required functions

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * General API request handler with error handling
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch API options
 * @returns {Promise<Object>} Response data
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API request failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API request error: ${error.message}`);
    throw error;
  }
};

/**
 * Fetch all students with their analytics data
 * @returns {Promise<Array>} Array of student objects with analytics
 */
export const fetchStudents = async () => {
  return apiRequest('/students');
};

/**
 * Fetch detailed data for a specific student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Student data with full analytics
 */
export const fetchStudentDetails = async (studentId) => {
  return apiRequest(`/students/${studentId}`);
};

/**
 * Fetch cohort statistics for dashboard
 * @returns {Promise<Object>} Aggregated cohort statistics
 */
export const fetchCohortStats = async () => {
  return apiRequest('/cohort/stats');
};

/**
 * Fetch grade-level analytics
 * @param {string} grade - Grade level to fetch
 * @returns {Promise<Object>} Grade-level analytics data
 */
export const fetchGradeAnalytics = async (grade) => {
  return apiRequest(`/grades/${grade}/analytics`);
};

/**
 * Upload student assessment files
 * @param {FormData} formData - Form data with files
 * @returns {Promise<Object>} Upload results
 */
export const uploadStudentFiles = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for FormData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Upload failed with status ${response.status}`
    );
  }

  return await response.json();
};

/**
 * Fetch intervention recommendations
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of intervention recommendations
 */
export const fetchInterventions = async (studentId) => {
  return apiRequest(`/students/${studentId}/interventions`);
};

/**
 * Fetch student progress data
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Progress tracking data
 */
export const fetchStudentProgress = async (studentId) => {
  return apiRequest(`/students/${studentId}/progress`);
};

/**
 * Fetch risk prediction data
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Risk prediction analysis
 */
export const fetchRiskPrediction = async (studentId) => {
  return apiRequest(`/students/${studentId}/risk-prediction`);
};

/**
 * Download student report as PDF
 * @param {string} studentId - Student ID
 * @param {string} reportType - Type of report to download (e.g., 'comprehensive', 'summary', 'interventions')
 * @returns {Promise<Blob>} PDF blob that can be downloaded
 */
export const downloadStudentReport = async (studentId, reportType = 'comprehensive') => {
  try {
    const url = `${API_BASE_URL}/students/${studentId}/report?type=${reportType}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download report with status ${response.status}`);
    }

    // Return the PDF as a blob
    return await response.blob();
  } catch (error) {
    console.error(`Report download error: ${error.message}`);
    throw error;
  }
};

/**
 * Update student information
 * @param {string} studentId - Student ID
 * @param {Object} data - Updated student data
 * @returns {Promise<Object>} Updated student object
 */
export const updateStudent = async (studentId, data) => {
  return apiRequest(`/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Add a new intervention for a student
 * @param {string} studentId - Student ID
 * @param {Object} intervention - Intervention data
 * @returns {Promise<Object>} Created intervention
 */
export const addIntervention = async (studentId, intervention) => {
  return apiRequest(`/students/${studentId}/interventions`, {
    method: 'POST',
    body: JSON.stringify(intervention),
  });
};

/**
 * Update intervention status or details
 * @param {string} studentId - Student ID
 * @param {string} interventionId - Intervention ID
 * @param {Object} data - Updated intervention data
 * @returns {Promise<Object>} Updated intervention
 */
export const updateIntervention = async (studentId, interventionId, data) => {
  return apiRequest(`/students/${studentId}/interventions/${interventionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Generate and save notes for a student
 * @param {string} studentId - Student ID
 * @param {Object} notes - Notes data
 * @returns {Promise<Object>} Saved notes
 */
export const saveStudentNotes = async (studentId, notes) => {
  return apiRequest(`/students/${studentId}/notes`, {
    method: 'POST',
    body: JSON.stringify(notes),
  });
};

/**
 * Share student report via email
 * @param {string} studentId - Student ID
 * @param {Object} shareData - Share details including emails and message
 * @returns {Promise<Object>} Share status
 */
export const shareStudentReport = async (studentId, shareData) => {
  return apiRequest(`/students/${studentId}/share`, {
    method: 'POST',
    body: JSON.stringify(shareData),
  });
};

// Create a default export that includes all functions
const api = {
  fetchStudents,
  fetchStudentDetails,
  fetchCohortStats,
  fetchGradeAnalytics,
  uploadStudentFiles,
  fetchInterventions,
  fetchStudentProgress,
  fetchRiskPrediction,
  downloadStudentReport,
  updateStudent,
  addIntervention,
  updateIntervention,
  saveStudentNotes,
  shareStudentReport
};

export default api;