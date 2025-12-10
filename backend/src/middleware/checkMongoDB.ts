import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * MongoDB 연결 확인 미들웨어
 * MongoDB가 연결되지 않았으면 503 에러 반환
 */
export const checkMongoDB = (req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      message: '데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.',
      error: 'DATABASE_CONNECTION_ERROR'
    });
  }
  next();
};

