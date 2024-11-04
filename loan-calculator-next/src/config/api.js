const apiConfig = {
    baseUrl: 'https://pmovescalcapi.cataclysmstudios.net',
    endpoints: {
      calculate: '/calculate',
      exportExcel: '/export-excel'
    }
  };
  
  export const getEndpointUrl = (endpoint) => {
    return `${apiConfig.baseUrl}${endpoint}`;
  };