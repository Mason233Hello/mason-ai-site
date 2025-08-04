import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async (req, res) => {
  if (req.method === 'GET') {
    // 获取所有问题
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .is('answer', null)
      .order('created_at', { ascending: false });
    
    return res.status(200).json(data || []);
  }
  
  if (req.method === 'POST') {
    // 提交新问题
    const { question } = req.body;
    const user = JSON.parse(req.headers['x-user']);
    
    const { data, error } = await supabase
      .from('questions')
      .insert([{
        user_id: user.id,
        email: user.email,
        content: question,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      }]);
    
    return res.status(201).json({ success: true });
  }
  
  if (req.method === 'PUT') {
    // 更新问题答案
    const { answer } = req.body;
    const questionId = req.query.id;
    
    // 更新数据库
    await supabase
      .from('questions')
      .update({ answer })
      .eq('id', questionId);
    
    // 发送最终答案给用户
    const question = await supabase
      .from('questions')
      .select('user_id')
      .eq('id', questionId)
      .single();
    
    // 触发Pusher事件
    await fetch(`${process.env.VERCEL_URL}/api/pusher/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: question.data.user_id,
        answer
      })
    });
    
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).end();
};