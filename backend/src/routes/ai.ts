import express, { Request, Response } from 'express';
import { aiService } from '../services/AiService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/chat', authenticate, async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        const response = await aiService.chat(messages);
        res.json(response);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
