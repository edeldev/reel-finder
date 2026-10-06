import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

test('Vercel: los módulos emitidos arrancan en Node ESM sin tsx ni bundling',()=>{
 const root=process.cwd();const output=mkdtempSync(join(tmpdir(),'reel-finder-esm-'));
 try{
  writeFileSync(join(output,'package.json'),JSON.stringify({type:'module'}));
  const emit=(dir:string)=>{for(const entry of readdirSync(join(root,dir),{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())emit(file);else if(file.endsWith('.ts')){const target=join(output,file.replace(/\.ts$/,'.js'));mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,ts.transpileModule(readFileSync(join(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}}};
  for(const dir of ['api','backend','src/data','src/lib','src/types'])emit(dir);
  const script=`import search from './api/search.js';import health from './api/health.js';import {EventEmitter} from 'node:events';delete process.env.TAVILY_API_KEY;if(typeof search!=='function'||typeof health!=='function')throw Error('Invalid Node handler');const res=Object.assign(new EventEmitter(),{writableEnded:false,setHeader(){},end(body){const data=JSON.parse(body);if(data.configured!==false)throw Error('Invalid health');this.writableEnded=true;}});await health({method:'GET',url:'/api/health',headers:{}},res);console.log('ESM startup OK');`;
  const result=execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:output,encoding:'utf8'});assert.match(result,/ESM startup OK/);
 }finally{rmSync(output,{recursive:true,force:true});}
});
