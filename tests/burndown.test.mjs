import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/burndown.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022} }).outputText;
const { buildBurndown } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const date = value => new Date(`2026-11-${value}T12:00:00Z`);
const task = (id,created,done=false) => ({id,createdAt:date(created),column:{isDone:done}});
const event = (id,taskId,at,done=false) => ({id,taskId,at:date(at),column:{isDone:done}});
const span = {startDate:date('10'),endDate:date('15')};
test('burndown replays completions, new scope and reopened work; future is unknown',()=>{
 const result = buildBurndown([task('a','09'),task('b','12',true)], [event('1','a','09'),event('2','a','11',true),event('3','a','13'),event('4','b','12'),event('5','b','14',true)], span,date('14'));
 assert.deepEqual(result.points.map(p=>p.remaining),[1,0,1,2,1,null]);
 assert.deepEqual(result.points.map(p=>p.scope),[1,1,2,2,2,2]);
 assert.equal(result.points[0].ideal,1); assert.equal(result.points.at(-1).ideal,0);
 assert.equal(result.missingHistory,0);
});
test('missing or deleted-column history is a gap; current count remains authoritative',()=>{
 const result = buildBurndown([task('a','09',true)], [{...event('1','a','09'),column:null}], span,date('14'));
 assert.equal(result.points[0].remaining,null); assert.equal(result.points[4].remaining,0);
 assert.equal(result.points[0].ideal,null); assert.equal(result.missingHistory,1);
});
test('no deadline invents no ideal line; empty and one-day projects remain valid',()=>{
 const empty=buildBurndown([],[],{startDate:null,endDate:null},date('14'));
 assert.equal(empty.points.length,1);assert.equal(empty.points[0].remaining,0);assert.equal(empty.points[0].ideal,null);
 const one=buildBurndown([task('a','14')],[],{startDate:date('14'),endDate:date('14')},date('14'));
 assert.equal(one.points[0].remaining,1);assert.equal(one.points[0].ideal,0);
});
test('overdue projects extend to today; planned projects have no fabricated actuals',()=>{
 const overdue=buildBurndown([task('a','09')],[event('1','a','09')],{startDate:date('10'),endDate:date('12')},date('14'));
 assert.equal(overdue.points.at(-1).date,'2026-11-14');assert.equal(overdue.points.at(-1).ideal,0);
 const future=buildBurndown([],[],{startDate:date('15'),endDate:date('20')},date('14'));
 assert(future.points.every(p=>p.remaining===null));
});
test('long histories have bounded points and retain current observation',()=>{
 const result=buildBurndown([task('a','09')],[event('1','a','09')],{startDate:new Date('2000-01-01'),endDate:new Date('2040-01-01')},date('14'));
 assert(result.points.length<=122);assert.equal(result.points.find(p=>p.date==='2026-11-14').remaining,1);
});
