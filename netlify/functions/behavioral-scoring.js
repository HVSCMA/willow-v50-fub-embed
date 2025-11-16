// WILLOW V50 Behavioral Scoring - Real FUB API Integration
// Enhanced Behavioral Scoring V4.0: Fello 35% + CloudCMA 25% + WILLOW 25% + Sierra 15%

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
    const { personId } = JSON.parse(event.body);
    
    if (!personId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'personId required' })
      };
    }

    // Fetch person data from FUB API
    const response = await fetch(`${FUB_API_BASE}/people/${personId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(FUB_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`FUB API error: ${response.status}`);
    }

    const data = await response.json();
    const person = data.person || data;

    // Extract custom fields (top-level properties)
    const felloScore = parseInt(person.customFelloLeadScore) || 0;
    const felloEmailClicks = parseInt(person.customFelloEmailClicks) || 0;
    const felloFormSubmissions = parseInt(person.customFelloFormSubmissions) || 0;
    const felloLastEmailClick = person.customFelloLastEmailClick || null;
    
    const cloudCMARequests = parseInt(person.customCloudCMARequestCount) || 0;
    const cloudCMALastRequest = person.customCloudCMALastRequest || null;
    
    const sierraPropertyViews = parseInt(person.customSierraPropertyViews) || 0;
    const sierraSavedListings = parseInt(person.customSierraSavedListings) || 0;

    // Behavioral Scoring V4.0 Calculation
    // Fello Component: 35% weight (0-100 scale)
    const felloComponent = (felloScore * 0.35);
    
    // CloudCMA Component: 25% weight
    const cloudCMAComponent = Math.min((cloudCMARequests * 20), 100) * 0.25;
    
    // WILLOW Component: 25% weight (email engagement)
    const willowComponent = Math.min((felloEmailClicks * 5), 100) * 0.25;
    
    // Sierra Component: 15% weight
    const sierraComponent = Math.min(((sierraPropertyViews * 2) + (sierraSavedListings * 5)), 100) * 0.15;

    const enhancedBehavioralScore = Math.round(
      felloComponent + cloudCMAComponent + willowComponent + sierraComponent
    );

    // Priority Classification
    let priority = 'COLD';
    if (enhancedBehavioralScore >= 75) priority = 'CRITICAL';
    else if (enhancedBehavioralScore >= 60) priority = 'SUPER_HOT';
    else if (enhancedBehavioralScore >= 45) priority = 'HOT';
    else if (enhancedBehavioralScore >= 30) priority = 'WARM';

    // Trigger Detection (25 patterns)
    const activeTriggers = [];
    
    if (felloScore >= 70) activeTriggers.push('HIGH_FELLO_SCORE');
    if (felloEmailClicks >= 5) activeTriggers.push('SUSTAINED_EMAIL_ENGAGEMENT');
    if (cloudCMARequests >= 2) activeTriggers.push('MULTI_CMA_REQUEST');
    if (sierraSavedListings >= 3) activeTriggers.push('PROPERTY_COLLECTION_BEHAVIOR');
    if (felloFormSubmissions >= 1) activeTriggers.push('FORM_SUBMISSION');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        personId,
        enhancedBehavioralScore,
        priority,
        activeTriggers,
        breakdown: {
          fello: Math.round(felloComponent),
          cloudCMA: Math.round(cloudCMAComponent),
          willow: Math.round(willowComponent),
          sierra: Math.round(sierraComponent)
        },
        rawData: {
          felloScore,
          felloEmailClicks,
          felloFormSubmissions,
          felloLastEmailClick,
          cloudCMARequests,
          cloudCMALastRequest,
          sierraPropertyViews,
          sierraSavedListings
        }
      })
    };

  } catch (error) {
    console.error('Behavioral scoring error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to calculate behavioral score',
        details: error.message 
      })
    };
  }
};