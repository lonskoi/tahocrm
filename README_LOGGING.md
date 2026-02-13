# Система логирования и проверки

## Логирование

> Актуальный статус (2026-02-13): текущая реализация в `lib/logger.ts` пишет логи в stdout/stderr (`console.log/warn/error`).
> Файлы в `logs/` из примеров ниже могут отсутствовать, если не настроен внешний файловый транспорт.

### Структура логов

Логи сохраняются в папке `logs/`:

- `application-YYYY-MM-DD.log` - общие логи
- `error-YYYY-MM-DD.log` - только ошибки
- `exceptions.log` - необработанные исключения
- `rejections.log` - необработанные промисы

### Использование

```typescript
import { logger, logApiRequest, logWithContext } from '@/lib/logger'

// Простое логирование
logger.info('Сообщение')
logger.error('Ошибка', { error })

// Логирование API запросов
logApiRequest('GET', '/api/tasks', userId, tenantId)

// Логирование с контекстом
logWithContext('info', 'Действие выполнено', {
  userId: 'user-1',
  tenantId: 'tenant-1',
  action: 'CREATE_TASK',
  entityType: 'Task',
  entityId: 'task-1',
})
```

### Уровни логирования

- `error` - Критические ошибки
- `warn` - Предупреждения
- `info` - Информационные сообщения
- `debug` - Отладочная информация

Уровень задается через `LOG_LEVEL` в `.env`:

```env
LOG_LEVEL=debug
```

## Автоматические проверки

### Запуск всех проверок

```bash
npm run check-all
```

Этот скрипт выполняет:

1. ✅ Проверку типов TypeScript
2. ✅ Линтинг кода (ESLint)
3. ✅ Запуск тестов (Jest)
4. ✅ Проверку сборки (Next.js build)

### Отдельные проверки

```bash
# Проверка типов
npm run type-check

# Линтинг
npm run lint
npm run lint:fix  # с автоисправлением

# Тесты
npm run test
npm run test:watch  # в режиме наблюдения
npm run test:coverage  # с покрытием
```

## Pre-commit hooks

При коммите автоматически запускаются:

- ESLint с автоисправлением
- Prettier для форматирования
- Проверка типов

Настройка через Husky и lint-staged.

## Структура логов в API

Каждый API route должен логировать:

1. **Начало запроса**

```typescript
logger.info('GET /api/tasks - Starting request', { path, timestamp })
```

2. **Проверка авторизации**

```typescript
if (!session?.user) {
  logger.warn('GET /api/tasks - Unauthorized', { path })
  throw new ApiError(401, 'Unauthorized')
}
```

3. **Проверка доступа**

```typescript
const accessCheck = await checkTenantAccess(tenantId)
if (!accessCheck.allowed) {
  logger.warn('GET /api/tasks - Tenant access denied', {
    tenantId,
    reason: accessCheck.reason,
  })
}
```

4. **Успешное выполнение**

```typescript
logger.info('GET /api/tasks - Success', {
  tenantId,
  userId,
  taskCount: tasks.length,
  duration: `${Date.now() - startTime}ms`,
})
```

5. **Обработка ошибок**

```typescript
catch (error) {
  logger.error('GET /api/tasks - Error', {
    error: error.message,
    stack: error.stack,
    duration: `${Date.now() - startTime}ms`,
  })
  return handleApiError(error, { method: 'GET', path, userId, tenantId })
}
```

## Тестирование

### Структура тестов

Тесты находятся в `__tests__/` и должны покрывать:

- API routes
- Утилиты
- Компоненты (опционально)

### Пример теста

```typescript
describe('API Tasks', () => {
  it('should return 401 if not authenticated', async () => {
    // Arrange
    mockGetServerSession(null)

    // Act
    const response = await GET(request)

    // Assert
    expect(response.status).toBe(401)
  })
})
```

## Мониторинг

### Просмотр логов в реальном времени

```bash
# Все логи
tail -f logs/application-*.log

# Только ошибки
tail -f logs/error-*.log
```

### Поиск в логах

```bash
# Поиск по пользователю
grep "userId.*user-1" logs/application-*.log

# Поиск ошибок за сегодня
grep "$(date +%Y-%m-%d)" logs/error-*.log

# Поиск по действию
grep "CREATE_TASK" logs/application-*.log
```

## Best Practices

1. **Всегда логируйте начало и конец операций**
2. **Включайте контекст (userId, tenantId, entityId)**
3. **Логируйте длительность выполнения**
4. **Используйте правильные уровни логирования**
5. **Не логируйте чувствительные данные (пароли, токены)**
6. **Используйте структурированное логирование (JSON)**
7. **Тестируйте критичные части кода**

## CI/CD

В CI/CD пайплайне автоматически запускаются:

- `npm run check-all` перед деплоем
- Тесты на каждый PR
- Проверка типов и линтера
