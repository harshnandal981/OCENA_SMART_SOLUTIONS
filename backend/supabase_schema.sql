create extension if not exists pgcrypto;

create table if not exists public.courses (
    id uuid primary key default gen_random_uuid(),
    topic text not null,
    difficulty text not null,
    audience text not null,
    title text not null,
    description text not null,
    thumbnail_url text,
    learning_outcomes jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);
alter table public.courses
    add column if not exists learning_outcomes jsonb not null default '[]'::jsonb;

create table if not exists public.modules (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses(id) on delete cascade,
    title text not null,
    description text not null,
    order_index integer not null,
    created_at timestamptz not null default now()
);

create table if not exists public.lessons (
    id uuid primary key default gen_random_uuid(),
    module_id uuid not null references public.modules(id) on delete cascade,
    title text not null,
    description text not null,
    order_index integer not null,
    content text,
    created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
    id uuid primary key default gen_random_uuid(),
    lesson_title text not null,
    questions_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    lesson_id uuid not null references public.lessons(id) on delete cascade,
    completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, lesson_id)
);

create index if not exists idx_modules_course_id on public.modules(course_id);
create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_quizzes_lesson_title on public.quizzes(lesson_title);
create index if not exists idx_progress_user_id on public.progress(user_id);
create index if not exists idx_progress_lesson_id on public.progress(lesson_id);
