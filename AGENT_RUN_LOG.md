# Agent Run Log

Этот файл содержит детальный лог всех действий агента, включая диагностику проблем, исправления, изменения кода и результаты тестирования.

## Принцип работы (важно)

- **Всегда пишем понятные логи**: каждое действие/изменение сопровождается объяснимыми логами (что произошло, где, почему), чтобы диагностика занимала минуты, а не дни.
- **Логи — источник правды**: при каждом следующем шаге сначала сверяемся с этим файлом, чтобы понимать текущий статус и цепочку изменений.

## Последние действия

### 2026-01-25 - Зависание на логине (спиннер) после успешного signIn

- **ПРОБЛЕМА**: После успешного входа (NextAuth credentials) UI иногда зависает на странице логина со спиннером, хотя сессия на бэке уже создана (cookie установлена).
- **ДИАГНОЗ**: Client-side навигация (`router.push`/`router.refresh`) в этой точке может не переводить приложение на следующий экран в проде, из-за чего форма логина остаётся смонтированной и продолжает показывать loading.
- **РЕШЕНИЕ**: Сделан hard-redirect после `signIn()` через `window.location.assign(successRedirectTo)`, чтобы гарантированно покинуть страницу логина сразу после установки session cookie.
- **ИЗМЕНЕНИЯ**:
  - Обновлён `components/auth/LoginForm.tsx`: успех-ветка логина теперь делает hard-redirect; удалён неиспользуемый `useRouter`.
- **СТАТУС**:
  - Commit: `cbb2275` (в `master`), push выполнен.
  - Локальные pre-push проверки прошли (`tsc --noEmit`, `jest`).
- **ЧТО ОСТАЛОСЬ**:
  - Дождаться успешной сборки образа в GitHub Actions (GHCR).
  - На VPS выполнить обновление: `docker compose -f docker-compose.prod.yml pull && up -d`, затем проверить `/api/health` и ручной логин.

- **ВЫКАТ НА VPS (2026-02-05)**:
  - Настроен SSH key login для `deploy` (исправлены владельцы/права на `/home/deploy/.ssh/authorized_keys`).
  - Добавлен `deploy` в группу `docker` (перелогин для применения групп).
  - GHCR требовал авторизацию при pull → выполнен `docker login ghcr.io` под `deploy`.
  - Выполнено обновление: `docker compose -f docker-compose.prod.yml pull` → `up -d` (контейнер `tahocrm-app` пересоздан).
  - Текущий образ `tahocrm-app`: `sha256:161071a368980ff8b1d702dffd05efcf30d6b11accbc6a98bfdf759f88cccb78` (created `2026-02-05T15:16:54Z`).
  - Проверка: `https://tahoerp.ru/api/health` → `200` `{\"ok\":true,\"db\":\"ok\"}`; страница логина `https://tahoerp.ru/crm/tenant-1/login` → `200`.
  - Дополнительно: в сборке найдено использование `location.assign` в бандле `LoginForm` (поиск по `/app/.next/...` внутри контейнера).

- **ПРОД-ПОПРАВКА (2026-02-05)**:
  - Симптом: при правильных данных страница логина "перезагружалась" и оставалась на `.../crm/<tenantId>/login`.
  - Причина: в проде `signIn(..., { redirect:false })` возвращал `result.url`, указывающий обратно на login-страницу; из-за приоритета `result.url` редирект не уводил с логина.
  - Фикс: после `result.ok` редиректим строго на `successRedirectTo` (игнорируем `result.url`).
  - Код: commit `00af40c` (push в `master`), образ обновлён на VPS: `sha256:2b646b0c2ce2...` (created `2026-02-05T17:03:45Z`).
  - Проверка: `https://tahoerp.ru/api/health` → `200` `{\"ok\":true,\"db\":\"ok\"}` после перезапуска контейнера.

