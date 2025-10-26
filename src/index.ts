/**
 * 六级单词刷词软件后端 - Cloudflare Worker
 * 多租户系统，支持学习和复习模式
 */

interface Env {
  DB: D1Database;
}

interface UserStats {
  userId: string;
  studyDays: number;
  learnedCount: number;
  remainingCount: number;
}

interface Word {
  id: number;
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  exampleCn: string;
  memorize: string;
  learned: boolean;
  reviewCount: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 处理
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 路由处理
      if (path === '/api/user/register' && request.method === 'POST') {
        return handleCORS(await registerUser(request, env));
      }

      if (path === '/api/user/stats' && request.method === 'GET') {
        return handleCORS(await getUserStats(request, env));
      }

      if (path === '/api/words/learn' && request.method === 'GET') {
        return handleCORS(await getLearnWords(request, env));
      }

      if (path === '/api/words/submit' && request.method === 'POST') {
        return handleCORS(await submitWordResult(request, env));
      }

      if (path === '/api/words/review' && request.method === 'GET') {
        return handleCORS(await getReviewWords(request, env));
      }

      if (path === '/api/words/review-complete' && request.method === 'POST') {
        return handleCORS(await completeReview(request, env));
      }

      // 初始化数据库（仅用于测试）
      if (path === '/api/init' && request.method === 'POST') {
        return handleCORS(await initDatabase(request, env));
      }

      return handleCORS(jsonResponse({ success: false, error: 'Not found' }, 404));
    } catch (error: any) {
      console.error('Error:', error);
      return handleCORS(jsonResponse({ success: false, error: error.message }, 500));
    }
  },
};

// CORS 处理
function handleCORS(response?: Response): Response {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!response) {
    return new Response(null, { status: 204, headers });
  }

  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

// JSON 响应辅助函数
function jsonResponse(data: ApiResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// 1. 注册用户（接受设备ID，生成用户ID）
async function registerUser(request: Request, env: Env): Promise<Response> {
  const { deviceId } = await request.json() as { deviceId: string };

  if (!deviceId) {
    return jsonResponse({ success: false, error: 'Device ID is required' }, 400);
  }

  // 检查设备是否已注册
  const existing = await env.DB.prepare(
    'SELECT user_id FROM users WHERE device_id = ?'
  ).bind(deviceId).first();

  if (existing) {
    return jsonResponse({
      success: true,
      data: { userId: existing.user_id, message: 'User already exists' },
    });
  }

  // 生成新用户ID
  const userId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];

  await env.DB.prepare(
    'INSERT INTO users (user_id, device_id, study_days, learned_count, last_study_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, deviceId, 0, 0, today, new Date().toISOString()).run();

  return jsonResponse({
    success: true,
    data: { userId },
  });
}

// 2. 获取用户统计数据
async function getUserStats(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return jsonResponse({ success: false, error: 'User ID is required' }, 400);
  }

  // 获取用户信息
  const user = await env.DB.prepare(
    'SELECT user_id, study_days, learned_count, last_study_date FROM users WHERE user_id = ?'
  ).bind(userId).first();

  if (!user) {
    return jsonResponse({ success: false, error: 'User not found' }, 404);
  }

  // 检查是否需要更新学习天数
  const today = new Date().toISOString().split('T')[0];
  let studyDays = user.study_days as number;

  if (user.last_study_date !== today) {
    studyDays += 1;
    await env.DB.prepare(
      'UPDATE users SET study_days = ?, last_study_date = ? WHERE user_id = ?'
    ).bind(studyDays, today, userId).run();
  }

  // 获取总单词数
  const totalWords = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM vocabulary'
  ).first();

  const learnedCount = user.learned_count as number;
  const totalCount = (totalWords?.count as number) || 0;
  const remainingCount = Math.max(0, totalCount - learnedCount);

  const stats: UserStats = {
    userId: user.user_id as string,
    studyDays,
    learnedCount,
    remainingCount,
  };

  return jsonResponse({
    success: true,
    data: stats,
  });
}

