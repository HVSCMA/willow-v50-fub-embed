// Smart CMA Defaults with ATTOM Integration
// Glenn's 22-Year Hudson Valley Expertise Encoded

const ATTOM_API_KEY = process.env.ATTOM_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { address } = JSON.parse(event.body);

    if (!address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'address required' })
      };
    }

    // Get property intelligence from ATTOM
    const attomResponse = await fetch(
      `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address?address1=${encodeURIComponent(address)}`,
      {
        headers: {
          'apikey': ATTOM_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    let propertyData = null;
    let urbanProtocol = true; // default to urban

    if (attomResponse.ok) {
      const attomData = await attomResponse.json();
      propertyData = attomData.property?.[0];
      
      // Determine urban vs rural protocol
      const lot = propertyData?.lot;
      if (lot) {
        const lotSizeAcres = parseFloat(lot.lotSize2) || 0;
        urbanProtocol = lotSizeAcres < 5; // Rural if 5+ acres
      }
    }

    // Glenn's Smart Defaults Based on Protocol
    let defaults;
    
    if (urbanProtocol) {
      // URBAN PROTOCOL: Dense markets (Poughkeepsie, Newburgh, Kingston)
      defaults = {
        radius: 1,        // 1 mile (dense urban)
        daysBack: 365,    // 12 months
        maxComparables: 20,
        priceVariance: 10  // 10% variance
      };
    } else {
      // RURAL PROTOCOL: Highland, Salt Point, Staatsburg
      defaults = {
        radius: 3,        // 3 miles (rural spread)
        daysBack: 545,    // 18 months (sparse data)
        maxComparables: 15,
        priceVariance: 15  // 15% variance (wider range)
      };
    }

    // Luxury Override (>$750K)
    const propertyValue = propertyData?.assessment?.market?.mktTtlValue;
    if (propertyValue && propertyValue > 750000) {
      defaults.daysBack = 730;  // 24 months for luxury
      defaults.priceVariance = 20; // Wider variance for unique properties
      defaults.maxComparables = 12; // Fewer, more selective
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        defaults,
        protocol: urbanProtocol ? 'URBAN' : 'RURAL',
        propertyIntelligence: propertyData ? {
          lotSize: propertyData.lot?.lotSize2,
          yearBuilt: propertyData.summary?.yearBuilt,
          estimatedValue: propertyData.assessment?.market?.mktTtlValue,
          beds: propertyData.building?.rooms?.beds,
          baths: propertyData.building?.rooms?.bathsFull
        } : null
      })
    };

  } catch (error) {
    console.error('Smart defaults error:', error);
    
    // Fallback to conservative defaults on error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        defaults: {
          radius: 1,
          daysBack: 365,
          maxComparables: 20,
          priceVariance: 10
        },
        protocol: 'FALLBACK',
        propertyIntelligence: null,
        error: error.message
      })
    };
  }
};