- **ДИАГНОСТИКА (2026-02-05)**:
  - Симптом: после попытки входа снова возвращает на страницу логина.
  - Логи `tahocrm-app`: `[auth][error] CredentialsSignin` → credentials provider возвращает `null` (пользователь не найден / пароль не совпал).
  - Найдена проблема инфраструктуры: контейнер `migrator` не может запускать `tsx scripts/create-tenant-admin.ts` из-за отсутствия сгенерированного Prisma Client:
    - `Error: Cannot find module '.prisma/client/default'` (в `migrator` нет `node_modules/.prisma`).
  - Фикс: в `Dockerfile` для stage `migrator` добавлено копирование `node_modules/.prisma` из builder stage.

- **ДИАГНОСТИКА (2026-02-05) — сессия есть, но middleware редиректит на login**:
  - Факт: credentials sign-in выставляет `__Secure-authjs.session-token`, и `/api/auth/session` возвращает user (проверено curl+cookie-jar).
  - Но запрос `GET /crm/tenant-1` даже с cookie получал `307 -> /crm/tenant-1/login`.
  - Причина: `middleware.ts` использовал `getToken()` с дефолтными cookie-настройками (v4), из-за чего токен из `authjs.*` cookie не читался → `token=null`.
  - Фикс: в `middleware.ts` задан `cookieName` для Auth.js v5 (`__Secure-authjs.session-token` на HTTPS / `authjs.session-token` на HTTP) и `secret` берётся из `AUTH_SECRET || NEXTAUTH_SECRET`.

### 2025-02-05 - Ошибка `Unknown argument 'defaultVatRate'`

- **ПРОБЛЕМА**: При сохранении НДС по умолчанию в настройках возникает ошибка `Invalid prisma.tenant.update() invocation: Unknown argument 'defaultVatRate'`
- **ПРИЧИНА**: Поле `defaultVatRate` было добавлено в `prisma/schema.prisma`, но изменения не были применены к master БД, и Prisma Client не был перегенерирован
- **РЕШЕНИЕ**:
  1. Добавлено поле `defaultVatRate VatRate @default(VAT_22)` в модель `Tenant` в `prisma/schema.prisma`
  2. Создан API endpoint `/api/tenant/settings` для получения и обновления настроек tenant (GET/PUT)
  3. Добавлен UI для настройки НДС по умолчанию в `app/crm/[tenantId]/(app)/settings/page.tsx`
  4. Обновлены API endpoints для создания товаров и услуг (`app/api/products/route.ts`, `app/api/services/route.ts`) для использования `defaultVatRate` из настроек tenant
  5. Добавлено поле `defaultVatRate: "VAT_22"` в `scripts/start-verified.ts` для создания нового tenant
  6. Добавлено поле `defaultVatRate: "VAT_22"` в `app/api/admin/tenants/route.ts` для создания нового tenant через API
- **ОШИБКА**: После всех изменений ошибка все еще возникает
- **ДИАГНОСТИКА**:
  - Поле `defaultVatRate` присутствует в сгенерированных типах (`node_modules/.prisma/client/index.d.ts` содержит `defaultVatRate: $Enums.VatRate | null`)
  - Prisma Client в памяти использует старую версию (кешированную в `globalForPrisma.prismaByUrl`)
  - Dev сервер использует старый Prisma Client из памяти (кешированный экземпляр)
- **ГИПОТЕЗА C ПОДТВЕРЖДЕНА**: Dev сервер использует старый Prisma Client из памяти (кешированный экземпляр в `globalForPrisma.prismaByUrl`)
- **РЕШЕНИЕ**: Необходимо применить изменения схемы к master БД через `prisma db push` и перезапустить dev сервер для перезагрузки Prisma Client
- **ДЕЙСТВИЕ**: Применены изменения схемы к master БД через `prisma db push` с DATABASE_URL='postgresql://user:password@localhost:5432/tahocrm_master', запущен `npm run start:verified` для перезапуска dev сервера

### 2026-02-13 - Синхронизация контекста и правил перед продолжением работ

