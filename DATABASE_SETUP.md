# Настройка базы данных

## Требования

- PostgreSQL 14+
- Node.js 18+

## Шаги установки

### 1. Создание базы данных

```sql
CREATE DATABASE tahocrm;
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tahocrm"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Генерация Prisma клиента

```bash
npx prisma generate
```

### 4. Применение миграций

```bash
npx prisma migrate dev --name init
```

Или для продакшена:

```bash
npx prisma migrate deploy
```

### 5. Создание первого супер-администратора

```bash
npm run create-admin
```

Или через Prisma Studio:

```bash
npx prisma studio
```

## Структура подписок

### Планы подписки

- **BASIC** - Базовый план
  - До 5 пользователей
  - До 50 транспортных средств
  - До 100 заказов в месяц

- **PROFESSIONAL** - Профессиональный
  - До 20 пользователей
  - До 200 транспортных средств
  - До 500 заказов в месяц

- **ENTERPRISE** - Корпоративный
  - Неограниченно пользователей
  - Неограниченно транспортных средств
  - Неограниченно заказов

### Статусы подписки

- **TRIAL** - Пробный период (обычно 14-30 дней)
- **ACTIVE** - Активная подписка
- **SUSPENDED** - Приостановлена (не оплачено)
- **CANCELLED** - Отменена
- **EXPIRED** - Истекла
- **BLOCKED** - Заблокирована администратором

## Управление мастерскими

### Создание новой мастерской

Через API или напрямую в базе:

```sql
INSERT INTO "Tenant" (
  id, name, inn, email, phone,
  "subscriptionStatus", "subscriptionPlan",
  "subscriptionStartDate", "subscriptionEndDate",
  "trialEndDate", "isActive", "maxUsers", "maxVehicles", "maxOrdersPerMonth"
) VALUES (
  'clx...', 'Название мастерской', '1234567890', 'email@example.com', '+79991234567',
  'TRIAL', 'BASIC',
  NOW(), NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '30 days', true, 5, 50, 100
);
```

### Блокировка мастерской

Через админ-панель или API:

```typescript
POST /api/admin/tenants/{id}/block
{
  "reason": "Неоплата подписки"
}
```

### Разблокировка

```typescript
POST / api / admin / tenants / { id } / unblock
```

## Контроль доступа

Система автоматически проверяет:

- Активность мастерской
- Статус подписки
- Срок действия подписки
- Лимиты использования

Все проверки выполняются через `lib/tenant-check.ts`

## Мониторинг

### Проверка статусов подписок

```sql
SELECT
  name,
  "subscriptionStatus",
  "subscriptionEndDate",
  "isBlocked",
  "currentUsersCount",
  "maxUsers"
FROM "Tenant"
WHERE "subscriptionStatus" IN ('SUSPENDED', 'EXPIRED')
  OR "isBlocked" = true;
```

### Статистика по подпискам

```sql
SELECT
  "subscriptionPlan",
  "subscriptionStatus",
  COUNT(*) as count
FROM "Tenant"
GROUP BY "subscriptionPlan", "subscriptionStatus";
```

## Автоматизация

### Ежедневная проверка подписок

Создайте cron job или scheduled task:

```typescript
// scripts/check-subscriptions.ts
import { prisma } from '../lib/prisma'

async function checkSubscriptions() {
  const expiredTenants = await prisma.tenant.findMany({
    where: {
      subscriptionEndDate: {
        lt: new Date(),
      },
      subscriptionStatus: {
        not: 'EXPIRED',
      },
    },
  })

  for (const tenant of expiredTenants) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: 'EXPIRED',
        isActive: false,
      },
    })
  }
}
```

### Сброс счетчиков заказов

Выполняется автоматически при проверке лимитов, но можно запустить вручную:

```typescript
// В начале каждого месяца
await prisma.tenant.updateMany({
  data: {
    ordersThisMonth: 0,
    lastResetDate: new Date(),
  },
})
```
