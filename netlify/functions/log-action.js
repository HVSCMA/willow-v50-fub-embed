// Log Action to FUB Notes
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
        const { personId, noteBody } = JSON.parse(event.body);

        if (!personId || !noteBody) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'personId and noteBody required' })
            };
        }

        // Create Note in FUB
        const response = await fetch(`${FUB_API_BASE}/notes`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(FUB_API_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personId: parseInt(personId),
                body: noteBody
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FUB API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                noteId: data.id,
                message: 'Note logged successfully'
            })
        };

    } catch (error) {
        console.error('Log action error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to log action',
                details: error.message
            })
        };
    }
};
