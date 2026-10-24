import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 OFFLINE_BLOCKED_MESSAGE,chooseOfflineDatabase,classifyOfflineRequest,installOfflineNetworkGuard,offlineSocketAllowed,readWorkshopHost,readWorkshopSnapshot,resolveWorkshopMode,workshopMode
} from '../src/utils/workshopRuntime.ts';
import {isAllowedDesktopReturnUrl} from '../src/utils/desktopShell.ts';

const PAGE='http://127.0.0.1:5181/#characters';
const host=(mode:string,extra:Record<string,unknown>={})=>({version:1,mode,appId:'tavern-cook-book',requestSession:async()=>null,onSession:()=>()=>{},...extra});

test('standalone, Vercel and Tauri builds have no Workshop mode',()=>{
 assert.equal(workshopMode,'standalone');
 assert.equal(resolveWorkshopMode(undefined,null),'standalone');
 assert.equal(resolveWorkshopMode('',null),'standalone');
});

test('offline wins over live and unknown flags fail safe to offline',()=>{
 assert.equal(resolveWorkshopMode('offline',null),'offline');
 assert.equal(resolveWorkshopMode('live',null),'live');
 assert.equal(resolveWorkshopMode(undefined,readWorkshopHost(host('live'))),'live');
 assert.equal(resolveWorkshopMode('live',readWorkshopHost(host('offline'))),'offline');
 assert.equal(resolveWorkshopMode('offline',readWorkshopHost(host('live'))),'offline');
 assert.equal(resolveWorkshopMode('ofline',null),'offline');
});

test('the Workshop host bridge must have the expected shape',()=>{
 assert.ok(readWorkshopHost(host('offline')));
 for(const bad of [null,{},host('production'),host('live',{version:2}),host('live',{requestSession:'x'}),host('live',{appId:3})])assert.equal(readWorkshopHost(bad),null);
});

test('offline requests: same-origin assets load, /api is answered locally, everything else is refused',()=>{
 assert.equal(classifyOfflineRequest('/src/main.tsx',PAGE),'local');
 assert.equal(classifyOfflineRequest('./lore-data.json',PAGE),'local');
 assert.equal(classifyOfflineRequest('data:image/png;base64,AAAA',PAGE),'local');
 assert.equal(classifyOfflineRequest('/api/sync?scope=published',PAGE),'api');
 assert.equal(classifyOfflineRequest('/api',PAGE),'api');
 for(const url of ['https://the-tavern-cook-book.vercel.app/api/sync','https://www.googleapis.com/drive/v3/files','https://apis.google.com/js/api.js','https://api.liveblocks.io/v7','http://127.0.0.1:5174/api/sync','http://[','//evil.example/x'])
  assert.equal(classifyOfflineRequest(url,PAGE),'blocked',url);
 assert.equal(offlineSocketAllowed('ws://127.0.0.1:5181/?token=vite',PAGE),true);
 assert.equal(offlineSocketAllowed('wss://api.liveblocks.io/v7',PAGE),false);
 assert.equal(offlineSocketAllowed('ws://127.0.0.1:5182/',PAGE),false);
});

