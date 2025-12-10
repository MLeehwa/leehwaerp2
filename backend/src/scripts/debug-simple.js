
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env from current directory
const envPath = path.join(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const region = process.env.BUCKET_REGION || 'ap-northeast-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.BUCKET_NAME;

console.log('--- Config Check ---');
console.log('Bucket:', bucketName ? `'${bucketName}'` : 'MISSING');
console.log('Region:', region ? `'${region}'` : 'MISSING');
console.log('AccessKey:', accessKeyId ? `'${accessKeyId.substring(0, 4)}...' (len: ${accessKeyId.length})` : 'MISSING');
console.log('SecretKey:', secretAccessKey ? `(len: ${secretAccessKey.length})` : 'MISSING');

if (!accessKeyId || !secretAccessKey) {
    console.log('❌ Credentials missing!');
    process.exit(1);
}

const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
});

console.log('Sending HeadBucket...');
s3.send(new HeadBucketCommand({ Bucket: bucketName }))
    .then(() => console.log('✅ SUCCESS! Connection Verified.'))
    .catch(err => {
        console.error('❌ ERROR:', err.name);
        console.error('Message:', err.message);
        if (err.$metadata) console.error('Status:', err.$metadata.httpStatusCode);
    });
