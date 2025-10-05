import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('https://compando-backend-dwl4f.ondigitalocean.app/api/premiums', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter results to only include products with matching franchise
    if (Array.isArray(data)) {
      const filteredData = data.filter(item => {
        // Check if the item has a franchise property that matches the requested franchise
        return item.franchise === body.franchise;
      });
      
      // If we have filtered results, also filter products by tariff type
      if (filteredData.length > 0 && body.tariffType) {
        const firstResult = filteredData[0];
        if (firstResult.products && Array.isArray(firstResult.products)) {
          const filteredProducts = firstResult.products.filter(product => {
            return product.tariffType === body.tariffType;
          });
          
          // Update the first result with filtered products
          filteredData[0] = {
            ...firstResult,
            products: filteredProducts
          };
        }
      }
      
      return NextResponse.json(filteredData);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}