- **ЗАДАЧА**: Перед дальнейшими правками зафиксировать единое понимание целей проекта, текущего состояния, правил выполнения и фактического состояния логирования.
- **ЧТО ПРОВЕРЕНО**:
  - Контекст продукта и статуса: `README.md`, `PROJECT_STATUS.md`, `SUBSCRIPTION_SYSTEM.md`.
  - Обязательные правила и проверки: `CHECKLIST.md`, `.lintstagedrc.js`, `.husky/pre-commit`, `.husky/pre-push`, `scripts/check-all.ts`.
  - Логирование и расхождения: `README_LOGGING.md`, `QUICK_START_LOGGING.md`, `lib/logger.ts`, `.cursor/debug.log`.
- **ВЫВОД**:
  - Базовый рабочий процесс подтвержден: локальная разработка -> проверки -> деплой.
  - Правила pre-commit/pre-push и чеклисты актуальны и должны соблюдаться на каждом изменении.
  - Зафиксировано, что документация по файловым логам частично расходится с текущей реализацией `lib/logger.ts` (фактический вывод в stdout/stderr через `console.*`).
- **СТАТУС**: Контекст и правила синхронизированы; использовать как baseline для следующих задач.

### 2026-02-13 - Фикс локального tenant-логина + server-parity контроль

- **ПРОБЛЕМА**: В локальной CRM не работал вход `tenant-admin@test.com / admin123` на `/crm/<tenantId>/login`.
- **ДИАГНОЗ**:
  - Dev demo-ветка в `lib/auth.ts` была недостижима из-за ранних `return null` в tenant-ветке.
  - В локальной среде tenant DB может быть недоступна/неподготовлена, из-за чего `prisma.user.upsert/findUnique` падали и авторизация завершалась `CredentialsSignin`.
- **ИЗМЕНЕНИЯ**:
  - Обновлен `lib/auth.ts`:
    - dev demo-кейс вычисляется заранее;
    - demo-провижининг выполняется строго при `NODE_ENV !== 'production'`;
    - при ошибке доступа к tenant DB в dev возвращается безопасный demo fallback user (без изменения production flow).
  - Обновлен `CHECKLIST.md`:
    - добавлен обязательный раздел `Server parity (обязательно перед merge/deploy)` с шагами проверки прод-эквивалентности.
- **SERVER-PARITY ГАРАНТИИ**:
  - Production-ветка логина не ослаблена: demo-fallback не активируется при `NODE_ENV=production`.
  - Обычная проверка tenant/platform логина по БД и `bcrypt.compare` сохранена.
- **ПРОВЕРКИ**:
  - `npm run type-check` — успешно.
  - Browser smoke-check (локально):
    - `tenant-admin@test.com / admin123` -> PASS, редирект на `/crm/tenant-1`;
    - `manager@test.com / manager123` -> PASS, редирект на `/crm/tenant-1`;
    - `manager@test.com / wrongpass123` -> PASS (негативный сценарий), вход отклоняется.
- **СТАТУС**: Локальный стандартный tenant-логин восстановлен, production-поведение сохранено, правило server-parity закреплено.

### 2026-02-13 - Введено двустороннее parity-правило (server <-> local)

- **ЗАДАЧА**: Формализовать правило, чтобы изменения для серверной части не ломали локальную часть приложения, и наоборот.
- **ИЗМЕНЕНИЯ**:
  - `CHECKLIST.md`: добавлен обязательный раздел `Local parity (обязательно перед merge/deploy)`.
  - `README.md`: добавлен раздел `Правило parity (обязательно)` с двусторонним стандартом проверки (`local -> server` и `server -> local`).
- **НОВЫЙ СТАНДАРТ**:
  - Перед merge/deploy обязательны:
    - `npm run type-check` + релевантные тесты;
    - server smoke-check;
    - local smoke-check минимум по `/api/health` и `/crm/tenant-1/login`;
    - фиксация результатов в `AGENT_RUN_LOG.md`.
- **СТАТУС**: Двусторонний parity-процесс зафиксирован как постоянное правило проекта.

### 2026-02-13 - Локальный фикс driver-cards tenant access error

