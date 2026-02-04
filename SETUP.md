# Инструкция по настройке tahoCRM

## Предварительные требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## Шаги установки

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE tahocrm;
```

### 3. Настройка переменных окружения

Скопируйте `env.example` в `.env` и заполните:

```bash
# Windows (PowerShell)
Copy-Item env.example .env

# Linux/Mac
cp env.example .env
```

Обязательно укажите:

- `DATABASE_URL` - строка подключения к PostgreSQL
- `NEXTAUTH_SECRET` - секретный ключ (сгенерируйте: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - URL вашего приложения

### 4. Применение миграций

```bash
# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate dev --name init
```

### 5. Создание первого пользователя

Создайте скрипт для создания первого пользователя (супер-админа):

```typescript
// scripts/create-admin.ts
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const password = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@tahocrm.ru',
      password,
      name: 'Администратор',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log('Admin created:', admin)
}

main()
```

Запустите:

```bash
npx tsx scripts/create-admin.ts
```

### 6. Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

Быстрый рабочий процесс:

- Обычно используйте `npm run dev` (Turbopack, максимально быстрый для разработки).
- Когда меняли Prisma schema / БД или после «странностей» — используйте `npm run start:verified`.
  - Чтобы принудительно сбросить кэш Next.js: `CLEAR_NEXT_CACHE=1 npm run start:verified`

## Создание мастерской (Tenant)

После входа как супер-админ, создайте первую мастерскую через API или напрямую в базе данных:

```sql
INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt")
VALUES ('clx...', 'Название мастерской', NOW(), NOW());
```

Затем создайте пользователя для этой мастерской.

## Структура ролей

- **SUPER_ADMIN** - Владелец платформы, доступ ко всем данным
- **MANAGER** - Менеджер мастерской
- **MASTER** - Мастер-установщик
- **CARD_SPECIALIST** - Специалист по картам
- **DIRECTOR** - Руководитель мастерской
- **CLIENT** - Клиент (перевозчик)

## Развертывание на Beget VPS

1. Подготовьте Dockerfile и docker-compose.yml
2. Настройте переменные окружения на сервере
3. Запустите миграции: `npx prisma migrate deploy`
4. Запустите приложение через Docker

## Дополнительные настройки

### Email для напоминаний

Настройте SMTP в `.env` для отправки уведомлений о триггерах.

### Логирование

Все действия пользователей логируются в таблицу `AuditLog` автоматически.

## Поддержка

При возникновении проблем проверьте:

- Логи приложения
- Подключение к базе данных
- Правильность переменных окружения
- Статус миграций Prisma
