## Bang Eojoong

### Supabase 환경 변수
`.env.local`에 아래 값을 추가하세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Supabase SQL (테이블 + 관리자 뷰)
```sql
create table if not exists anonymous_users (
  id bigint generated always as identity primary key,
  user_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists records (
  id bigint generated always as identity primary key,
  user_id text not null references anonymous_users(user_id) on delete cascade,
  category text not null,
  reason text not null,
  amount integer not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists point_events (
  id bigint generated always as identity primary key,
  user_id text not null references anonymous_users(user_id) on delete cascade,
  event_type text not null,
  points integer not null,
  metadata jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists reward_claims (
  id bigint generated always as identity primary key,
  user_id text not null references anonymous_users(user_id) on delete cascade,
  milestone_key text not null,
  base_points integer not null,
  upgraded_points integer,
  claimed_at timestamptz not null default now(),
  unique (user_id, milestone_key)
);

create or replace view admin_user_summaries as
select
  u.user_id,
  coalesce(r.total_records, 0)::int as total_records,
  coalesce(p.total_points, 0)::int as total_points,
  lr.recorded_at as last_record_at,
  lr.amount as last_record_amount,
  lr.category as last_record_category
from anonymous_users u
left join (
  select user_id, count(*) as total_records
  from records
  group by user_id
) r on r.user_id = u.user_id
left join (
  select user_id, sum(points) as total_points
  from point_events
  group by user_id
) p on p.user_id = u.user_id
left join lateral (
  select recorded_at, amount, category
  from records r2
  where r2.user_id = u.user_id
  order by recorded_at desc
  limit 1
) lr on true;
```

### 메모
- 현재 `/admin`은 개발용으로 인증 없이 접근 가능합니다.
- 기존 localStorage 저장은 유지하며, Supabase 저장을 병행합니다.
