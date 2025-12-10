
const https = require('https');
const path = require('path');
const fs = require('fs');

// Simple .env parser since we can't rely on dotenv being effectively loaded in this standalone script contexts sometimes
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '../../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                if (key && val && !process.env[key]) {
                    process.env[key] = val;
                }
            }
        });
    } catch (e) {
        console.error('Error loading .env:', e.message);
    }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ API KEY NOT FOUND');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Querying: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error('❌ API Error:', json.error);
            } else if (json.models) {
                console.log('✅ Available Models:');
                json.models.forEach(m => {
                    // Filter for generateContent support
                    if (m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`- ${m.name} (Ver: ${m.version})`);
                    }
                });
            } else {
                console.log('❓ Unexpected response:', json);
            }
        } catch (e) {
            console.error('❌ Parse Error:', e.message, data);
        }
    });

}).on('error', (err) => {
    console.error('❌ Request Error:', err.message);
});
