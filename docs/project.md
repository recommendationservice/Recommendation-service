# Recommendation & Personalization System

## Опис проєкту

Система рекомендацій та персоналізації контенту -- окремий бекенд-сервіс (recommendation engine) з REST API та легким JS SDK, який підключається на будь-який сайт одним рядком коду.

### Ідея

Підхід натхненний досвідом розробки гібридного пошукового сервісу, який можна було швидко інтегрувати на будь-який контентний сайт. Тут застосовується ідентичний принцип, але для рекомендацій:

- **Recommendation Engine** -- окремий бекенд-сервіс (`apps/recommendation-service/`), що приймає довільний контент (пости, товари, відео -- будь-що), векторизує його, зберігає профілі користувачів і на основі їх поведінки формує персональні рекомендації через AI (cosine similarity між embedding векторами).
- **JS SDK** -- легка бібліотека (`packages/sdk/`), vanilla JS + React bindings. На фронті відповідає тільки за пасивний трекінг (view, read) та отримання рекомендацій.
- **Demo-сайт** -- новинний портал (`apps/demo/`) для живої демонстрації на захисті. Next.js з API routes як бекенд, Supabase Auth + Storage.

---

## Архітектура

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Demo Site)                       │
│                                                                  │
│   Next.js Frontend                                               │
│   ┌─────────────┐     ┌──────────────────────────────────────┐   │
│   │  React App  │────▶│  SDK (packages/sdk)                  │   │
│   │             │     │  - trackEvent(view/read/deep_read)   │   │
│   │             │◀────│  - getRecommendations()              │   │
│   └──────┬──────┘     └──────────────┬───────────────────────┘   │
│          │                           │                           │
└──────────┼───────────────────────────┼───────────────────────────┘
           │                           │
           │ Next.js API routes        │ SDK → Reco Service
           ▼                           ▼
┌─────────────────────┐    ┌───────────────────────────────────────┐
│    Demo Backend      │    │     Recommendation Service            │
│  (Next.js API)       │    │     (apps/recommendation-service)     │
│                      │    │                                       │
│  - CRUD статей       │    │                                       │
│  - Supabase Auth     │    │  Content (від Demo Backend):          │
│  - Supabase Storage  │    │    POST /content                      │
│  - При like/bookmark/│    │    PUT  /content/:id                  │
│    share → шле event │───▶│    DELETE /content/:id                │
│  - При CRUD поста →  │    │                                       │
│    шле webhook       │───▶│  Events (від Demo Backend):           │
│                      │    │    POST /events  (like,share,dislike) │
│                      │    │                                       │
│                      │    │  Events (від SDK на фронті):          │
│                      │    │    POST /events  (view,read,deep_read)│
│                      │    │                                       │
│                      │    │  Recommendations (від SDK):           │
│                      │    │    GET  /recommendations              │
│                      │    │                                       │
└──────────┬───────────┘    └──────────────┬───────────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase (одна БД)                           │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │  Schema: public      │    │  Schema: reco (env: DB_SCHEMA)  │  │
│  │                     │    │                                 │  │
│  │  - profiles         │    │  - content_items (+ embedding)  │  │
│  │  - posts            │    │  - events                       │  │
│  │  - categories       │    │  - user_profiles (+ pref vector)│  │
│  │  - tags / post_tags │    │  - view_history                 │  │
│  │  - likes            │    │                                 │  │
│  │  - bookmarks        │    │  + pgvector extension           │  │
│  │                     │    │                                 │  │
│  │  + Auth             │    │                                 │  │
│  │  + Storage (images) │    │                                 │  │
│  └─────────────────────┘    └─────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Розподіл відповідальності: хто що відправляє

| Що | Хто відправляє | Куди | Чому |
|----|---------------|------|------|
| Створення/оновлення/видалення поста | Demo Backend | `POST/PUT/DELETE /content` | Бек вже зберігає пост -- одразу шле webhook |
| Like, bookmark, share, dislike | Demo Backend | `POST /events` | Бек вже зберігає в public.likes -- одразу шле event |
| View (відкрив статтю) | SDK (фронт) | `POST /events` | Тільки фронт знає що юзер відкрив сторінку |
| Read (>5 сек на статті) | SDK (фронт) | `POST /events` | Тільки фронт знає скільки часу юзер на сторінці |
| Deep read (>30 сек) | SDK (фронт) | `POST /events` | Тільки фронт знає скільки часу юзер на сторінці |
| Запит рекомендацій | SDK (фронт) | `GET /recommendations` | Фронт відображає стрічку |

