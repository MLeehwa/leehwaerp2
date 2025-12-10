import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = express.Router();

/**
 * GET /api/admin/database/collections
 * 모든 컬렉션 목록 조회
 */
router.get('/collections', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    res.json(collectionNames);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/database/:collection
 * 특정 컬렉션의 데이터 조회 (SQL SELECT와 유사)
 */
router.get('/:collection', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { collection } = req.params;
    const { 
      page = '1', 
      limit = '50', 
      sort = '_id', 
      order = 'desc',
      search,
      filter 
    } = req.query;

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collectionObj = db.collection(collection);
    
    // 쿼리 빌드
    let query: any = {};
    
    // 검색어가 있으면 모든 필드에서 검색
    if (search) {
      query.$or = [
        { _id: { $regex: search as string, $options: 'i' } },
      ];
    }
    
    // 필터 파싱 (JSON 형식)
    if (filter) {
      try {
        const filterObj = JSON.parse(filter as string);
        query = { ...query, ...filterObj };
      } catch (e) {
        // 필터 파싱 실패 시 무시
      }
    }

    // 정렬 설정
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: any = { [sort as string]: sortOrder };

    // 페이지네이션
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // 데이터 조회
    const [data, total] = await Promise.all([
      collectionObj.find(query).sort(sortObj).skip(skip).limit(limitNum).toArray(),
      collectionObj.countDocuments(query),
    ]);

    // ObjectId를 문자열로 변환
    const formattedData = data.map((doc: any) => {
      const formatted = { ...doc };
      if (doc._id) {
        formatted._id = doc._id.toString();
      }
      // 모든 ObjectId 필드를 문자열로 변환
      Object.keys(formatted).forEach(key => {
        if (mongoose.Types.ObjectId.isValid(formatted[key]) && formatted[key].toString().length === 24) {
          formatted[key] = formatted[key].toString();
        }
      });
      return formatted;
    });

    res.json({
      data: formattedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/database/:collection/:id
 * 특정 문서 조회
 */
router.get('/:collection/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { collection, id } = req.params;

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collectionObj = db.collection(collection);
    const doc = await collectionObj.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!doc) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다' });
    }

    // ObjectId를 문자열로 변환
    const formatted: any = { ...doc };
    if (doc._id) {
      formatted._id = doc._id.toString();
    }
    Object.keys(formatted).forEach(key => {
      if (mongoose.Types.ObjectId.isValid(formatted[key]) && formatted[key].toString().length === 24) {
        formatted[key] = formatted[key].toString();
      }
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/admin/database/:collection/:id
 * 문서 수정 (SQL UPDATE와 유사)
 */
router.put('/:collection/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { collection, id } = req.params;
    const updateData = req.body;

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collectionObj = db.collection(collection);
    
    // ObjectId 필드 변환
    const processedData: any = { ...updateData };
    Object.keys(processedData).forEach(key => {
      // ObjectId 형식의 문자열이면 ObjectId로 변환
      if (typeof processedData[key] === 'string' && 
          mongoose.Types.ObjectId.isValid(processedData[key]) && 
          processedData[key].toString().length === 24) {
        processedData[key] = new mongoose.Types.ObjectId(processedData[key]);
      }
    });

    // _id는 제외
    delete processedData._id;

    const result = await collectionObj.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: processedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다' });
    }

    // 업데이트된 문서 반환
    const updatedDoc = await collectionObj.findOne({ _id: new mongoose.Types.ObjectId(id) });
    const formatted: any = { ...updatedDoc };
    if (updatedDoc?._id) {
      formatted._id = updatedDoc._id.toString();
    }

    res.json({ message: '문서가 수정되었습니다', data: formatted });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/admin/database/:collection/:id
 * 문서 삭제 (SQL DELETE와 유사)
 */
router.delete('/:collection/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { collection, id } = req.params;

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collectionObj = db.collection(collection);
    const result = await collectionObj.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다' });
    }

    res.json({ message: '문서가 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/admin/database/:collection
 * 새 문서 생성 (SQL INSERT와 유사)
 */
router.post('/:collection', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { collection } = req.params;
    const insertData = req.body;

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const collectionObj = db.collection(collection);
    
    // ObjectId 필드 변환
    const processedData: any = { ...insertData };
    Object.keys(processedData).forEach(key => {
      if (key === '_id' && processedData[key]) {
        processedData[key] = new mongoose.Types.ObjectId(processedData[key]);
      } else if (typeof processedData[key] === 'string' && 
                 mongoose.Types.ObjectId.isValid(processedData[key]) && 
                 processedData[key].toString().length === 24) {
        processedData[key] = new mongoose.Types.ObjectId(processedData[key]);
      }
    });

    const result = await collectionObj.insertOne(processedData);
    const insertedDoc = await collectionObj.findOne({ _id: result.insertedId });
    
    const formatted: any = { ...insertedDoc };
    if (insertedDoc?._id) {
      formatted._id = insertedDoc._id.toString();
    }

    res.status(201).json({ message: '문서가 생성되었습니다', data: formatted });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

