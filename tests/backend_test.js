// tests/backend_test.js
const fs = require('fs');
const path = require('path');

// MOCK GLOBAL FETCH
global.fetch = async (url, options) => {
    console.log(`[FETCH] ${options.method} ${url}`);
    if (options.body) console.log(`[BODY] ${options.body}`);

    // Mock Response based on URL
    if (url.includes('/notes')) {
        return {
            ok: true,
            json: async () => ({ id: 12345, body: JSON.parse(options.body).body })
        };
    }
    if (url.includes('/people/')) {
        // Mock Person Data
        return {
            ok: true,
            json: async () => ({
                person: {
                    id: 999,
                    customFelloLeadScore: 85, // Should trigger HIGH_FELLO_SCORE
                    customFelloEmailClicks: 10,
                    customCloudCMARequestCount: 3
                }
            })
        };
    }

    return { ok: false, status: 404, statusText: 'Not Found' };
};

// Mock Environment
process.env.FUB_API_KEY = 'mock_key';

// Helper to load function
const loadFunction = (name) => require(`../netlify/functions/${name}`);

async function runTests() {
    console.log('=== STARTING BACKEND TESTS ===\n');

    // TEST 1: Log Action
    console.log('--- Test 1: log-action.js ---');
    try {
        const logAction = loadFunction('log-action');
        const result = await logAction.handler({
            httpMethod: 'POST',
            body: JSON.stringify({ personId: 999, noteBody: 'Test Note Content' })
        });
        console.log('Result:', result.statusCode, result.body);
        if (result.statusCode === 200) console.log('✅ PASS: Log Action');
        else console.log('❌ FAIL: Log Action');
    } catch (e) {
        console.error('❌ FAIL: Log Action Code Error', e);
    }

    // TEST 2: Behavioral Scoring
    console.log('\n--- Test 2: behavioral-scoring.js ---');
    try {
        const scoring = loadFunction('behavioral-scoring');
        const result = await scoring.handler({
            httpMethod: 'POST',
            body: JSON.stringify({ personId: 999 })
        });
        const body = JSON.parse(result.body);
        console.log('Score:', body.enhancedBehavioralScore);
        console.log('Triggers:', body.activeTriggers);

        if (body.activeTriggers.includes('HIGH_FELLO_SCORE')) console.log('✅ PASS: Trigger Detection');
        else console.log('❌ FAIL: Trigger Detection');
    } catch (e) {
        console.error('❌ FAIL: Scoring Code Error', e);
    }

    console.log('\n=== TESTS COMPLETE ===');
}

runTests();
