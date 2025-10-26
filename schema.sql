-- 六级单词刷词软件 - 数据库初始化脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    study_days INTEGER DEFAULT 0,
    learned_count INTEGER DEFAULT 0,
    last_study_date TEXT,
    created_at TEXT NOT NULL
);

-- 为设备ID创建索引，加快查询
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- 单词表
CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    exampleCn TEXT,
    memorize TEXT,
    learned INTEGER DEFAULT 0,
    reviewCount INTEGER DEFAULT 0,
    random_order INTEGER NOT NULL
);

-- 为随机顺序创建索引，加快分页查询
CREATE INDEX IF NOT EXISTS idx_vocabulary_random_order ON vocabulary(random_order);

-- 不认识的单词关联表
CREATE TABLE IF NOT EXISTS unknown_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    word_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (word_id) REFERENCES vocabulary(id),
    UNIQUE(user_id, word_id)
);

-- 为用户ID和单词ID创建索引，加快查询和去重
CREATE INDEX IF NOT EXISTS idx_unknown_words_user_id ON unknown_words(user_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_word_id ON unknown_words(word_id);
CREATE INDEX IF NOT EXISTS idx_unknown_words_user_word ON unknown_words(user_id, word_id);
