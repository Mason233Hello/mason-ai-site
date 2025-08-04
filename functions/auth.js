import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 生成 JWT 令牌的函数
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'your-strong-secret-key',
    { expiresIn: '7d' } // 令牌有效期7天
  );
};

// 主处理函数
export default async (req, res) => {
  // 设置 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  try {
    const { action, email, password } = req.body;

    // 验证输入
    if (!action || !email || !password) {
      return res.status(400).json({ error: '缺少必要参数: action, email 或 password' });
    }

    // 根据 action 类型处理
    switch (action) {
      case 'register':
        return await handleRegister(req, res, email, password);
      case 'login':
        return await handleLogin(req, res, email, password);
      default:
        return res.status(400).json({ error: '无效的 action 类型' });
    }
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
};

// 处理用户注册
async function handleRegister(req, res, email, password) {
  try {
    // 检查邮箱是否已存在
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    // 对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password: hashedPassword,
        created_at: new Date().toISOString()
      }])
      .select('id, email')
      .single();

    if (insertError) throw insertError;

    // 生成 JWT 令牌
    const token = generateToken(newUser.id, newUser.email);

    // 返回成功响应
    return res.status(201).json({
      success: true,
      message: '用户注册成功',
      user: {
        id: newUser.id,
        email: newUser.email
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    return res.status(500).json({ error: '注册失败', details: error.message });
  }
}

// 处理用户登录
async function handleLogin(req, res, email, password) {
  try {
    // 查找用户
    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('id, email, password')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 生成 JWT 令牌
    const token = generateToken(user.id, user.email);

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({ error: '登录失败', details: error.message });
  }
}
