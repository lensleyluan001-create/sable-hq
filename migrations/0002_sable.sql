-- SABLE Grok bot command network (unowned rows — auth is off)
create table if not exists agents (
  id text primary key,
  slug text not null unique,
  name text not null,
  callsign text not null,
  layer text not null,
  parent_id text references agents(id) on delete set null,
  function text not null,
  standing_orders text not null default '',
  grok_handle text not null default '',
  status text not null default 'idle',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists missions (
  id text primary key,
  title text not null,
  brief text not null,
  grok_message text not null default '',
  assignee_id text not null references agents(id),
  status text not null default 'active',
  priority text not null default 'normal',
  created_at timestamptz not null default now()
);

create table if not exists traffic (
  id text primary key,
  from_agent_id text references agents(id),
  to_agent_id text references agents(id),
  kind text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists agents_parent_idx on agents (parent_id);
create index if not exists missions_assignee_idx on missions (assignee_id, created_at desc);
create index if not exists traffic_created_idx on traffic (created_at desc);
