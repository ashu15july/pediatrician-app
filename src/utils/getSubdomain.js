export function getSubdomain() {
  const hostname = window.location.hostname;
  console.log('getSubdomain: hostname:', hostname);
  console.log('getSubdomain: current URL:', window.location.href);
  
  // For local development, check for query parameter to simulate subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const urlParams = new URLSearchParams(window.location.search);
    const testSubdomain = urlParams.get('clinic');
    console.log('getSubdomain: query parameter clinic:', testSubdomain);
    
    if (testSubdomain) {
      // Store the subdomain in localStorage for later use
      localStorage.setItem('currentClinicSubdomain', testSubdomain);
      console.log('getSubdomain: stored subdomain in localStorage:', testSubdomain);
      return testSubdomain;
    }
    
    // Check localStorage for stored subdomain (for dashboard routes)
    const storedSubdomain = localStorage.getItem('currentClinicSubdomain');
    console.log('getSubdomain: stored subdomain from localStorage:', storedSubdomain);
    if (storedSubdomain) {
      return storedSubdomain;
    }
  }
  
  // Extract subdomain from hostname
  const parts = hostname.split('.');
  console.log('getSubdomain: hostname parts:', parts);
  if (parts.length > 2) {
    const subdomain = parts[0];
    // Treat 'www' as NOT a clinic subdomain
    if (subdomain === 'www') {
      console.log('getSubdomain: www detected, treating as no subdomain');
      return null;
    }
    // Store the subdomain in localStorage for later use
    localStorage.setItem('currentClinicSubdomain', subdomain);
    console.log('getSubdomain: extracted subdomain from hostname:', subdomain);
    return subdomain;
  }
  
  console.log('getSubdomain: no subdomain found');
  return null;
} 