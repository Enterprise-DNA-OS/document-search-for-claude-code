create table collections (
 id uuid primary key default gen_random_uuid(), code text not null unique check (code ~ '^[A-Z0-9_-]+$'),
 name text not null check (length(trim(name))>0), owner text not null default '', audience text not null check(length(trim(audience))>0),
 access_review_on date, purpose text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table documents (
 id uuid primary key default gen_random_uuid(), collection_id uuid not null references collections(id), external_id text not null,
 title text not null check(length(trim(title))>0), content text not null check(length(trim(content))>0), source_url text not null check(source_url ~ '^https?://'),
 owner text not null default '', status text not null default 'draft' check(status in ('draft','approved','archived')),
 personal_data boolean not null default false, purpose text not null default '', review_on date, retention_review_on date,
 content_hash text not null, original jsonb not null default '{}',
 search_vector tsvector generated always as (setweight(to_tsvector('english',title),'A') || setweight(to_tsvector('english',content),'B')) stored,
 unique(collection_id,external_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index documents_search on documents using gin(search_vector);
create table reviews (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references documents(id), actor text not null,
 note text not null, content_hash text not null, review_on date not null, retention_review_on date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table actions (
 id uuid primary key default gen_random_uuid(), code text not null unique, document_id uuid references documents(id),
 title text not null, owner text not null, due_on date not null, status text not null default 'open' check(status in ('open','closed')),
 resolution text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table query_log (
 id uuid primary key default gen_random_uuid(), query text not null, audience text not null, result_count integer not null check(result_count>=0),
 actor text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), actor text not null, operation text not null, record_id uuid,
 before_record jsonb, after_record jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['collections','documents','reviews','actions','query_log','audit_events'] loop
 execute format('create trigger touch_updated_at before update on %I for each row execute function touch_updated_at()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
end loop; end $$;
create view document_register as
 select d.id,d.external_id,d.title,c.code as collection,c.audience,d.owner,d.status,d.review_on,d.retention_review_on,d.personal_data,
 d.source_url,d.content_hash,
 (d.status='approved' and d.review_on>=current_date and d.retention_review_on>=current_date and c.access_review_on>=current_date
 and length(trim(d.owner))>0 and length(trim(d.purpose))>0 and length(trim(c.owner))>0 and length(trim(c.purpose))>0) as searchable
 from documents d join collections c on c.id=d.collection_id;
create view review_queue as select * from document_register where status<>'archived' and (review_on is null or review_on<current_date or status='draft');
create view retention_queue as select * from document_register where status<>'archived' and (retention_review_on is null or retention_review_on<current_date);
create view overdue_actions as select code,title,owner,due_on,document_id from actions where status='open' and due_on<current_date;
create view collection_coverage as
 select c.code,c.name,c.owner,c.audience,c.access_review_on,count(r.id)::int as documents,
 count(r.id) filter(where r.searchable)::int as searchable,
 count(r.id) filter(where r.status<>'archived' and not r.searchable)::int as held
 from collections c left join document_register r on r.collection=c.code group by c.id;
create view compliance_findings as
 select external_id as record,'CONTENT-REVIEW'::text as rule,'Content not approved or review overdue'::text as finding from review_queue
 union all select external_id,'NZ-IPP9','Retention-purpose review required; do not delete automatically' from retention_queue
 union all select external_id,'OWNERSHIP','Document needs an owner and a lawful-use purpose' from documents where status<>'archived' and (trim(owner)='' or trim(purpose)='')
 union all select code,'NZ-IPP5','Collection owner, purpose or access review missing or overdue' from collections where trim(owner)='' or trim(purpose)='' or access_review_on is null or access_review_on<current_date;
