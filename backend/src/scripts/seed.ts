import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

/**
 * Seed script for development data
 */

async function main(): Promise<void> {
  console.log('🌱 Context Builder Seed Script');
  console.log(`   Database: ${env.postgres.database}@${env.postgres.host}`);
  console.log('');

  const pool = new Pool({
    host: env.postgres.host,
    port: env.postgres.port,
    database: env.postgres.database,
    user: env.postgres.user,
    password: env.postgres.password
  });

  try {
    // Create demo user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('demo1234', 12);
    
    await pool.query(`
      INSERT INTO users (id, email, password_hash, nickname)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, [userId, 'demo@example.com', passwordHash, 'Demo User']);
    
    console.log('✅ Created demo user: demo@example.com / demo1234');

    // Get user ID (in case it already existed)
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@example.com']
    );
    const actualUserId = userResult.rows[0].id;

    // Create demo subscription
    await pool.query(`
      INSERT INTO subscriptions (user_id, plan, queries_remaining)
      VALUES ($1, 'monthly', 50)
      ON CONFLICT (user_id) DO UPDATE SET 
        plan = 'monthly',
        queries_remaining = 50
    `, [actualUserId]);
    
    console.log('✅ Created monthly subscription with 50 queries');

    // Create demo chats
    const chat1Id = uuidv4();
    const chat2Id = uuidv4();
    const chat3Id = uuidv4();

    await pool.query(`
      INSERT INTO chats (id, user_id, title, position_x, position_y)
      VALUES 
        ($1, $4, 'Аналитика продукта', 100, 100),
        ($2, $4, 'Дизайн интерфейса', 400, 100),
        ($3, $4, 'Техническая архитектура', 250, 300)
    `, [chat1Id, chat2Id, chat3Id, actualUserId]);
    
    console.log('✅ Created 3 demo chats');

    // Add messages to chats
    const messages = [
      // Chat 1: Analytics
      { chatId: chat1Id, role: 'user', content: 'Какие ключевые метрики нам нужно отслеживать?' },
      { chatId: chat1Id, role: 'assistant', content: 'Для продукта типа "Конструктор контекста" рекомендую:\n\n1. **DAU/MAU** — ежедневные и месячные активные пользователи\n2. **Retention** — возвращаемость на 1, 7, 30 день\n3. **Количество супер-чатов на пользователя** — показывает глубину использования\n4. **Средний контекст** — сколько чатов объединяют в один супер-чат\n5. **Конверсия в платную подписку** — из free в monthly/yearly' },
      { chatId: chat1Id, role: 'user', content: 'Отлично! А какой целевой retention мы должны ставить?' },
      { chatId: chat1Id, role: 'assistant', content: 'Для SaaS-продуктов с AI-функционалом типичные бенчмарки:\n\n- D1 retention: 40-50%\n- D7 retention: 25-35%\n- D30 retention: 15-25%\n\nНо учитывая уникальность продукта (объединение контекстов), вы можете целиться выше. Ключ — демонстрировать ценность в первой же сессии.' },
      
      // Chat 2: Design
      { chatId: chat2Id, role: 'user', content: 'Какую цветовую схему использовать для карты проекта?' },
      { chatId: chat2Id, role: 'assistant', content: 'Предлагаю следующую палитру:\n\n**Основные цвета:**\n- Обычные чаты: синий (#3B82F6)\n- Супер-чаты: фиолетовый (#8B5CF6) — чтобы выделялись\n- Связи (стрелки): серый (#6B7280)\n\n**Состояния:**\n- Выбранный узел: яркая обводка (#F59E0B)\n- При наведении: небольшое увеличение и тень\n\n**Фон:**\n- Светлая тема: #F9FAFB с точечной сеткой\n- Тёмная тема: #1F2937' },
      { chatId: chat2Id, role: 'user', content: 'А как визуально показать выбранные сообщения?' },
      { chatId: chat2Id, role: 'assistant', content: 'Для индикации выбранных сообщений:\n\n1. **В узле чата** — бейдж "✓ 3/45" (выбрано/всего)\n2. **На ребре (стрелке)** — при наведении показываем tooltip "5 сообщений"\n3. **В панели чата** — галочки слева от каждого сообщения\n4. **Цвет выбранных** — лёгкий фон (#EEF2FF) и галочка слева\n\nТакже можно добавить счётчик токенов внизу: "~2400 токенов выбрано"' },
      
      // Chat 3: Architecture
      { chatId: chat3Id, role: 'user', content: 'Какую базу данных использовать для графа контекста?' },
      { chatId: chat3Id, role: 'assistant', content: 'Рекомендую **гибридный подход**:\n\n1. **PostgreSQL** — для реляционных данных:\n   - Пользователи, подписки, сообщения\n   - ACID-транзакции, надёжность\n\n2. **Neo4j** — для графа контекста:\n   - Узлы: Chat, SuperChat\n   - Рёбра: INCLUDES, LINKED_TO\n   - Быстрые запросы связей\n\n3. **Redis** — для:\n   - Кэш контекста\n   - Сессии и JWT blacklist\n   - Real-time через Pub/Sub' },
      { chatId: chat3Id, role: 'user', content: 'Как организовать сбор контекста из нескольких чатов?' },
      { chatId: chat3Id, role: 'assistant', content: 'Алгоритм сбора контекста для супер-чата:\n\n```\n1. Получить все связи (context_links) супер-чата\n2. Для каждой связи:\n   a. Если есть selected_messages → взять только их\n   b. Иначе → взять последние N сообщений чата\n3. Отсортировать по времени создания\n4. Сформировать промт:\n   - System: инструкции для ИИ\n   - Context: "Из чата [название]: [сообщения]"\n   - User: текущий вопрос\n5. Проверить лимит токенов, при необходимости сжать\n```\n\nКлючевое — сохранять информацию об источнике каждого фрагмента.' }
    ];

    for (const msg of messages) {
      const tokenCount = Math.ceil(msg.content.length / 4);
      await pool.query(`
        INSERT INTO messages (chat_id, role, content, token_count, is_selected)
        VALUES ($1, $2, $3, $4, $5)
      `, [msg.chatId, msg.role, msg.content, tokenCount, msg.role === 'assistant']);
    }
    
    console.log(`✅ Created ${messages.length} demo messages`);

    // Create demo super-chat
    const superChatId = uuidv4();
    
    await pool.query(`
      INSERT INTO super_chats (id, user_id, title, position_x, position_y, color)
      VALUES ($1, $2, 'Запуск MVP', 250, 500, '#8B5CF6')
    `, [superChatId, actualUserId]);
    
    console.log('✅ Created demo super-chat');

    // Create context links
    const link1Id = uuidv4();
    const link2Id = uuidv4();
    
    await pool.query(`
      INSERT INTO context_links (id, super_chat_id, source_chat_id, link_type)
      VALUES 
        ($1, $4, $2, 'chat'),
        ($3, $4, $5, 'chat')
    `, [link1Id, chat1Id, link2Id, superChatId, chat3Id]);
    
    console.log('✅ Created context links');

    // Create notification config
    await pool.query(`
      INSERT INTO notification_configs (user_id, telegram_chat_id, email)
      VALUES ($1, NULL, 'demo@example.com')
      ON CONFLICT (user_id) DO NOTHING
    `, [actualUserId]);
    
    console.log('✅ Created notification config');

    console.log('');
    console.log('🎉 Seed complete!');
    console.log('');
    console.log('Demo credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo1234');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
