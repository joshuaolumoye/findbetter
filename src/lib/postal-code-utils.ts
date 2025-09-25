// lib/postal-code-utils.ts
export interface PostalCodeInfo {
  plz: string;
  canton: string;
  region: string;
  city?: string;
  isValid: boolean;
}

export class PostalCodeUtils {
  /**
   * Validate and get info about Swiss postal code
   */
  static getPostalCodeInfo(plz: string): PostalCodeInfo {
    // Clean the postal code
    const cleanedPlz = plz?.toString().trim();
    
    if (!cleanedPlz || !/^\d{4}$/.test(cleanedPlz)) {
      return {
        plz: cleanedPlz || '',
        canton: '',
        region: '',
        isValid: false
      };
    }
    
    const plzNum = parseInt(cleanedPlz);
    
    // Swiss postal code to canton and region mapping
    let canton = 'ZH'; // Default
    let region = 'Zurich'; // Default
    
    if (plzNum >= 1000 && plzNum <= 1199) {
      canton = 'GE';
      region = 'Geneva';
    } else if (plzNum >= 1200 && plzNum <= 1999) {
      canton = 'VD';
      region = 'Lausanne';
    } else if (plzNum >= 2000 && plzNum <= 2999) {
      canton = 'NE';
      region = 'Neuchatel';
    } else if (plzNum >= 3000 && plzNum <= 3999) {
      canton = 'BE';
      region = 'Bern';
    } else if (plzNum >= 4000 && plzNum <= 4999) {
      canton = 'BS';
      region = 'Basel';
    } else if (plzNum >= 5000 && plzNum <= 5999) {
      canton = 'AG';
      region = 'Aargau';
    } else if (plzNum >= 6000 && plzNum <= 6999) {
      canton = 'LU';
      region = 'Lucerne';
    } else if (plzNum >= 7000 && plzNum <= 7999) {
      canton = 'GR';
      region = 'Graubunden';
    } else if (plzNum >= 8000 && plzNum <= 8999) {
      canton = 'ZH';
      region = 'Zurich';
    } else if (plzNum >= 9000 && plzNum <= 9999) {
      canton = 'SG';
      region = 'St. Gallen';
    }
    
    return {
      plz: cleanedPlz,
      canton,
      region,
      isValid: true
    };
  }
  
  /**
   * Extract postal code from various sources
   */
  static extractPostalCode(sources: {
    searchCriteria?: any;
    address?: string;
    manualInput?: string;
  }): string {
    console.log('Extracting postal code from sources:', sources);
    
    // Priority 1: Search criteria (most reliable)
    if (sources.searchCriteria?.plz) {
      const plz = sources.searchCriteria.plz.toString().trim();
      if (/^\d{4}$/.test(plz)) {
        console.log('Using postal code from search criteria:', plz);
        return plz;
      }
    }
    
    // Priority 2: Manual input
    if (sources.manualInput) {
      const plz = sources.manualInput.toString().trim();
      if (/^\d{4}$/.test(plz)) {
        console.log('Using manual postal code input:', plz);
        return plz;
      }
    }
    
    // Priority 3: Extract from address
    if (sources.address) {
      const match = sources.address.match(/\b\d{4}\b/);
      if (match) {
        console.log('Extracted postal code from address:', match[0]);
        return match[0];
      }
    }
    
    console.warn('No valid postal code found in any source');
    return '';
  }
  
  /**
   * Debug function to log postal code extraction process
   */
  static debugPostalCodeExtraction(
    searchCriteria: any, 
    formData: any, 
    address: string
  ): void {
    console.log('=== Postal Code Debug ===');
    console.log('Search Criteria:', searchCriteria);
    console.log('Form Data:', formData);
    console.log('Address:', address);
    
    const extracted = this.extractPostalCode({
      searchCriteria,
      address,
      manualInput: formData?.postalCode
    });
    
    const info = this.getPostalCodeInfo(extracted);
    console.log('Extracted PLZ:', extracted);
    console.log('PLZ Info:', info);
    console.log('=== End Debug ===');
  }
}

// Add to your user route validation
export function validateUserData(userData: any, searchCriteria: any): {
  isValid: boolean;
  errors: string[];
  postalCode: string;
} {
  const errors: string[] = [];
  
  // Extract and validate postal code
  const postalCode = PostalCodeUtils.extractPostalCode({
    searchCriteria,
    address: userData.address,
    manualInput: userData.postalCode
  });
  
  if (!postalCode) {
    errors.push('Valid Swiss postal code is required');
  }
  
  // Validate other required fields
  const requiredFields = [
    { field: 'firstName', label: 'First name' },
    { field: 'lastName', label: 'Last name' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Phone' },
    { field: 'birthDate', label: 'Birth date' },
    { field: 'address', label: 'Address' }
  ];
  
  for (const { field, label } of requiredFields) {
    if (!userData[field]?.toString().trim()) {
      errors.push(`${label} is required`);
    }
  }
  
  // Email validation
  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Valid email address is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    postalCode
  };
}