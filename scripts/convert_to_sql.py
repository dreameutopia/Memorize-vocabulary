"""
将 vocabulary.json 转换为 data.sql
可以直接通过 wrangler d1 execute 导入数据库
"""

import json
import random

def escape_sql_string(s):
    """转义 SQL 字符串中的特殊字符"""
    if s is None:
        return ''
    # 替换单引号为两个单引号
    return str(s).replace("'", "''")

def main():
    print("开始读取 vocabulary.json...")
    
    # 读取 JSON 文件
    with open('vocabulary.json', 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    print(f"读取到 {len(words)} 个单词")
    
    # 打乱顺序
    shuffled_words = words.copy()
    random.shuffle(shuffled_words)
    
    print("正在生成 SQL 语句...")
    
    # 生成 SQL 文件
    with open('data.sql', 'w', encoding='utf-8') as f:
        # 写入注释
        f.write("-- 六级单词数据\n")
        f.write(f"-- 共 {len(shuffled_words)} 个单词\n")
        f.write(f"-- 已随机打乱顺序\n\n")
        
        # 批量插入，每100个一批
        batch_size = 100
        total_batches = (len(shuffled_words) + batch_size - 1) // batch_size
        
        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(shuffled_words))
            batch = shuffled_words[start_idx:end_idx]
            
            # 开始插入语句
            f.write(f"-- 批次 {batch_idx + 1}/{total_batches} (单词 {start_idx + 1}-{end_idx})\n")
            f.write("INSERT INTO vocabulary (id, word, phonetic, meaning, example, exampleCn, memorize, learned, reviewCount, random_order) VALUES\n")
            
            # 写入每个单词
            for i, word in enumerate(batch):
                word_id = word.get('id', 0)
                word_text = escape_sql_string(word.get('word', ''))
                phonetic = escape_sql_string(word.get('phonetic', ''))
                meaning = escape_sql_string(word.get('meaning', ''))
                example = escape_sql_string(word.get('example', ''))
                example_cn = escape_sql_string(word.get('exampleCn', ''))
                memorize = escape_sql_string(word.get('memorize', ''))
                learned = 1 if word.get('learned', False) else 0
                review_count = word.get('reviewCount', 0)
                random_order = start_idx + i
                
                # 生成 VALUES 行
                values = f"({word_id}, '{word_text}', '{phonetic}', '{meaning}', '{example}', '{example_cn}', '{memorize}', {learned}, {review_count}, {random_order})"
                
                # 如果是最后一个，用分号，否则用逗号
                if i == len(batch) - 1:
                    f.write(f"  {values};\n\n")
                else:
                    f.write(f"  {values},\n")
            
            # 进度提示
            if (batch_idx + 1) % 10 == 0:
                print(f"已处理 {batch_idx + 1}/{total_batches} 批次...")
    
    print(f"\n✅ 转换完成！")
    print(f"生成文件: data.sql")
    print(f"共 {len(shuffled_words)} 个单词")
    print(f"\n使用以下命令导入数据库:")
    print(f"  wrangler d1 execute cet6_vocabulary --file=./data.sql")
    print(f"\n或者本地导入:")
    print(f"  wrangler d1 execute cet6_vocabulary --local --file=./data.sql")

if __name__ == '__main__':
    main()
