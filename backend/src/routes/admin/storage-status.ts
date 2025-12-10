import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { getStorageInfo } from '../../config/storage';
import { storageService } from '../../services/StorageService';
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

/**
 * GET /api/admin/storage-status
 * S3 저장소 상태 확인 및 DB 상태 확인
 */
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const storageInfo = getStorageInfo();
    const bucketInfo = storageService.getBucketInfo();

    // DB 상태 확인
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      state: mongoose.connection.readyState
    };

    // S3 클라이언트 초기화
    const s3Client = new S3Client({
      region: bucketInfo.region
    });

    let bucketExists = false;
    let bucketAccessible = false;
    let writeTest = false;
    let errorMessage = '';
    let errorDetails: any = null;

    // S3 버킷 존재 및 접근 권한 확인
    if (bucketInfo.configured && bucketInfo.bucketName) {
      try {
        // HeadBucket으로 버킷 존재 및 접근 권한 확인
        await s3Client.send(new HeadBucketCommand({
          Bucket: bucketInfo.bucketName
        }));
        bucketExists = true;
        bucketAccessible = true;
      } catch (error: any) {
        errorDetails = {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          ...error
        };

        if (error.name === 'NotFound') {
          errorMessage = '버킷이 존재하지 않습니다';
        } else if (error.name === 'Forbidden') {
          errorMessage = '버킷 접근 권한이 없습니다';
        } else {
          errorMessage = error.message || 'S3 연결 오류';
        }
      }


      // 쓰기 권한 테스트
      if (bucketAccessible) {
        try {
          const testKey = `.write-test-${Date.now()}.txt`;

          // 테스트 파일 업로드
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketInfo.bucketName,
            Key: testKey,
            Body: Buffer.from('S3 write test'),
            ContentType: 'text/plain'
          }));

          // 테스트 파일 삭제
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketInfo.bucketName,
            Key: testKey
          }));

          writeTest = true;
        } catch (error: any) {
          errorMessage = errorMessage || `쓰기 테스트 실패: ${error.message}`;
          // 쓰기 에러도 캡처
          if (!errorDetails) {
            errorDetails = {
              name: error.name,
              message: error.message,
              code: error.code,
              ...error
            };
          }
        }
      }
    } else {
      errorMessage = 'S3 자격 증명이 설정되지 않았습니다';
    }

    res.json({
      storageType: 's3',
      bucketName: bucketInfo.bucketName,
      region: bucketInfo.region,
      configured: bucketInfo.configured,
      bucketExists,
      bucketAccessible,
      writeTest,
      credentials: {
        accessKeyConfigured: !!process.env.AWS_ACCESS_KEY_ID,
        secretKeyConfigured: !!process.env.AWS_SECRET_ACCESS_KEY,
        bucketNameConfigured: !!bucketInfo.bucketName,
        regionConfigured: !!bucketInfo.region,
      },
      message: errorMessage || (bucketAccessible ? 'S3 저장소가 정상적으로 연결되었습니다' : 'S3 저장소 연결에 실패했습니다'),
      details: errorDetails,
      dbStatus
    });
  } catch (error: any) {
    console.error('Storage status check failed:', error);
    // 에러의 모든 속성을 포함하여 반환 (디버깅용)
    const errorDetails = {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      ...error
    };

    res.status(500).json({
      message: '저장소 상태 확인 중 오류가 발생했습니다',
      error: error.message,
      details: errorDetails
    });
  }
});

/**
 * POST /api/admin/storage-status/test-write
 * S3 저장소 쓰기 테스트
 */
router.post('/test-write', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { testContent } = req.body;
    const bucketInfo = storageService.getBucketInfo();

    if (!bucketInfo.configured) {
      return res.status(400).json({
        success: false,
        message: 'S3 자격 증명이 설정되지 않았습니다'
      });
    }

    const s3Client = new S3Client({
      region: bucketInfo.region
    });

    const testFileName = `test-${Date.now()}.txt`;
    const testKey = `test/${testFileName}`;
    const content = testContent || 'S3 연결 테스트 파일';

    try {
      // 테스트 파일 생성
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketInfo.bucketName,
        Key: testKey,
        Body: Buffer.from(content, 'utf-8'),
        ContentType: 'text/plain'
      }));

      // 파일 삭제
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketInfo.bucketName,
        Key: testKey
      }));

      res.json({
        success: true,
        message: 'S3 저장소 쓰기/삭제 테스트 성공',
        testFile: testFileName,
        testKey: testKey,
        content,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'S3 저장소 쓰기 테스트 실패',
        error: error.message,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
