import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync } from "node:fs";

// Refuse production or shared databases: this test creates fake projects and metrics fixtures.
const database = new URL(process.env.TEST_DATABASE_URL || "postgresql://invalid");
if (!["localhost", "127.0.0.1"].includes(database.hostname) || !/^\/cadence_admin_test_[a-z0-9_]+$/.test(database.pathname)) {
  throw new Error("Provide a disposable local PostgreSQL TEST_DATABASE_URL named cadence_admin_test_<suffix>");
}
const env = { ...process.env, DATABASE_URL: database.href, DIRECT_URL: database.href,
  DATABASE_URL_UNPOOLED: database.href, POSTGRES_URL_NON_POOLING: database.href };
const migrated = spawnSync(process.execPath, ["scripts/prisma.mjs", "migrate", "deploy"], { env, encoding: "utf8" });
assert.equal(migrated.status, 0, migrated.stderr);
const listener = createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "ignore" });

class Client {
  cookie = "";
  async call(path, data, method = data ? "POST" : "GET") {
    const response = await fetch(base + path, { method, redirect: "manual", headers: {
      "Content-Type": "application/json", Cookie: this.cookie, Origin: base,
    }, body: data === undefined ? undefined : JSON.stringify(data) });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    return { status: response.status, body: await response.json().catch(() => null) };
  }
  async ok(path, data, method) {
    const result = await this.call(path, data, method);
    assert.ok(result.status >= 200 && result.status < 300, `${path}: ${result.status} ${JSON.stringify(result.body)}`);
    return result.body;
  }
}
const password = "Timeline-test-password-38726";
try {
  for (let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await delay(100);}
  const owner=new Client(), stranger=new Client(), editor=new Client(), reader=new Client(), anonymous=new Client();
  await owner.ok('/api/auth/signup',{name:'Timeline Owner',email:'timeline-owner@example.invalid',password});
  await stranger.ok('/api/auth/signup',{name:'Stranger',email:'timeline-stranger@example.invalid',password});
  const project=await owner.ok('/api/projects',{name:'Timeline QA',hasTimeline:true,hasTracker:false,hasSprints:false,hasRoles:true});
  const other=await owner.ok('/api/projects',{name:'Other timeline',hasTimeline:true,hasTracker:false});
  const path=`/api/projects/${project.id}`, bulk=path+'/tasks/assignees';
  const todo=await owner.ok(path+'/columns',{name:'In progress',color:'#2f7ed8'});
  const done=await owner.ok(path+'/columns',{name:'Done',isDone:true});
  assert.equal(done.isDone,true); assert.equal((await owner.ok('/api/projects')).find(p=>p.id===project.id).hasTracker,false);
  const roster=await owner.ok('/api/developers'); const people=[roster[0]];
  for(let i=0;i<4;i++)people.push(await owner.ok('/api/developers',{name:'Person '+(i+1)}));
  const foreign=(await stranger.ok('/api/developers'))[0];
  const tasks=[];
  for(let i=0;i<4;i++)tasks.push(await owner.ok('/api/tasks',{projectId:project.id,title:'Timeline task '+(i+1),columnId:todo.id,assigneeIds:i===0?[people[0].id]:[],startDate:'2026-11-14',endDate:'2026-11-18'}));
  const otherTask=await owner.ok('/api/tasks',{projectId:other.id,title:'Other task'});
  const data={taskIds:tasks.slice(0,3).map(t=>t.id),assigneeIds:[people[1].id,people[2].id],mode:'add'};
  const rows=await owner.ok(bulk,data,'PATCH'); assert.equal(rows.length,3);
  assert.deepEqual(rows.find(t=>t.id===tasks[0].id).assigneeIds,[people[0].id,people[1].id,people[2].id]);
  assert.deepEqual(rows.find(t=>t.id===tasks[1].id).assigneeIds,[people[1].id,people[2].id]);
  const all=()=>owner.ok('/api/tasks?projectId='+project.id);
  assert.deepEqual((await all()).find(t=>t.id===tasks[3].id).assigneeIds,[]);
  assert.equal((await owner.call(bulk,{...data,assigneeIds:[people[3].id,people[4].id]},'PATCH')).status,400);
  assert.equal((await all()).find(t=>t.id===tasks[1].id).assigneeIds.length,2,'Over-cap batch must change no rows');
  assert.equal((await owner.call(bulk,{...data,taskIds:[tasks[0].id,otherTask.id]},'PATCH')).status,404);
  assert.equal((await owner.call(bulk,{...data,assigneeIds:[foreign.id]},'PATCH')).status,404);
  assert.equal((await stranger.call(bulk,data,'PATCH')).status,404);
  assert.equal((await anonymous.call(bulk,data,'PATCH')).status,401);
  for(const invalid of [{...data,taskIds:[]},{...data,taskIds:Array(501).fill(tasks[0].id)},{...data,taskIds:[null]},{...data,assigneeIds:[]},{...data,mode:'delete'}])assert.equal((await owner.call(bulk,invalid,'PATCH')).status,400);
  await owner.ok('/api/developers/'+people[4].id,{active:false},'PATCH');
  assert.equal((await owner.call(bulk,{...data,assigneeIds:[people[4].id]},'PATCH')).status,404);
  const replaced=await owner.ok(bulk,{...data,mode:'replace',assigneeIds:[people[3].id]},'PATCH');
  assert(replaced.every(t=>t.assigneeIds.length===1&&t.assigneeIds[0]===people[3].id));
  const parallel=await Promise.all([people[0],people[1]].map(person=>owner.call(bulk,{...data,assigneeIds:[person.id]},'PATCH')));
  assert(parallel.every(result=>[200,409].includes(result.status)));
  const concurrentRows=(await all()).filter(t=>data.taskIds.includes(t.id));
  for(const row of concurrentRows){
    assert(row.assigneeIds.includes(people[3].id));
    parallel.forEach((result,index)=>{if(result.status===200)assert(row.assigneeIds.includes(people[index].id),'Successful concurrent additions must not be lost');});
  }
  const role=await owner.ok(path+'/roles',{name:'Timeline editor',canEditTimeline:true,canViewTimeline:true});
  const invite=await owner.ok(path+'/members',{developerId:people[1].id,roleIds:[role.id]},'PUT');
  await editor.ok('/api/invites/'+invite.invite.token,{username:'timeline_editor',password});
  assert.equal((await editor.call(bulk,data,'PATCH')).status,200);
  assert.equal((await editor.call('/api/projects/'+other.id+'/tasks/assignees',data,'PATCH')).status,404);
  assert.equal((await editor.call(path+'/columns',{name:'Forbidden'})).status,401);
  const readRole=await owner.ok(path+'/roles',{name:'Reader',canViewTimeline:true});
  const readInvite=await owner.ok(path+'/members',{developerId:people[2].id,roleIds:[readRole.id]},'PUT');
  await reader.ok('/api/invites/'+readInvite.invite.token,{username:'timeline_reader',password});
  assert.equal((await reader.call(bulk,data,'PATCH')).status,403);
  await owner.ok(path,{hasTimeline:false},'PATCH');assert.equal((await owner.call(bulk,data,'PATCH')).status,403);await owner.ok(path,{hasTimeline:true},'PATCH');
  await owner.ok('/api/tasks/'+tasks[0].id,{columnId:done.id},'PATCH');
  assert.equal((await all()).find(t=>t.id===tasks[0].id).columnId,done.id);
  console.log('Timeline API passed: columns with Tracker off, add/replace, unaffected tasks, atomic cap refusal, active roster, limits and cross-project/workspace/role isolation.');
  if(process.env.TIMELINE_TEST_FIXTURE)writeFileSync(process.env.TIMELINE_TEST_FIXTURE,JSON.stringify({database:database.href,email:'timeline-owner@example.invalid',password,projectId:project.id,people:people.map(p=>({id:p.id,name:p.name})),tasks:tasks.map(t=>({id:t.id,title:t.title})),editorUsername:'timeline_editor',readerUsername:'timeline_reader'}),{mode:0o600});
} finally {server.kill('SIGTERM');}
