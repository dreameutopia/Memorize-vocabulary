/**
 * 初始化数据库脚本
 * 读取vocabulary.json并导入到数据库
 */

const fs = require('fs');
const path = require('path');

// 配置
const WORKER_URL = 'http://localhost:8787'; // 本地开发服务器
// const WORKER_URL = 'https://your-worker.workers.dev'; // 生产环境

async function initializeDatabase() {
  console.log('开始初始化数据库...');
  
  // 读取vocabulary.json
  const vocabularyPath = path.join(__dirname, '..', 'vocabulary.json');
  console.log(`读取单词文件: ${vocabularyPath}`);
  
  const vocabularyData = fs.readFileSync(vocabularyPath, 'utf-8');
  const words = JSON.parse(vocabularyData);
  
  console.log(`共读取 ${words.length} 个单词`);
  
  // 调用初始化API
  console.log('正在上传单词数据到Worker...');
  
  const response = await fetch(`${WORKER_URL}/api/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ words }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ 数据库初始化成功!');
    console.log(`   ${result.data.message}`);
  } else {
    console.error('❌ 数据库初始化失败:', result.error);
    process.exit(1);
  }
}

// 运行初始化
initializeDatabase().catch((error) => {
  console.error('❌ 初始化失败:', error.message);
  process.exit(1);
});