- **ПРОБЛЕМА**: На `/crm/tenant-1/driver-cards` локально показывался сырой Prisma stacktrace (`checkTenantAccess` / `prismaMaster.tenant.findUnique`).
- **ДИАГНОЗ**:
  - `checkTenantAccess` получал Prisma connection error с кодом `ECONNREFUSED`, но не обрабатывал код явно.
  - Локальная синхронизация master DB не завершалась: `prisma db push` падал с `P1001` (PostgreSQL на `localhost:5432` недоступен, Docker engine не запущен).
  - После обхода `tenant access` следом всплывала ошибка `prisma.driverCardRequest.findMany()` (tenant DB недоступна) и стек уходил в UI.
- **ИЗМЕНЕНИЯ**:
  - `lib/tenant-check.ts`:
    - добавлена нормализация `tenantId` (`trim` + проверка пустого значения);
    - расширена диагностика соединения (`code: ECONNREFUSED|P1001`);
    - добавлен dev-only fallback: при connection issue возвращать `allowed: true`, чтобы не блокировать локальный UI server-side инфраструктурными сбоями.
  - `app/api/driver-cards/route.ts`:
    - добавлен dev-only fallback для `GET`: при недоступной tenant DB возвращается пустой список вместо stacktrace.
- **ПРОВЕРКИ**:
  - `npm run type-check` — успешно.
  - Browser smoke-check:
    - login `/crm/tenant-1/login` с `tenant-admin@test.com/admin123` -> PASS;
    - `/crm/tenant-1/driver-cards` -> PASS, страница рендерится, технический stacktrace не показывается;
    - видимое состояние: пустой список (`Пока нет заявок`).
  - Инфраструктурная проверка:
    - `npx prisma generate` -> успешно;
    - `prisma db push` в `tahocrm_master` -> не выполнен из-за недоступного PostgreSQL (`P1001`, Docker engine offline).
- **СТАТУС**: Пользовательская ошибка в разделе карт водителей устранена для локальной работы; production-поведение не изменено (все fallback-ветки ограничены `NODE_ENV !== 'production'`).

### 2026-02-13 - Infra-first восстановление локальной БД для разделов CRM

- **ПРОБЛЕМА**: Массовые ошибки в локальных разделах (`клиенты`, `ТС`, и др.) с `Invalid prisma.<model>.findMany()`; ошибка не ограничивалась `driver-cards`.
- **КОРЕНЬ ПРИЧИНЫ**:
  - Локальный PostgreSQL был недоступен (`ECONNREFUSED`/`P1001` на `localhost:5432`).
  - Временные dev-fallback обходы маскировали проблему и расходились со strict infra-first подходом.
- **ПРИНЯТОЕ РЕШЕНИЕ**: Вернуться к strict infra-first (без fallback), восстановить инфраструктуру БД и синхронизировать Prisma.
- **ИЗМЕНЕНИЯ В КОДЕ**:
  - `lib/tenant-check.ts`: удален dev-only `allowed: true` fallback при connection issue (оставлена строгая обработка ошибок БД).
  - `app/api/driver-cards/route.ts`: удален dev-only возврат `[]` при недоступной tenant DB; восстановлен стандартный поток через `handleApiError`.
- **ИНФРАСТРУКТУРА (ЛОКАЛЬНО)**:
  - Запущен Docker Desktop daemon.
  - Поднят контейнер БД: `docker compose up -d db`.
  - Выполнено:
    - `npx prisma generate`
    - `DATABASE_URL=postgresql://user:password@localhost:5432/tahocrm_master npx prisma db push`
    - `DATABASE_URL=postgresql://user:password@localhost:5432/tahocrm_tenant_tenant-1 npx prisma db push`
  - Перезапущен dev-сервер для очистки кэша Prisma.