test('the offline guard never forwards team, Google or paid-service traffic',async()=>{
 const forwarded:string[]=[];
 class FakeXhr{open(_method:string,url:string){forwarded.push('xhr '+url);}}
 class FakeSocket{constructor(url:string){forwarded.push('socket '+url);}}
 class FakeSource{constructor(url:string){forwarded.push('events '+url);}}
 const scope:any={location:{href:PAGE},fetch:async(input:unknown)=>{forwarded.push('fetch '+String(input));return new Response('asset');},XMLHttpRequest:FakeXhr,WebSocket:FakeSocket,EventSource:FakeSource,navigator:{sendBeacon:(url:string)=>{forwarded.push('beacon '+url);return true;}}};
 installOfflineNetworkGuard(scope);
 installOfflineNetworkGuard(scope);
 assert.equal(await (await scope.fetch('/src/App.tsx')).text(),'asset');
 const api=await scope.fetch('/api/sync?scope=published',{method:'POST',body:'{}'});
 assert.equal(api.status,503);
 const body=await api.json();
 assert.equal(body.offline,true);assert.equal(body.configured,false);assert.equal(body.ok,false);
 await assert.rejects(scope.fetch('https://www.googleapis.com/upload/drive/v3/files'),new RegExp(OFFLINE_BLOCKED_MESSAGE));
 await assert.rejects(scope.fetch(new URL('https://the-tavern-cook-book.vercel.app/api/speechify')),/Blocked/);
 assert.throws(()=>new scope.XMLHttpRequest().open('GET','https://apis.google.com/js/api.js'),/Blocked/);
 assert.throws(()=>new scope.XMLHttpRequest().open('POST','/api/assistant'),/Blocked/);
 new scope.XMLHttpRequest().open('GET','/public/lore-data.json');
 assert.throws(()=>new scope.WebSocket('wss://api.liveblocks.io/v7'),/Blocked/);
 new scope.WebSocket('ws://127.0.0.1:5181/');
 assert.throws(()=>new scope.EventSource('https://api.example/stream'),/Blocked/);
 assert.equal(scope.navigator.sendBeacon('https://analytics.example/collect','x'),false);
 assert.deepEqual(forwarded,['fetch /src/App.tsx','xhr /public/lore-data.json','socket ws://127.0.0.1:5181/']);
});

test('a newer team snapshot replaces offline data only when nothing was edited offline',()=>{
 assert.equal(chooseOfflineDatabase({snapshotSavedAt:null,localHash:'a',base:null}),'local');
 assert.equal(chooseOfflineDatabase({snapshotSavedAt:'2026-10-23T10:00:00Z',localHash:'a',base:null}),'snapshot');
 assert.equal(chooseOfflineDatabase({snapshotSavedAt:'2026-10-23T10:00:00Z',localHash:'b',base:{savedAt:'2026-10-23T10:00:00Z',hash:'a'}}),'local');
 assert.equal(chooseOfflineDatabase({snapshotSavedAt:'2026-10-23T11:00:00Z',localHash:'a',base:{savedAt:'2026-10-23T10:00:00Z',hash:'a'}}),'snapshot');
 assert.equal(chooseOfflineDatabase({snapshotSavedAt:'2026-10-23T11:00:00Z',localHash:'b',base:{savedAt:'2026-10-23T10:00:00Z',hash:'a'}}),'local-drafts');
});

test('snapshots from the host are shape checked',()=>{
 const value=readWorkshopSnapshot({savedAt:'2026-10-23T10:00:00Z',teamUpdatedAt:'2026-10-23T09:59:00Z',payload:{database:{entries:[]},settings:{visibility:{}}}});
 assert.deepEqual(value,{savedAt:'2026-10-23T10:00:00Z',teamUpdatedAt:'2026-10-23T09:59:00Z',database:{entries:[]},settings:{visibility:{}}});
 for(const bad of [null,[],{payload:null},{payload:{database:'x'}}])assert.equal(readWorkshopSnapshot(bad),null);
});

test('desktop sign-in returns credentials only to the app scheme or a Workshop loopback receiver',()=>{
 for(const ok of ['stl-tavern-cook-book://auth','http://127.0.0.1:51432/stl-workshop/auth/abcdefghijklmnopqrstuv','http://localhost:5000/stl-workshop/auth/AbC-_0123456789xyz'])
  assert.equal(isAllowedDesktopReturnUrl(ok),true,ok);
 for(const bad of ['https://evil.example/','https://the-tavern-cook-book.vercel.app/','http://127.0.0.1:51432/other','http://evil.example:80/stl-workshop/auth/abcdefghijklmnopqrstuv','http://127.0.0.1/stl-workshop/auth/abcdefghijklmnopqrstuv','http://127.0.0.1:51432/stl-workshop/auth/short','http://127.0.0.1:51432/stl-workshop/auth/abcdefghijklmnopqrstuv?x=1','http://user:pw@127.0.0.1:51432/stl-workshop/auth/abcdefghijklmnopqrstuv','stl-tavern-cook-book://auth?next=https://evil.example','javascript:alert(1)','file:///C:/x'])
  assert.equal(isAllowedDesktopReturnUrl(bad),false,bad);
});
