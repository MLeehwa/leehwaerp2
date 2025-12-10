const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
console.log('Reading .env from:', envPath);

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Replace or append BUCKET_REGION with us-east-2 (Ohio)
    if (content.match(/^BUCKET_REGION=/m)) {
        content = content.replace(/^BUCKET_REGION=.*/m, 'BUCKET_REGION=us-east-2');
        console.log('Replaced existing BUCKET_REGION with us-east-2');
    } else {
        content += '\nBUCKET_REGION=us-east-2';
        console.log('Appended BUCKET_REGION=us-east-2');
    }

    fs.writeFileSync(envPath, content);
    console.log('✅ Updated .env successfully to us-east-2 (Ohio).');
} catch (err) {
    console.error('❌ Failed to update .env:', err);
    process.exit(1);
}
