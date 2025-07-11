export function getSubdomain() {
  const hostname = window.location.hostname;
  
  // For local development, check for query parameter to simulate subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const urlParams = new URLSearchParams(window.location.search);
    const testSubdomain = urlParams.get('clinic');
    
    if (testSubdomain) {
      // Store the subdomain in localStorage for later use
      localStorage.setItem('currentClinicSubdomain', testSubdomain);
      return testSubdomain;
    }
    
    // Only use stored subdomain for non-root routes
    if (window.location.pathname !== '/' && localStorage.getItem('currentClinicSubdomain')) {
      return localStorage.getItem('currentClinicSubdomain');
    }
  }
  
  // Extract subdomain from hostname (for production)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const subdomain = parts[0];
    // Treat 'www' as NOT a clinic subdomain
    if (subdomain === 'www') {
      return null;
    }
    // Store the subdomain in localStorage for later use
    localStorage.setItem('currentClinicSubdomain', subdomain);
    return subdomain;
  }
  
  return null;
} 