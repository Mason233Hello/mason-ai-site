import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async (req, res) => {
  if (req.method === 'POST') {
    const { userId, text, answer } = req.body;
    
    if (text) {
      // 发送打字效果
      await pusher.trigger(`private-${userId}`, 'ai-answer', {
        typing: true,
        text
      });
    }
    
    if (answer) {
      // 发送最终答案
      await pusher.trigger(`private-${userId}`, 'ai-answer', {
        final: true,
        answer
      });
      
      // 通知管理员有新答案
      await pusher.trigger('private-admin', 'answer-sent', {
        userId,
        answer
      });
    }
    
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).end();
};