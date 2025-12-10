import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from project root
const result = dotenv.config({ path: path.join(process.cwd(), '.env') });


console.log('--- Storage Configuration Debug ---');
console.log('Current Working Directory:', process.cwd());
console.log('Dotenv Load Result:', result.error ? 'Error' : 'Success');
if (result.error) console.error('Dotenv Error:', result.error.message);
console.log('BUCKET_NAME Check:', process.env.BUCKET_NAME ? 'OK (' + process.env.BUCKET_NAME + ')' : 'MISSING');
console.log('AWS_ACCESS Check:', process.env.AWS_ACCESS_KEY_ID ? 'OK (Present)' : 'MISSING');
console.log('AWS_SECRET Check:', process.env.AWS_SECRET_ACCESS_KEY ? 'OK (Present)' : 'MISSING');
console.log('-----------------------------------');

// Storage type is always S3
export const STORAGE_TYPE = 's3' as const;

// S3 configuration with whitespace trimming
export const S3_BUCKET_NAME = (process.env.BUCKET_NAME || '').trim();
export const S3_REGION = (process.env.BUCKET_REGION || 'ap-northeast-2').trim();

// Get S3 storage information
export function getStorageInfo(): {
  type: 's3';
  bucketName: string;
  region: string;
  configured: boolean;
} {
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

  return {
    type: 's3',
    bucketName: S3_BUCKET_NAME,
    region: S3_REGION,
    configured: !!(S3_BUCKET_NAME && accessKeyId && secretAccessKey),
  };
}

