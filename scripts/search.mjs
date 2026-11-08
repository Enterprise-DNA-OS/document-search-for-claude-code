#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { table as textTable } from './lib/format.mjs';
import { page, table, record, writeOut } from './lib/render.mjs';

export const commands = ['collections','documents','document','search','review-due','retention-due','coverage','duplicates','gaps','owner-load','attention','compliance','weekly-review','activity','add-collection','review-collection','add-document','review-document','archive-document','add-action','close-action','log-query','import','export','draft-review','draft-search'];
const writes=new Set(['add-collection','review-collection','add-document','review-document','archive-document','add-action','close-action','log-query','import']);
const hash=s=>createHash('sha256').update(s).digest('hex');
const need=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();};
function date(v,label){need(v,label);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(`${label} must be a real YYYY-MM-DD date`);return v;}
function future(v,label){date(v,label);if(v<new Date().toISOString().slice(0,10))throw Error(`${label} must be today or later`);return v;}
function code(v){need(v,'code');if(!/^[A-Z0-9_-]+$/.test(v))throw Error('code must use uppercase letters, digits, underscore or hyphen');return v;}
function url(v){need(v,'source URL');let u;try{u=new URL(v);}catch{throw Error('source URL must be absolute HTTP(S)');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('source URL must be HTTP(S) without credentials');return v;}
export function parseArgs(args){const pos=[],opts={};for(const a of args){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in opts)throw Error(`Duplicate option ${k}`);opts[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {pos,opts};}
const allowed={
 collections:[],documents:[],document:[],search:['query','group'], 'review-due':[],'retention-due':[],coverage:[],duplicates:[],gaps:[],'owner-load':[],attention:[],compliance:[],'weekly-review':[],activity:[],
 'add-collection':['code','name','owner','group','purpose','review-on'], 'review-collection':['owner','purpose','review-on'],
 'add-document':['collection','file'], 'review-document':['owner','purpose','review-on','retention-review-on','note'], 'archive-document':['note'],
 'add-action':['code','document','title','owner','due-on'], 'close-action':['resolution'], 'log-query':['query','group'],
 import:['file','collection','map'],export:['file'],'draft-review':[],'draft-search':['query','group']
};
async function resolve(db,kind,value){need(value,kind);const specs={documents:['external_id','title'],collections:['code','name'],actions:['code','title']};const [key,label]=specs[kind];const rows=await db.query(`select * from ${kind} where lower(${key})=lower($1) or lower(${label})=lower($1) or id::text like $2 order by ${key}`,[value,value.toLowerCase()+'%']);if(rows.length===1)return rows[0];const partial=rows.length?rows:await db.query(`select * from ${kind} where strpos(lower(${label}),lower($1))>0 order by ${key}`,[value]);if(partial.length===1)return partial[0];throw Error(partial.length?`Ambiguous ${kind}: ${partial.map(r=>`${r[key]} (${r.id}) ${r[label]}`).join('; ')}`:`No ${kind} match ${value}`);}
async function audit(db,actor,operation,before,after){await db.query('insert into audit_events(actor,operation,record_id,before_record,after_record) values($1,$2,$3,$4,$5)',[actor,operation,after?.id||before?.id||null,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);}
async function results(db,query,group){need(query,'query');need(group,'group');if(query.length>250)throw Error('query exceeds 250 characters');return db.query(`select d.external_id as citation,d.title,c.code as collection,d.source_url,d.review_on,
 round(ts_rank(d.search_vector,plainto_tsquery('english',$1))::numeric,4)::float as relevance,
 left(d.content,320) as excerpt,d.content_hash
 from documents d join collections c on c.id=d.collection_id join document_register r on r.id=d.id
 where c.audience=$2 and r.searchable and d.search_vector @@ plainto_tsquery('english',$1)
 order by relevance desc,d.external_id limit 20`,[query,group]);}
async function putDocument(db,collection,input,actor){
 const external_id=need(input.external_id,'external_id'),title=need(input.title,'title'),content=need(input.content,'content'),source_url=url(input.source_url);
 if(content.length>2_000_000)throw Error('Document exceeds 2 million characters');
 if(input.personal_data!==undefined&&typeof input.personal_data!=='boolean')throw Error('personal_data must be boolean');
 const owner=String(input.owner||'').trim(),personal_data=input.personal_data??true;
 const before=(await db.query('select * from documents where collection_id=$1 and external_id=$2',[collection.id,external_id]))[0];
 const content_hash=hash(title+'\n'+content+'\n'+source_url);
 const original=JSON.stringify(input.original||input);
 if(before&&before.content_hash===content_hash&&before.owner===owner&&before.personal_data===personal_data&&isDeepStrictEqual(before.original,JSON.parse(original)))return {id:before.id,external_id,outcome:'unchanged'};
 // Changed imports never preserve approval. Original source columns remain evidence.
 const [after]=before?await db.query(`update documents set title=$2,content=$3,source_url=$4,owner=$5,personal_data=$6,content_hash=$7,original=$8,status='draft',review_on=null,retention_review_on=null where id=$1 returning *`,[before.id,title,content,source_url,owner,personal_data,content_hash,original]):await db.query(`insert into documents(collection_id,external_id,title,content,source_url,owner,personal_data,content_hash,original) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,[collection.id,external_id,title,content,source_url,owner,personal_data,content_hash,original]);
 await audit(db,actor,'document-ingest',before,after);return {id:after.id,external_id,outcome:before?'updated, review required':'added, review required'};
}
const queries={
 collections:'select * from collection_coverage order by code',documents:'select * from document_register order by collection,external_id',
 'review-due':'select external_id,title,owner,status,review_on from review_queue order by review_on nulls first,external_id',
 'retention-due':'select external_id,title,owner,personal_data,retention_review_on from retention_queue order by retention_review_on nulls first,external_id',
 coverage:'select * from collection_coverage order by code',
 duplicates:`select md5(content) as content_fingerprint,count(*)::int as copies,string_agg(external_id,', ' order by external_id) as documents from documents where status<>'archived' group by md5(content) having count(*)>1 order by copies desc,documents`,
 gaps:`select query,audience,count(*)::int as attempts,max(created_at) as last_seen from query_log where result_count=0 group by query,audience order by attempts desc,query`,
 'owner-load':`select coalesce(nullif(owner,''),'Unassigned') as owner,count(*)::int as documents,count(*) filter(where not searchable)::int as held from document_register where status<>'archived' group by owner order by held desc,owner`,
 attention:'select a.code,a.title,a.owner,a.due_on,d.external_id as document from overdue_actions a left join documents d on d.id=a.document_id order by a.due_on,a.code',compliance:'select * from compliance_findings order by rule,record',
 activity:'select actor,operation,record_id,created_at from audit_events order by created_at desc,id limit 100'
};
export async function run(db,args){
 const {pos,opts:o}=parseArgs(args);const [cmd,arg]=pos;
 if(o.help||!cmd||cmd==='help')return {commands,usage:'npm run search -- <command> [record] --key=value [--json]',writes:'Writes require --actor=Name. --dry-run validates and rolls back.',scope:'Trusted administrator CLI. --group filters results; it does not authenticate a user.'};
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}`);
 for(const k of Object.keys(o))if(!['json','actor','dry-run',...(allowed[cmd]||[])].includes(k))throw Error(`Unknown option --${k} for ${cmd}`);
 const maxPos=['document','review-collection','review-document','archive-document','close-action','import'].includes(cmd)?2:1;
 if(pos.length>maxPos)throw Error('Unexpected positional arguments; use --key=value');
 const mutation=writes.has(cmd);if(mutation)need(o.actor,'--actor');
 if(o['dry-run']&&!mutation)throw Error('--dry-run applies only to record changes');
 await db.exec(mutation?'BEGIN':'BEGIN READ ONLY');
 try {
  let out;
  if(queries[cmd])out=await db.query(queries[cmd]);
  else if(cmd==='document'){const d=await resolve(db,'documents',arg);out={document:d,reviews:await db.query('select * from reviews where document_id=$1 order by created_at',[d.id]),actions:await db.query('select * from actions where document_id=$1 order by due_on',[d.id])};}
  else if(cmd==='search')out=await results(db,o.query,o.group);
  else if(cmd==='weekly-review')out={coverage:await db.query(queries.coverage),reviews:await db.query(queries['review-due']),overdue_actions:await db.query(queries.attention),unanswered:await db.query(queries.gaps)};
  else if(cmd==='add-collection'){
   const [r]=await db.query('insert into collections(code,name,owner,audience,purpose,access_review_on) values($1,$2,$3,$4,$5,$6) returning *',[code(o.code),need(o.name,'name'),need(o.owner,'owner'),need(o.group,'group'),need(o.purpose,'purpose'),future(o['review-on'],'review-on')]);await audit(db,o.actor,cmd,null,r);out=r;
  }else if(cmd==='review-collection'){
   const before=await resolve(db,'collections',arg);const [after]=await db.query('update collections set owner=$2,purpose=$3,access_review_on=$4 where id=$1 returning *',[before.id,need(o.owner,'owner'),need(o.purpose,'purpose'),future(o['review-on'],'review-on')]);await audit(db,o.actor,cmd,before,after);out=after;
  }else if(cmd==='add-document'){
   const c=await resolve(db,'collections',o.collection);out=await putDocument(db,c,JSON.parse(fs.readFileSync(need(o.file,'file'),'utf8')),o.actor);
  }else if(cmd==='review-document'){
   const before=await resolve(db,'documents',arg);if(before.status==='archived')throw Error('Archived document cannot be approved; ingest a new reviewed source first');
   const note=need(o.note,'note'),review=future(o['review-on'],'review-on'),retention=future(o['retention-review-on'],'retention-review-on');
   const [after]=await db.query(`update documents set owner=$2,purpose=$3,review_on=$4,retention_review_on=$5,status='approved' where id=$1 returning *`,[before.id,need(o.owner,'owner'),need(o.purpose,'purpose'),review,retention]);
   await db.query('insert into reviews(document_id,actor,note,content_hash,review_on,retention_review_on) values($1,$2,$3,$4,$5,$6)',[before.id,o.actor,note,before.content_hash,review,retention]);await audit(db,o.actor,cmd,before,after);out=after;
  }else if(cmd==='archive-document'){
   need(o.note,'note');const before=await resolve(db,'documents',arg);const [after]=await db.query("update documents set status='archived' where id=$1 returning *",[before.id]);await audit(db,o.actor,cmd,before,{...after,archive_note:o.note});out=after;
  }else if(cmd==='add-action'){
   const d=o.document?await resolve(db,'documents',o.document):null;const [after]=await db.query('insert into actions(code,document_id,title,owner,due_on) values($1,$2,$3,$4,$5) returning *',[code(o.code),d?.id||null,need(o.title,'title'),need(o.owner,'owner'),date(o['due-on'],'due-on')]);await audit(db,o.actor,cmd,null,after);out=after;
  }else if(cmd==='close-action'){
   const before=await resolve(db,'actions',arg);if(before.status==='closed')throw Error('Action already closed');const [after]=await db.query("update actions set status='closed',resolution=$2 where id=$1 returning *",[before.id,need(o.resolution,'resolution')]);await audit(db,o.actor,cmd,before,after);out=after;
  }else if(cmd==='log-query'){
   const rows=await results(db,o.query,o.group);const [r]=await db.query('insert into query_log(query,audience,result_count,actor) values($1,$2,$3,$4) returning *',[o.query,o.group,rows.length,o.actor]);await audit(db,o.actor,cmd,null,r);out=r;
  }else if(cmd==='import'){
   if(arg!=='searchblox')throw Error('Supported import: searchblox (original collection CSV, not configuration XML)');
   const c=await resolve(db,'collections',o.collection);
   const mapping=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{external_id:'id',title:'title',content:'content',source_url:'url',owner:'owner',personal_data:'personal_data'};
   for(const k of ['external_id','title','content','source_url'])need(mapping[k],`map.${k}`);
   const rows=parseCsv(fs.readFileSync(need(o.file,'file'),'utf8'));if(!rows.length)throw Error('CSV has no data rows');
   const seen=new Set();out=[];
   for(const row of rows){const input={original:row};for(const [key,col] of Object.entries(mapping))input[key]=row[col];
    input.external_id=need(input.external_id,'mapped external_id');if(seen.has(input.external_id))throw Error(`Duplicate source id ${input.external_id}`);seen.add(input.external_id);
    if(input.personal_data===undefined||input.personal_data==='')input.personal_data=true;
    else if(/^(true|yes|1)$/i.test(input.personal_data))input.personal_data=true;
    else if(/^(false|no|0)$/i.test(input.personal_data))input.personal_data=false;
    else throw Error('personal_data must be true or false');
    out.push(await putDocument(db,c,input,o.actor));
   }
  }else if(cmd==='export'){
   const snapshot={format:'document-search-v1',generated_at:new Date().toISOString()};
   for(const name of ['collections','documents','reviews','actions','query_log','audit_events'])snapshot[name]=await db.query(`select * from ${name} order by id`);
   // Generated vectors are rebuilt from text; retain all source and review evidence.
   for(const d of snapshot.documents)delete d.search_vector;
   const file=path.resolve(need(o.file,'file'));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});out={file,documents:snapshot.documents.length,format:snapshot.format};
  }else if(cmd==='draft-review'){
   const sections=[];for(const [key,title] of [['coverage','Collection coverage'],['review-due','Content review queue'],['retention-due','Retention review queue'],['attention','Overdue actions'],['gaps','Unanswered searches']])sections.push({title,html:table(await db.query(queries[key]))});
   out={file:writeOut('drafts','weekly-review',page({title:'Document search review',subtitle:'Private administrator draft. Review before sharing.',sections}))};
  }else if(cmd==='draft-search'){
   const rows=await results(db,o.query,o.group);out={file:writeOut('drafts','citation-pack',page({title:'Search evidence pack',subtitle:`Audience filter: ${o.group}. Query: ${o.query}. Administrator draft.`,sections:rows.length?rows.map(r=>({title:r.title,html:record(r),note:'Quoted source excerpt, not a generated answer. Check the full source before relying on it.'})):[{title:'No approved current source matched',html:'<p>No answer is supported by this search.</p>'}]})),citations:rows.length};
  }
  await db.exec(mutation&&!o['dry-run']?'COMMIT':'ROLLBACK');
  return o['dry-run']?{dry_run:true,result:out}:out;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function human(result){
 if(Array.isArray(result)){if(!result.length)return '  (none)';const keys=Object.keys(result[0]);return textTable(result,keys.map(key=>({key,label:key.replaceAll('_',' '),width:['excerpt','title','finding'].includes(key)?75:42,format:v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v)})));}
 if(result&&typeof result==='object')return Object.entries(result).map(([k,v])=>`${k}:\n${Array.isArray(v)?human(v):v&&typeof v==='object'?JSON.stringify(v,null,2):v}`).join('\n');
 return String(result);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const r=await run(db,process.argv.slice(2));const cmd=process.argv[2];const display=Array.isArray(r)&&cmd==='search'?r.map(({citation,title,review_on,source_url})=>({citation,title,review_on,source_url})):Array.isArray(r)&&['collections','coverage'].includes(cmd)?r.map(({code,name,documents,searchable,held})=>({code,name,documents,searchable,held})):r;console.log(process.argv.includes('--json')?JSON.stringify(r,null,2):human(display));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