**Принцип:** якщо дія вже обробляється на беку (like, bookmark, CRUD) -- бек і відправляє до Recommendation Service. SDK відповідає тільки за те, що може знати лише фронт (час на сторінці, факт перегляду).

### Потоки даних

#### 1. Публікація контенту (Demo Backend → Recommendation Service)
```
Автор створює/оновлює пост у Demo
  → Next.js API зберігає в public.posts
  → Next.js API відправляє POST /content до Recommendation Service
    payload: { externalId, type: "post", textForEmbedding, metadata }
  → Recommendation Service:
    1. Зберігає в reco.content з метаданими
    2. Генерує embedding через OpenAI API
    3. Зберігає embedding vector у pgvector
```

#### 2. Активні дії (Demo Backend → Recommendation Service)
```
Користувач лайкає статтю
  → Next.js API зберігає лайк в public.likes
  → Next.js API відправляє POST /events до Recommendation Service
    payload: { userId, contentId, eventType: "like", weight: 7 }
  → Recommendation Service:
    1. Зберігає подію в reco.events
    2. Оновлює preference_vector
    3. Оновлює view_history
```

#### 3. Пасивний трекінг (SDK → Recommendation Service)
```
Користувач відкриває статтю / читає >5 сек / читає >30 сек
  → SDK відправляє POST /events до Recommendation Service
    payload: { userId, contentId, eventType: "view"|"read"|"deep_read" }
  → Recommendation Service: аналогічна обробка
```

#### 4. Отримання рекомендацій (SDK → Recommendation Service)
```
SDK.getRecommendations({ type: "post", limit: 20 })
  → GET /recommendations?userId=...&type=post&limit=20
  → Recommendation Service:
    1. Отримує user_profile.preference_vector
    2. Фільтрує по type та view_history (виключає вже переглянуте)
    3. Cosine similarity між user_vector та content embeddings
    4. Повертає top-N content з повним metadata обʼєктом
  ← Response: [{ id, externalId, type, score, metadata: { title, imageUrl, ... } }]
```

Клієнт отримує повний `metadata` обʼєкт який сам же і закинув при створенні контенту -- ніяких додаткових запитів до Demo Backend не потрібно.

### Компоненти

| Компонент | Технології | Опис |
|-----------|-----------|------|
| **Recommendation Service** | Node.js, Hono | REST API: events, recommendations, content ingestion |
| **Demo Site** | Next.js 16, React 19, Tailwind | Новинний портал + API routes як бекенд |
| **SDK** | TypeScript, vanilla JS + React hooks | Пасивний трекінг + запит рекомендацій |
| **Database** | Supabase (PostgreSQL + pgvector) | Одна БД, дві схеми: `public` + `reco` |
| **Auth** | Supabase Auth | Автентифікація користувачів у Demo |
| **Storage** | Supabase Storage | Зображення для статей |
| **Embeddings** | OpenAI text-embedding-3-small | Векторизація контенту |

### Структура монорепо

```
recommendation-personalization-system/
├── apps/
│   ├── demo/                      # Next.js демо-сайт
│   │   └── src/
│   │       ├── app/               # Next.js app router
│   │       ├── features/          # ED архітектура
│   │       └── shared/
│   └── recommendation-service/    # Recommendation Engine API
│       └── src/
│           ├── api/               # HTTP handlers
│           ├── services/          # Business logic
│           └── db/                # Drizzle schema + migrations
├── packages/
│   └── sdk/                       # JS SDK (vanilla + React)
│       └── src/
│           ├── core/              # Vanilla SDK
│           └── react/             # React provider + hooks
├── generated/                     # Figma макети
├── docs/                          # Документація
└── pnpm-workspace.yaml
```

---

## Схема бази даних

### Schema: `public` (Demo Site)