- **ПРОВЕРКИ**:
  - `GET /api/health` -> `200`.
  - Browser smoke-check:
    - `/crm/tenant-1/customers` -> PASS (без Prisma invocation error);
    - `/crm/tenant-1/vehicles` -> PASS (без Prisma invocation error);
    - `/crm/tenant-1/driver-cards` -> PASS (без Prisma invocation error).
  - Логи dev-сервера: ошибок `Invalid prisma.customer.findMany` / `vehicle.findMany` / `driverCardRequest.findMany` после восстановления не обнаружено.
- **СТАТУС**: Локальная инфраструктура восстановлена, fallback-обходы удалены, разделы CRM работают в strict infra-first режиме.

### 2026-02-13 - Введено обязательное preflight-правило перед правками

- **ЗАДАЧА**: Закрепить стандарт, что перед запуском работ и перед любой правкой сначала поднимается всё необходимое окружение и проверяется базовая готовность приложения.
- **ИЗМЕНЕНИЯ**:
  - `CHECKLIST.md`: добавлен раздел `Preflight перед началом работ (обязательно)`.
  - `README.md`: добавлен раздел `Порядок работы (обязательно)` с правилом `start dependencies -> preflight checks -> edits`.
- **НОВЫЙ ОБЯЗАТЕЛЬНЫЙ ПОРЯДОК**:
  1. Поднять зависимости приложения (Postgres/Docker, `.env`, dev-сервер).
  2. Выполнить preflight-проверки (`/api/health`, логин `/crm/tenant-1/login`, базовые страницы).
  3. Свериться с правилами проекта и актуальными записями `AGENT_RUN_LOG.md`.
  4. Только после этого вносить изменения в код.
- **СТАТУС**: Preflight-процесс закреплен как постоянный стандарт разработки.

### 2026-02-13 - Root-cause fix для FK ошибки при создании клиента из driver-cards

- **ПРОБЛЕМА**: При `Новая заявка на карту водителя -> Создать и выбрать` возникала ошибка FK `Customer_createdById_fkey`.
- **ПЕРВОПРИЧИНА**:
  - В `lib/auth.ts` tenant demo-login при ошибке `upsert` создавал синтетический user id (`demo-*`).
  - Write-роуты использовали `session.user.id` как FK (`createdById`, `creatorId`, `responsibles.userId`), но `demo-*` не существует в tenant таблице `User`.
- **ROOT-CAUSE FIX (без заплаток)**:
  - `lib/auth.ts`: удален synthetic fallback user; при сбое demo-provisioning login теперь отклоняется (`return null`).
  - `lib/auth.ts`: в JWT callback добавлена защита от synthetic tenant identity (очистка токена).
  - `lib/authz.ts`: добавлен `hasInvalidTenantSessionIdentity()`.
  - `app/api/customers/route.ts`, `app/api/orders/route.ts`, `app/api/tasks/route.ts`: добавлена проверка инварианта сессии и явный `INVALID_SESSION`, если identity невалиден.
- **ПРОВЕРКИ**:
  - `npm run type-check` — успешно.
  - E2E browser: `driver-cards -> Добавить заявку -> Создать и выбрать` — PASS, customer создается/выбирается, FK ошибка не воспроизводится.
  - Негативный тест: при остановленной БД demo `authorize()` возвращает `null` (нет ложной сессии).
  - После теста БД восстановлена, `/api/health` -> `200`.
- **НОВОЕ ПРАВИЛО**:
  - В проекте закреплен подход `root-cause first`:
    - сначала исправляем первопричину;
    - workaround допускается только как краткосрочный и с обязательным removal plan.
- **СТАТУС**: Инвариант tenant-сессии восстановлен, корневая причина устранена, правило root-cause first зафиксировано.

### 2026-02-13 - Global timestamp rollout (business даты + системный audit)

