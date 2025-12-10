
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        return;
    }

    console.log('Checking available models with key ending in...', apiKey.slice(-4));

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Note: older SDKs might not have listModels directly exposed on the main class or might differ.
        // However, user is supposed to be on 'latest'.
        // If this fails, it might be due to SDK version. 
        // We can also try a raw fetch if SDK fails.

        // Using raw fetch to be independent of SDK version quirks for listing
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json() as { models?: Array<{ name: string; supportedGenerationMethods: string[] }> };
        console.log('✅ Available Models:');
        if (data.models) {
            data.models.forEach((m) => {
                console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods})`);
            });
        } else {
            console.log('No models found in response:', data);
        }

    } catch (error) {
        console.error('❌ Error listing models:', error);
    }
}

listModels();
