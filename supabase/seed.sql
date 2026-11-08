do $$ begin
 if exists(select 1 from collections where code='DEMO-OPS') then return; end if;
 if exists(select 1 from collections) then raise exception 'Seed requires an empty demo database'; end if;
 insert into collections(code,name,owner,audience,access_review_on,purpose) values
 ('DEMO-OPS','Operations handbook','Morgan Lee','staff',current_date+60,'Approved operating guidance'),
 ('DEMO-BOARD','Board papers','Alex Chen','directors',current_date+30,'Board decisions'),
 ('DEMO-LEGACY','Legacy intranet','','staff',current_date-10,'');
 insert into documents(collection_id,external_id,title,content,source_url,owner,status,personal_data,purpose,review_on,retention_review_on,content_hash)
 select c.id,v.code,v.title,v.content,'https://example.invalid/documents/'||lower(v.code),v.owner,v.status,v.personal,v.purpose,current_date+v.review_days,current_date+v.retention_days,encode(sha256(convert_to(v.title||chr(10)||v.content||chr(10)||'https://example.invalid/documents/'||lower(v.code),'UTF8')),'hex')
 from (values
 ('DEMO-OPS','OPS-001','Supplier onboarding','Before onboarding a supplier, confirm the business owner, payment terms and insurance evidence. The procurement owner records the decision.','Morgan Lee','approved',false,'Current supplier onboarding guidance',30,180),
 ('DEMO-OPS','OPS-002','Incident escalation','Report a service incident to the duty manager. Record the time, impact and next review. The duty manager owns the update.','Morgan Lee','approved',false,'Current incident process',45,180),
 ('DEMO-OPS','OPS-003','Remote working policy','Remote workers contact their manager before changing work location. This policy is waiting for its annual review.','Jamie Patel','approved',false,'Working arrangements',-9,90),
 ('DEMO-OPS','OPS-004','Former staff directory','A fictional archived contact record awaiting retention review. It must not appear in ordinary search.','Jamie Patel','approved',true,'Historical directory review',60,-5),
 ('DEMO-OPS','OPS-005','Supplier onboarding copy','Before onboarding a supplier, confirm the business owner, payment terms and insurance evidence. The procurement owner records the decision.','Morgan Lee','draft',false,'Duplicate awaiting consolidation',-2,90),
 ('DEMO-BOARD','BOARD-001','Supplier acquisition review','The directors review the proposed supplier acquisition at the next board meeting. Private board material.','Alex Chen','approved',false,'Board due diligence',20,120),
 ('DEMO-LEGACY','LEGACY-001','Old purchasing guide','An older supplier purchasing guide awaiting a source owner.','', 'draft',false,'',-30,-1)
 ) as v(collection,code,title,content,owner,status,personal,purpose,review_days,retention_days) join collections c on c.code=v.collection;
 insert into actions(code,document_id,title,owner,due_on) values
 ('ACT-001',(select id from documents where external_id='OPS-003'),'Review remote working policy','Jamie Patel',current_date-3),
 ('ACT-002',(select id from documents where external_id='OPS-005'),'Choose the canonical supplier guide','Morgan Lee',current_date+3);
 insert into query_log(query,audience,result_count,actor,created_at) values
 ('travel approval','staff',0,'demo',now()-interval '2 days'),('travel approval','staff',0,'demo',now()-interval '1 day'),('supplier','staff',1,'demo',now());
end $$;