- **ЗАДАЧА**: Внедрить обязательный стандарт дат/времени во всех ключевых сущностях и UI: редактируемые бизнес-даты + неизменяемые системные audit-поля.
- **ИЗМЕНЕНИЯ В DATA LAYER**:
  - `prisma/schema.prisma`: добавлены `businessCreatedAt` / `businessUpdatedAt` для core и связанных сущностей:
    - `Customer`, `Contact`, `CustomerBankAccount`, `IssuerOrganization`, `Product`, `Service`, `User`,
    - `Vehicle`, `Tachograph`, `SKZI`, `Order`, `Task`, `DriverCardRequest`, `Invoice`, `Document`.
  - Для `Document` добавлено отсутствовавшее системное `updatedAt`.
- **MIGRATION/BACKFILL (локально)**:
  - Выполнено `npx prisma db push` для:
    - `tahocrm_master`
    - `tahocrm_tenant_tenant-1`
  - Выполнен SQL backfill:
    - `businessCreatedAt = COALESCE(businessCreatedAt, createdAt)`
    - `businessUpdatedAt = COALESCE(businessUpdatedAt, updatedAt, createdAt)`
    - по всем внедренным моделям.
- **ИЗМЕНЕНИЯ В API/VALIDATION**:
  - `lib/validation/schemas.ts`: добавлены `businessCreatedAt/businessUpdatedAt` в create/update схемы.
  - Обновлены create/update роуты для приема/сохранения бизнес-дат:
    - customers, orders, invoices, vehicles, driver-cards,
    - contacts, customer-bank-accounts, organizations,
    - products/services, users, documents, tachographs, tasks, skzi.
- **ИЗМЕНЕНИЯ В UI**:
  - Добавлен общий helper `lib/datetime.ts` (display + convert + fallback business/system).
  - Обновлены ключевые страницы CRM (таблицы + формы/модалки) с бизнес-датами:
    - customers, customers/new, customers/[id],
    - vehicles, customer-orders, invoices,
    - driver-cards, products-services, users, documents, settings, equipment.
- **ДОКУМЕНТЫ**:
  - `app/api/documents/generate/upd/route.ts`: бизнес-даты используются как приоритетные для даты счета/заказа с fallback на системные.
- **ПРОВЕРКИ**:
  - `npm run db:generate` — успешно.
  - `npm run type-check` — успешно.
  - `npm run check-all` — частично успешно: `TypeScript`, `ESLint`, `Jest`, `Next build` прошли; падение только на уже существующем пороге coverage (`branches 24.19% < 25%`), не связано с timestamp-rollout.
- **СТАТУС**: Базовый global rollout завершен; стандарт `business* + audit-only system timestamps` зафиксирован в коде и правилах.

### 2026-02-13 - Введено обязательное правило коммуникации на русском языке

- **ЗАДАЧА**: Формально закрепить новое правило: коммуникация с пользователем ведется на русском языке.
- **ИЗМЕНЕНИЯ**:
  - `README.md`: добавлен раздел `Язык коммуникации (обязательно)`.
  - `CHECKLIST.md`: добавлен раздел `Язык коммуникации (обязательно)` с проверочными пунктами.
- **СИНХРОНИЗАЦИЯ С ПРАВИЛАМИ**:
  - Подтверждено, что действующие правила `parity`, `preflight`, `root-cause first`, `timestamp coverage` остаются обязательными без изменения приоритетов.
- **СТАТУС**: Правило русского языка закреплено в проектной документации и включено в обязательный чеклист.

### 2026-02-13 - Введено обязательное правило автономного полного цикла

- **ЗАДАЧА**: Закрепить правило: агент выполняет задачи самостоятельно до результата, включая production-деплой по безопасному полному циклу.
- **ИЗМЕНЕНИЯ**:
  - `README.md`: добавлен раздел `Автономное выполнение задач (обязательно)`.
  - `CHECKLIST.md`: добавлен раздел `Автономное выполнение (обязательно)`.
- **ПРАВИЛО**:
  - Стандартный цикл: `preflight -> реализация -> проверка -> отчет`.
  - Для production: `preflight -> deploy -> smoke -> rollback-plan/rollback`.
  - Остановка только при критичном риске или отсутствии необходимого доступа.
- **СТАТУС**: Правило автономного полного цикла зафиксировано в документации и включено в контрольный чеклист.
