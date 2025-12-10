
import { getStorageInfo } from '../config/storage';

console.log('Running Env Check Script...');
const info = getStorageInfo();
console.log('Storage Info:', JSON.stringify(info, null, 2));

if (info.configured) {
    console.log('✅ S3 Configured Correctly');
} else {
    console.log('❌ S3 Configuration Missing');
    console.log('Required: BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
}
