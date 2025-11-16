// CloudCMA Generation Endpoint
const CLOUDCMA_API_KEY = process.env.CLOUDCMA_API_KEY;

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
    const { personId, address, radius, daysBack, maxComparables, priceVariance } = JSON.parse(event.body);

    if (!address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'address required' })
      };
    }

    // Generate CMA via CloudCMA API
    const cmaResponse = await fetch('https://cloudcma.com/cmas/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOUDCMA_API_KEY}`
      },
      body: JSON.stringify({
        address,
        radius: radius || 1,
        daysBack: daysBack || 365,
        maxComparables: maxComparables || 20,
        priceVariance: priceVariance || 10
      })
    });

    if (!cmaResponse.ok) {
      throw new Error(`CloudCMA API error: ${cmaResponse.status}`);
    }

    const cmaData = await cmaResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cma: cmaData.cma || cmaData,
        personId
      })
    };

  } catch (error) {
    console.error('CMA generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate CMA',
        details: error.message 
      })
    };
  }
};