// 3. 获取学习单词（每次20个）
async function getLearnWords(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return jsonResponse({ success: false, error: 'User ID is required' }, 400);
  }

  // 获取用户已学习数量
  const user = await env.DB.prepare(
    'SELECT learned_count FROM users WHERE user_id = ?'
  ).bind(userId).first();

  if (!user) {
    return jsonResponse({ success: false, error: 'User not found' }, 404);
  }

  const learnedCount = user.learned_count as number;
  const offset = learnedCount;

  // 获取接下来的20个单词
  const words = await env.DB.prepare(
    'SELECT id, word, phonetic, meaning, example, exampleCn, memorize, learned, reviewCount FROM vocabulary ORDER BY random_order LIMIT 20 OFFSET ?'
  ).bind(offset).all();

  return jsonResponse({
    success: true,
    data: {
      words: words.results || [],
      offset,
    },
  });
}

// 4. 提交单词学习结果
async function submitWordResult(request: Request, env: Env): Promise<Response> {
  const { userId, wordId, known } = await request.json() as {
    userId: string;
    wordId: number;
    known: boolean;
  };

  if (!userId || !wordId || known === undefined) {
    return jsonResponse({ success: false, error: 'Missing required parameters' }, 400);
  }

  // 更新用户已学习数量
  await env.DB.prepare(
    'UPDATE users SET learned_count = learned_count + 1 WHERE user_id = ?'
  ).bind(userId).run();

  // 如果不认识，添加到不认识的单词列表
  if (!known) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO unknown_words (user_id, word_id, created_at) VALUES (?, ?, ?)'
    ).bind(userId, wordId, new Date().toISOString()).run();
  }

  return jsonResponse({
    success: true,
    data: { message: 'Word result submitted successfully' },
  });
}

// 5. 获取复习单词（随机最多20个）
async function getReviewWords(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return jsonResponse({ success: false, error: 'User ID is required' }, 400);
  }

  // 获取用户不认识的单词，随机选择最多20个
  const words = await env.DB.prepare(`
    SELECT v.id, v.word, v.phonetic, v.meaning, v.example, v.exampleCn, v.memorize, v.learned, v.reviewCount
    FROM vocabulary v
    INNER JOIN unknown_words uw ON v.id = uw.word_id
    WHERE uw.user_id = ?
    ORDER BY RANDOM()
    LIMIT 20
  `).bind(userId).all();

  return jsonResponse({
    success: true,
    data: {
      words: words.results || [],
      count: words.results?.length || 0,
    },
  });
}

// 6. 完成复习（移除已掌握的单词）
async function completeReview(request: Request, env: Env): Promise<Response> {
  const { userId, wordId } = await request.json() as {
    userId: string;
    wordId: number;
  };

  if (!userId || !wordId) {
    return jsonResponse({ success: false, error: 'Missing required parameters' }, 400);
  }

  // 从不认识列表中删除
  await env.DB.prepare(
    'DELETE FROM unknown_words WHERE user_id = ? AND word_id = ?'
  ).bind(userId, wordId).run();

  return jsonResponse({
    success: true,
    data: { message: 'Word removed from review list' },
  });
}

// 初始化数据库（导入单词数据）
async function initDatabase(request: Request, env: Env): Promise<Response> {
  const { words } = await request.json() as { words: Word[] };

  if (!words || !Array.isArray(words)) {
    return jsonResponse({ success: false, error: 'Invalid words data' }, 400);
  }

  // 打乱单词顺序
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  // 批量插入单词
  const batchSize = 100;
  for (let i = 0; i < shuffledWords.length; i += batchSize) {
    const batch = shuffledWords.slice(i, i + batchSize);
    
    for (const [index, word] of batch.entries()) {
      const randomOrder = i + index;
      await env.DB.prepare(`
        INSERT OR IGNORE INTO vocabulary 
        (id, word, phonetic, meaning, example, exampleCn, memorize, learned, reviewCount, random_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        word.id,
        word.word,
        word.phonetic,
        word.meaning,
        word.example || '',
        word.exampleCn || '',
        word.memorize || '',
        word.learned ? 1 : 0,
        word.reviewCount || 0,
        randomOrder
      ).run();
    }
  }

  return jsonResponse({
    success: true,
    data: { message: `Initialized ${shuffledWords.length} words` },
  });
}
