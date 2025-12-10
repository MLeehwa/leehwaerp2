
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const bucketName = process.env.BUCKET_NAME;
const region = process.env.BUCKET_REGION || 'ap-northeast-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

console.log('--- S3 Debug Info ---');
console.log('Bucket:', bucketName);
console.log('Region:', region);
console.log('AccessKeyLength:', accessKeyId?.length);
console.log('SecretKeyLength:', secretAccessKey?.length);

if (!bucketName || !accessKeyId || !secretAccessKey) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

const s3 = new S3Client({
    region: region,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    }
});

async function runDebug() {
    try {
        console.log('Attempting HeadBucket...');
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log('✅ HeadBucket Success!');
    } catch (error: any) {
        console.error('❌ HeadBucket Failed:', error.name, error.message);
        if (error.$metadata) console.error('Metadata:', error.$metadata);
    }

    try {
        console.log('Attempting ListObjects...');
        await s3.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));
        console.log('✅ ListObjects Success!');
    } catch (error: any) {
        console.error('❌ ListObjects Failed:', error.name, error.message);
    }
}

runDebug();
