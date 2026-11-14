import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../src/lib/task-selection.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {toggleTaskSelection:select}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('Shift selects forward/backward ranges in visible order and keeps existing selections',()=>{
 assert.deepEqual(select(['a','b','c','d'],['d'],'b','a',true),['d','a','b']);
 assert.deepEqual(select(['a','b','c','d'],['a'],'a','c',true),['a','b','c']);
});
test('Selection toggles individual tasks and never includes hidden/deleted rows',()=>{
 assert.deepEqual(select(['a','c'],['a','deleted','b'],'b','c',true),['a','c']);
 assert.deepEqual(select(['a','c'],['a'],'a','a',false),[]);
 assert.deepEqual(select(['a'],['a'],'a','missing',true),['a']);
});