```sql
-- Supabase Auth керує таблицею auth.users автоматично

-- Профілі користувачів (розширення auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Категорії статей
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,                    -- HEX для UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Теги
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- Статті
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,                  -- короткий опис для картки
  body TEXT NOT NULL,            -- повний текст (markdown)
  cover_image_url TEXT,          -- Supabase Storage URL
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Зв'язок статей з тегами (M2M)
CREATE TABLE public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Лайки
CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- Збережені статті (bookmarks)
CREATE TABLE public.bookmarks (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
```

### Schema: `reco` (Recommendation Service)

Назва схеми конфігурується через `DB_SCHEMA` env змінну (default: `reco`).
Це дозволяє recommendation service працювати на тій самій БД без конфліктів, а при необхідності -- на окремій БД.

Таблиця `content` -- універсальна. Сервіс не знає що таке "пост" чи "товар". Він зберігає довільний контент з типом та метаданими. Клієнт закидує будь-який JSON в `metadata` і отримує його назад при запиті рекомендацій.

```sql
CREATE SCHEMA IF NOT EXISTS reco;

-- Універсальний контент з embeddings
-- Сервіс не знає структуру контенту -- все в metadata JSONB
CREATE TABLE reco.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,      -- ID з клієнтського сайту (напр. public.posts.id)
  type TEXT NOT NULL,                    -- тип контенту: "post", "product", "video" тощо
  text_for_embedding TEXT NOT NULL,      -- текст для генерації embedding (title + body)
  metadata JSONB NOT NULL DEFAULT '{}',  -- ВСЕ що потрібно клієнту для рендеру (title, imageUrl, tags, author...)
  embedding vector(1536),               -- OpenAI text-embedding-3-small
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Поведінкові події
CREATE TABLE reco.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                  -- external user ID (auth.users.id)
  content_id UUID NOT NULL REFERENCES reco.content(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'read', 'deep_read', 'like', 'share', 'dislike')),
  weight SMALLINT NOT NULL,               -- вага події
  metadata JSONB DEFAULT '{}',            -- duration, source тощо
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Профілі користувачів з preference vector
CREATE TABLE reco.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id TEXT NOT NULL UNIQUE,  -- auth.users.id
  preference_vector vector(1536),        -- incremental weighted average embeddings
  total_weight FLOAT NOT NULL DEFAULT 0,  -- сума |weight| всіх подій (для incremental average)
  total_events INT NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Історія переглядів (для фільтрації вже баченого)
CREATE TABLE reco.view_history (
  user_id UUID NOT NULL REFERENCES reco.user_profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES reco.content(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, content_id)
);

-- Індекси
CREATE INDEX idx_content_embedding ON reco.content
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_content_type_active ON reco.content (type)
  WHERE is_active = true;

CREATE INDEX idx_events_user ON reco.events (user_id, created_at DESC);

CREATE INDEX idx_view_history_user ON reco.view_history (user_id);
```

### Зв'язок між схемами

```
public.posts.id  ──Demo Backend──▶  reco.content.external_id
auth.users.id    ──Demo Backend──▶  reco.user_profiles.external_user_id
                 ──SDK───────────▶  reco.events.user_id (для view/read)
```

Recommendation Service **не має прямих foreign keys на public схему**. Зв'язок тільки через `external_id`. Сервіс не знає що таке "пост" -- він працює з абстрактним контентом будь-якого типу.

---

## Система подій

Кожна подія описує дію користувача з контентом та має вагу для впливу на preference_vector:

| Подія | Опис | Вага | Відправляє |
|-------|------|------|------------|
| `view` | Відкрив матеріал | 1 | SDK (фронт) |
| `read` | Затримався >5 сек | 3 | SDK (фронт) |
| `deep_read` | Затримався >30 сек | 5 | SDK (фронт) |
| `like` | Лайкнув | 7 | Demo Backend |
| `share` | Поширив | 6 | Demo Backend |
| `dislike` | Не цікаво | -5 | Demo Backend |

### Обробка подій на Recommendation Service

При отриманні події (незалежно від джерела -- SDK чи Demo Backend):
1. Зберігає подію в `reco.events`
2. Знаходить `reco.content` та його embedding
3. Оновлює `reco.user_profiles.preference_vector` (incremental weighted average)
4. Оновлює `reco.view_history`
5. Auto-create `user_profile` при першій події

### Побудова preference_vector (incremental)

При кожній новій події вектор оновлюється інкрементально без перечитування всіх попередніх подій:

```
new_vector = (old_vector * total_weight + content_embedding * event_weight)
           / (total_weight + |event_weight|)

total_weight += |event_weight|
```

- `event_weight` -- вага події (like=7, view=1, dislike=-5)
- `total_weight` -- накопичена сума абсолютних ваг всіх попередніх подій
- Dislike (від'ємна вага) "відштовхує" вектор від контенту який не сподобався
- Нові події поступово "розбавляють" старі інтереси природнім чином

---

## Алгоритм рекомендацій

При запиті `GET /recommendations?userId=...&type=post&limit=20`:

1. **Отримати профіль** -- `preference_vector` з `reco.user_profiles`
2. **Cold start** -- якщо `total_events < 5`: повертати popular (за кількістю подій) + recent
3. **Відфільтрувати** -- по `type` + виключити контент з `reco.view_history`
4. **Vector scoring** -- cosine similarity через pgvector:

```sql
SELECT id, external_id, type, metadata,
       1 - (embedding <=> $preference_vector) AS score
FROM reco.content
WHERE is_active = true
  AND type = $type
  AND id NOT IN (SELECT content_id FROM reco.view_history WHERE user_id = $uid)
ORDER BY embedding <=> $preference_vector
LIMIT $limit;
```

5. **Повернути** -- top-N з повним metadata обʼєктом + score

---

## Webhook: синхронізація контенту

### Demo Backend → Recommendation Service

При створенні/оновленні/видаленні поста Demo Backend відправляє:

```
POST   /api/v1/content          -- новий пост
PUT    /api/v1/content/:id      -- оновлення
DELETE /api/v1/content/:id      -- видалення (soft: is_active=false)
```

#### Payload для створення/оновлення:

```json
{
  "externalId": "post-uuid-from-demo",
  "type": "post",
  "textForEmbedding": "How AI changes recommendations. Full article text here...",
  "metadata": {
    "title": "How AI changes recommendations",
    "excerpt": "Short description for cards",
    "imageUrl": "https://supabase.storage/...",
    "authorName": "John Doe",
    "categorySlug": "technology",
    "tags": ["ai", "machine-learning"],
    "publishedAt": "2026-04-05T10:00:00Z",
    "readingTime": 5
  }
}
```

- `type` -- тип контенту, використовується для фільтрації при `getRecommendations(type)`
- `textForEmbedding` -- текст для генерації embedding (клієнт сам вирішує що туди покласти: title + body, опис товару тощо)
- `metadata` -- довільний JSON, повертається as-is при запиті рекомендацій. Сервіс не парсить і не валідує його структуру

При оновленні Recommendation Service:
- Оновлює metadata в `reco.content`
- Перегенеровує embedding якщо змінився `textForEmbedding`

### Demo Backend → Recommendation Service (events)

При like/bookmark/share/dislike Demo Backend одразу відправляє event:

```
POST /api/v1/events
{
  "userId": "auth-user-uuid",
  "contentId": "post-uuid",
  "eventType": "like",
  "weight": 7
}
```

---

## Задачі для реалізації

### Фаза 1: Фундамент

#### 1.1 Монорепо та інфраструктура
- [ ] Налаштувати pnpm workspace з shared configs (tsconfig, eslint, prettier)
- [ ] Створити `apps/recommendation-service/` (Node.js + Hono)
- [ ] Налаштувати Supabase проєкт (Auth, Storage, pgvector extension)
- [ ] Env змінні: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `DB_SCHEMA=reco`, `OPENAI_API_KEY`

#### 1.2 База даних
- [ ] Створити schema `reco` в Supabase
- [ ] Міграції `public` схеми (profiles, posts, categories, tags, likes, bookmarks)
- [ ] Міграції `reco` схеми (content, events, user_profiles, view_history)
- [ ] Увімкнути pgvector extension, створити індекси
- [ ] Drizzle ORM з підтримкою custom schema через `DB_SCHEMA` env

#### 1.3 Recommendation Service -- каркас
- [ ] HTTP server на Hono з middleware (CORS, error handling)
- [ ] `POST /api/v1/content` -- прийом контенту (від Demo Backend), payload: { externalId, type, textForEmbedding, metadata }
- [ ] `PUT /api/v1/content/:id` -- оновлення контенту
- [ ] `DELETE /api/v1/content/:id` -- soft delete
- [ ] `POST /api/v1/events` -- прийом подій (від SDK та Demo Backend)
- [ ] `GET /api/v1/recommendations?userId&type&limit` -- рекомендації з фільтром по type (від SDK)
- [ ] `GET /api/v1/health` -- health check

### Фаза 2: Recommendation Engine

#### 2.1 Content Processing
- [ ] Інтеграція з OpenAI Embeddings API (text-embedding-3-small, 1536 dims)
- [ ] Pipeline: отримання контенту → очищення тексту → embedding → збереження
- [ ] Перегенерація embedding при оновленні body

#### 2.2 Event Processing та User Profile
- [ ] Валідація та збереження подій в `reco.events`
- [ ] Auto-create `user_profile` при першій події
- [ ] Incremental оновлення `preference_vector` (weighted running average)
- [ ] Запис/оновлення `reco.view_history`

#### 2.3 Recommendation Algorithm
- [ ] Cosine similarity через pgvector (`<=>` operator)
- [ ] Фільтрація view_history (виключити вже бачене)
- [ ] Cold start: popular + recent для нових користувачів (total_events < 5)
- [ ] Response: [{ id, externalId, type, score, metadata }]

### Фаза 3: SDK

#### 3.1 Vanilla JS SDK (`packages/sdk/src/core/`)
- [ ] `RecoSDK.init({ apiUrl })` -- ініціалізація
- [ ] `RecoSDK.identify(userId)` -- прив'язка до користувача
- [ ] `RecoSDK.trackEvent(type, contentId, metadata?)` -- відправка пасивних подій (view, read, deep_read)
- [ ] `RecoSDK.getRecommendations({ type, limit })` -- отримання рекомендацій з фільтром по типу контенту
- [ ] Batch відправка подій (flush кожні 5 сек або при 10 подіях)
- [ ] Збірка в UMD/ESM

#### 3.2 React SDK (`packages/sdk/src/react/`)
- [ ] `<RecoProvider apiUrl="...">` -- context provider
- [ ] `useRecommendations({ type, limit })` -- хук { data, isLoading, error, refetch }
- [ ] `useTrackEvent()` -- хук, повертає trackEvent функцію
- [ ] `useRecoSDK()` -- доступ до інстансу SDK

### Фаза 4: Demo Site

#### 4.1 Автентифікація та профілі
- [ ] Supabase Auth (email + password)
- [ ] UI автентифікації (Figma макет: `generated/authentication/`)
- [ ] Профіль користувача, аватар через Supabase Storage

#### 4.2 Контент
- [ ] CRUD статей через Next.js API routes
- [ ] Завантаження cover image через Supabase Storage
- [ ] Категорії та теги
- [ ] При create/update/delete поста → відправка webhook до Recommendation Service
- [ ] При like/bookmark/share → зберігає в public + відправляє event до Recommendation Service
- [ ] Seed: ~50-100 статей різних категорій

#### 4.3 Стрічка та рекомендації
- [ ] UI стрічки (Figma макет: `generated/feed/`)
- [ ] Інтеграція SDK:
  - `identify(userId)` після логіну
  - `trackEvent("view", postId)` при відкритті статті
  - `trackEvent("read", postId)` через 5 сек
  - `trackEvent("deep_read", postId)` через 30 сек
- [ ] Персональна стрічка через `useRecommendations()`
- [ ] Trending секція (popular за останні 24h)
- [ ] Історія переглядів

#### 4.4 Адмін-панель
- [ ] Dashboard: кількість подій, активні користувачі
- [ ] Перегляд профілю та preference vector

### Фаза 5: Polish та захист

#### 5.1 Документація
- [ ] README з quick start
- [ ] API документація
- [ ] SDK документація з прикладами

#### 5.2 Deployment
- [ ] Dockerize recommendation-service
- [ ] Deploy API (Railway / Fly.io)
- [ ] Deploy demo (Vercel)

#### 5.3 Демонстрація
- [ ] Live demo сценарій:
  1. Новий користувач -- cold start (popular + recent)
  2. Читає кілька статей певної тематики
  3. Лайкає статтю
  4. Оновлює стрічку -- бачить персоналізовані рекомендації
  5. Адмін-панель: профіль користувача, метрики
- [ ] Fallback відео на випадок проблем з мережею
