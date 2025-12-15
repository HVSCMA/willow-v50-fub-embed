// FUB Custom Field Sync After CMA Generation
const FUB_API_KEY = process.env.FUB_API_KEY;
const FUB_API_BASE = 'https://api.followupboss.com/v1';

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
    const { personId, cmaUrl, cmaGeneratedDate } = JSON.parse(event.body);

    if (!personId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'personId required' })
      };
    }

    // Update FUB custom fields
    const updateResponse = await fetch(`${FUB_API_BASE}/people/${personId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(FUB_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customCloudCMALastRequest: cmaGeneratedDate || new Date().toISOString(),
        customWillowLastCMAGenerated: new Date().toISOString(),
        customCloudCMARequestCount: 'INCREMENT', // FUB will increment
        customWillowStatus: 'Active',
        customWillowWhyNowTrigger: 'CMA Generated',
        customWillowRecommendedAction: 'Review CMA with Client',
        // Optional: Validation or checks could be added here if these values should be dynamic from the request

      })
    });

    if (!updateResponse.ok) {
      throw new Error(`FUB sync error: ${updateResponse.status}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        personId,
        fieldsUpdated: ['customCloudCMALastRequest', 'customWillowLastCMAGenerated', 'customCloudCMARequestCount']
      })
    };

  } catch (error) {
    console.error('FUB sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to sync FUB fields',
        details: error.message
      })
    };
  }
};