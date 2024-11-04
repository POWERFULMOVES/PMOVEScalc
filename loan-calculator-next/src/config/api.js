const getApiUrl = () => {
  // For production
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For development
  return 'http://localhost:9000';
};

export const apiConfig = {
  baseUrl: getApiUrl(),
  endpoints: {
    calculate: '/calculate',
    exportExcel: '/export-excel',
    health: '/health',
    version: '/version'
  }
};

// Helper function to get full endpoint URL
export const getEndpointUrl = (endpoint) => {
  return `${apiConfig.baseUrl}${endpoint}`;
}; 