import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { checkMongoDB } from '../middleware/checkMongoDB';
import Notification from '../models/Notification';

const router = express.Router();

/**
 * GET /api/notifications
 * 알림 목록 조회
 */
router.get('/', checkMongoDB, async (req: Request, res: Response) => {
  try {
    
    const { section, isResolved, priority, includeOverdue } = req.query;
    
    let query: any = {};
    
    // 섹션 필터
    if (section && section !== 'all') {
      query.$or = [
        { section: section },
        { section: 'all' },
      ];
    }
    
    // 해결 여부 필터
    if (isResolved !== undefined) {
      if (isResolved === 'all') {
        // 전체 조회 - isResolved 필터를 적용하지 않음
      } else if (isResolved === 'true') {
        query.isResolved = true;
      } else {
        query.isResolved = false;
      }
    } else {
      // 기본적으로 미해결 항목만
      query.isResolved = false;
    }
    
    // 우선순위 필터
    if (priority) {
      query.priority = priority;
    }
    
    // 날짜 지난 항목 포함 여부
    // includeOverdue가 true면 마감일이 지난 항목도 포함
    if (includeOverdue === 'true') {
      const overdueCondition = {
        $or: [
          { dueDate: { $exists: false } },
          { dueDate: { $lte: new Date() } },
        ],
      };
      
      // 기존 조건과 결합
      if (Object.keys(query).length > 0) {
        query.$and = query.$and || [];
        query.$and.push(overdueCondition);
      } else {
        Object.assign(query, overdueCondition);
      }
    }

    const notifications = await Notification.find(query)
      .populate('resolvedBy', 'username email')
      .sort({ priority: -1, dueDate: 1, createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/notifications/section/:section
 * 특정 섹션의 알림 조회 (날짜 임박/지난 항목 포함)
 */
router.get('/section/:section', checkMongoDB, async (req: Request, res: Response) => {
  try {
    
    const { section } = req.params;
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3일 후

    const query: any = {
      isResolved: false,
      $or: [
        { section: section },
        { section: 'all' },
      ],
      $and: [
        {
          $or: [
            { dueDate: { $exists: false } }, // 마감일 없음
            { dueDate: { $lte: threeDaysLater } }, // 3일 이내 또는 지난 항목
          ],
        },
      ],
    };

    const notifications = await Notification.find(query)
      .populate('resolvedBy', 'username email')
      .sort({ 
        priority: -1, 
        dueDate: 1, // 마감일 임박순
        createdAt: -1 
      });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/notifications/path/:path
 * 특정 경로의 알림 조회 (경로에서 섹션 추출)
 */
router.get('/path/*', checkMongoDB, async (req: Request, res: Response) => {
  try {
    
    // 경로 파라미터 추출 - req.path에서 /path 제거
    // req.path는 /path/sales/invoices 형태
    let path = req.path.replace(/^\/path/, '') || '/';
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // 경로에서 섹션 추출
    let section = 'sales';
    if (path.startsWith('/accounting/')) section = 'accounting';
    else if (path.startsWith('/purchase/')) section = 'purchase';
    else if (path.startsWith('/master-data/') || path.startsWith('/master/')) section = 'master-data';
    else if (path.startsWith('/admin/')) section = 'admin';
    else if (path.startsWith('/operation/')) section = 'operation';
    else if (path.startsWith('/maintenance/')) section = 'maintenance';
    else if (path.startsWith('/hr/')) section = 'hr';
    else if (path.startsWith('/production/')) section = 'production';
    else if (path.startsWith('/quality/')) section = 'quality';
    
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3일 후

    const query: any = {
      isResolved: false,
      $or: [
        { section: section },
        { section: 'all' },
      ],
      $and: [
        {
          $or: [
            { dueDate: { $exists: false } }, // 마감일 없음
            { dueDate: { $lte: threeDaysLater } }, // 3일 이내 또는 지난 항목
          ],
        },
      ],
    };

    const notifications = await Notification.find(query)
      .populate('resolvedBy', 'username email')
      .sort({ 
        priority: -1, 
        dueDate: 1,
        createdAt: -1 
      });

    res.json(notifications);
  } catch (error: any) {
    console.error('경로 기반 알림 조회 오류:', error);
    console.error('요청 경로:', req.path);
    console.error('요청 URL:', req.url);
    res.status(500).json({ 
      message: error.message || '알림 조회 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/notifications
 * 알림 생성
 */
router.post(
  '/',
  checkMongoDB,
  [
    body('title').trim().notEmpty().withMessage('제목을 입력하세요.'),
    body('message').trim().notEmpty().withMessage('내용을 입력하세요.'),
    body('section').notEmpty().withMessage('섹션을 선택하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.create({
        ...req.body,
        section: req.body.section.toLowerCase(),
      });

      res.status(201).json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/notifications/:id/resolve
 * 알림 해결 처리
 */
router.put('/:id/resolve', checkMongoDB, async (req: Request, res: Response) => {
  try {
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.body.userId || null,
      },
      { new: true }
    )
      .populate('resolvedBy', 'username email');

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/notifications/:id/unresolve
 * 알림 미해결로 되돌리기 (다시 보기)
 */
router.put('/:id/unresolve', checkMongoDB, async (req: Request, res: Response) => {
  try {
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        isResolved: false,
        resolvedAt: undefined,
        resolvedBy: undefined,
      },
      { new: true }
    )
      .populate('resolvedBy', 'username email');

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/notifications/:id
 * 알림 수정
 */
router.put('/:id', checkMongoDB, async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        section: req.body.section?.toLowerCase(),
      },
      { new: true, runValidators: true }
    )
      .populate('resolvedBy', 'username email');

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/notifications/:id
 * 알림 삭제
 */
router.delete('/:id', checkMongoDB, async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    res.json({ message: '알림이 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

