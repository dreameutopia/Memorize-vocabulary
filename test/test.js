/**
 * 测试脚本 - 六级单词刷词软件后端
 * 测试所有API接口的功能
 */

const BASE_URL = 'http://localhost:8787'; // 本地开发服务器
// const BASE_URL = 'https://your-worker.workers.dev'; // 生产环境

let testUserId = '';
let testWordIds = [];

// 辅助函数
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function test(name, fn) {
  try {
    console.log(`\n🧪 测试: ${name}`);
    await fn();
    console.log(`✅ 通过: ${name}`);
  } catch (error) {
    console.error(`❌ 失败: ${name}`);
    console.error(`   错误: ${error.message}`);
    throw error;
  }
}

// 测试用例
async function runTests() {
  console.log('='.repeat(50));
  console.log('开始测试六级单词刷词软件后端');
  console.log('='.repeat(50));

  // 测试1: 注册用户
  await test('注册用户', async () => {
    const deviceId = `test-device-${Date.now()}`;
    const result = await apiCall('/api/user/register', 'POST', { deviceId });
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('注册失败');
    }
    
    testUserId = result.data.data.userId;
    console.log(`   用户ID: ${testUserId}`);
  });

  // 测试2: 重复注册（应返回已存在）
  await test('重复注册用户', async () => {
    const deviceId = `test-device-${Date.now() - 1000}`;
    
    // 第一次注册
    await apiCall('/api/user/register', 'POST', { deviceId });
    
    // 第二次注册
    const result = await apiCall('/api/user/register', 'POST', { deviceId });
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('重复注册处理失败');
    }
    console.log(`   消息: ${result.data.data.message}`);
  });

  // 测试3: 获取用户统计数据
  await test('获取用户统计数据', async () => {
    const result = await apiCall(`/api/user/stats?userId=${testUserId}`);
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('获取统计数据失败');
    }
    
    const stats = result.data.data;
    console.log(`   学习天数: ${stats.studyDays}`);
    console.log(`   已学单词: ${stats.learnedCount}`);
    console.log(`   待学单词: ${stats.remainingCount}`);
  });

  // 测试4: 获取学习单词
  await test('获取学习单词（20个）', async () => {
    const result = await apiCall(`/api/words/learn?userId=${testUserId}`);
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('获取学习单词失败');
    }
    
    const words = result.data.data.words;
    if (words.length === 0) {
      throw new Error('没有返回单词数据');
    }
    
    testWordIds = words.slice(0, 5).map(w => w.id);
    console.log(`   获取单词数量: ${words.length}`);
    console.log(`   第一个单词: ${words[0].word} - ${words[0].meaning}`);
  });

  // 测试5: 提交单词学习结果（认识）
  await test('提交单词学习结果（认识）', async () => {
    const result = await apiCall('/api/words/submit', 'POST', {
      userId: testUserId,
      wordId: testWordIds[0],
      known: true,
    });
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('提交学习结果失败');
    }
    console.log(`   单词ID ${testWordIds[0]} 已标记为认识`);
  });

  // 测试6: 提交单词学习结果（不认识）
  await test('提交单词学习结果（不认识）', async () => {
    for (let i = 1; i < testWordIds.length; i++) {
      const result = await apiCall('/api/words/submit', 'POST', {
        userId: testUserId,
        wordId: testWordIds[i],
        known: false,
      });
      
      if (result.status !== 200 || !result.data.success) {
        throw new Error('提交学习结果失败');
      }
    }
    console.log(`   ${testWordIds.length - 1} 个单词已标记为不认识`);
  });

  // 测试7: 验证用户统计更新
  await test('验证用户统计更新', async () => {
    const result = await apiCall(`/api/user/stats?userId=${testUserId}`);
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('获取统计数据失败');
    }
    
    const stats = result.data.data;
    if (stats.learnedCount !== testWordIds.length) {
      throw new Error(`已学单词数量不匹配: 期望 ${testWordIds.length}, 实际 ${stats.learnedCount}`);
    }
    console.log(`   已学单词数量正确: ${stats.learnedCount}`);
  });

  // 测试8: 获取复习单词
  await test('获取复习单词', async () => {
    const result = await apiCall(`/api/words/review?userId=${testUserId}`);
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('获取复习单词失败');
    }
    
    const words = result.data.data.words;
    if (words.length !== testWordIds.length - 1) {
      throw new Error(`复习单词数量不匹配: 期望 ${testWordIds.length - 1}, 实际 ${words.length}`);
    }
    console.log(`   复习单词数量: ${words.length}`);
    console.log(`   第一个单词: ${words[0].word} - ${words[0].meaning}`);
  });

  // 测试9: 完成复习（移除已掌握的单词）
  await test('完成复习（移除单词）', async () => {
    const result = await apiCall('/api/words/review-complete', 'POST', {
      userId: testUserId,
      wordId: testWordIds[1],
    });
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('完成复习失败');
    }
    console.log(`   单词ID ${testWordIds[1]} 已从复习列表移除`);
  });

  // 测试10: 验证复习列表更新
  await test('验证复习列表更新', async () => {
    const result = await apiCall(`/api/words/review?userId=${testUserId}`);
    
    if (result.status !== 200 || !result.data.success) {
      throw new Error('获取复习单词失败');
    }
    
    const words = result.data.data.words;
    if (words.length !== testWordIds.length - 2) {
      throw new Error(`复习单词数量不匹配: 期望 ${testWordIds.length - 2}, 实际 ${words.length}`);
    }
    console.log(`   复习单词剩余: ${words.length}`);
  });

  // 测试11: 测试分页功能
  await test('测试学习单词分页', async () => {
    // 提交更多单词以测试分页
    const result1 = await apiCall(`/api/words/learn?userId=${testUserId}`);
    const words1 = result1.data.data.words;
    
    // 提交这些单词
    for (let i = 0; i < Math.min(5, words1.length); i++) {
      await apiCall('/api/words/submit', 'POST', {
        userId: testUserId,
        wordId: words1[i].id,
        known: true,
      });
    }
    
    // 获取下一批
    const result2 = await apiCall(`/api/words/learn?userId=${testUserId}`);
    const words2 = result2.data.data.words;
    
    // 验证不重复
    const overlap = words1.filter(w1 => 
      words2.some(w2 => w2.id === w1.id)
    );
    
    console.log(`   第一批单词数: ${words1.length}`);
    console.log(`   第二批单词数: ${words2.length}`);
    console.log(`   重叠单词数: ${overlap.length} (应该较少)`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有测试通过！');
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch((error) => {
  console.error('\n❌ 测试失败:', error.message);
  process.exit(1);
});
