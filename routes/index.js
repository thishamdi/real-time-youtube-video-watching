import express from 'express';
import { getMessages } from '../services/chat.service.js';
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Video Watch API');
});

router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/chat/:roomId', async (req, res) => {
    try {
        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        
        const { data, error } = await getMessages(req.params.roomId);
        if (error) throw error;
        res.json({ messages: data || [] }); // Ensure we always return an array
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

export default router;