import multer from 'multer';

// S3 Interface
export interface IStorageProvider {
    upload(file: Express.Multer.File, folder?: string): Promise<IUploadResult>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
}

export interface IUploadResult {
    key: string;      // S3 Key
    location: string; // S3 Key (same as key for S3)
    provider: 's3';
}

// Implement S3Provider using aws-sdk
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

class S3StorageProvider implements IStorageProvider {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        const region = process.env.BUCKET_REGION || 'ap-northeast-2';
        this.bucketName = process.env.BUCKET_NAME || '';

        if (!this.bucketName) {
            console.warn('⚠️  BUCKET_NAME is not configured. S3 storage will not work.');
        }

        // AWS Credentials are automatically loaded from env vars:
        // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
        this.s3Client = new S3Client({ region });
    }

    async upload(file: Express.Multer.File, folder: string = 'uploads'): Promise<IUploadResult> {
        if (!this.bucketName) {
            throw new Error("BUCKET_NAME is not configured. Please set BUCKET_NAME in .env");
        }

        const filename = `${Date.now()}-${file.originalname}`;
        // S3 keys use forward slashes, avoid backslashes
        const key = `${folder}/${filename}`.replace(/\\/g, '/');

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client.send(command);

        // Return the S3 key as both key and location
        return {
            key: key,
            location: key,
            provider: 's3'
        };
    }

    async download(key: string): Promise<Buffer> {
        if (!this.bucketName) {
            throw new Error("BUCKET_NAME is not configured");
        }

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw new Error(`File not found in S3: ${key}`);
        }

        // Convert stream to buffer
        const stream = response.Body as Readable;
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    async delete(key: string): Promise<void> {
        if (!this.bucketName) {
            throw new Error("BUCKET_NAME is not configured");
        }

        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key
        });

        await this.s3Client.send(command);
    }
}

class StorageService {
    private provider: S3StorageProvider;

    constructor() {
        // Always use S3 storage
        this.provider = new S3StorageProvider();
        console.log('✅ Storage Service initialized with S3 provider');
    }

    // Configurable multer upload middleware
    public getMulterUpload() {
        // Always use memory storage to handle files in buffer
        // Then upload method sends buffer to S3
        return multer({ storage: multer.memoryStorage() });
    }

    public async uploadFile(file: Express.Multer.File, folder?: string): Promise<IUploadResult> {
        return this.provider.upload(file, folder);
    }

    public async downloadFile(key: string): Promise<Buffer> {
        return this.provider.download(key);
    }

    public async deleteFile(key: string): Promise<void> {
        return this.provider.delete(key);
    }

    // Get S3 bucket information
    public getBucketInfo() {
        return {
            bucketName: process.env.BUCKET_NAME || '',
            region: process.env.BUCKET_REGION || 'ap-northeast-2',
            configured: !!(process.env.BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
        };
    }
}

export const storageService = new StorageService();
