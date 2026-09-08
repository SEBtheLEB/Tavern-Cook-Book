import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {supabaseBackendHeaders} from '../server/supabaseCredentials.js';
const original={...process.env};
afterEach(()=>{for(const key of Object.keys(process.env))if(key.startsWith('TAVERN_SUPABASE_')||key.startsWith('SUPABASE_'))delete process.env[key];Object.assign(process.env,original);});
test('shared schema requires the restricted server token',()=>{
 process.env.TAVERN_SUPABASE_SCHEMA='tavern';
 delete process.env.TAVERN_SUPABASE_ACCESS_TOKEN;
 assert.throws(()=>supabaseBackendHeaders(true),/scoped access token/);
});
test('Data API uses the Tavern schema and Storage avoids schema headers',()=>{
 Object.assign(process.env,{TAVERN_SUPABASE_SCHEMA:'tavern',TAVERN_SUPABASE_ACCESS_TOKEN:'scoped-fixture',TAVERN_SUPABASE_PUBLISHABLE_KEY:'public-fixture'});
 const headers=supabaseBackendHeaders(true);
 assert.equal(headers.Authorization,'Bearer scoped-fixture');
 assert.equal(headers.apikey,'public-fixture');
 assert.equal(headers['Accept-Profile'],'tavern');
 assert.equal(headers['Content-Profile'],'tavern');
 assert.equal(supabaseBackendHeaders()['Accept-Profile'],undefined);
});
test('refuses selecting another app schema',()=>{
 process.env.TAVERN_SUPABASE_SCHEMA='memoreeeez';
 assert.throws(()=>supabaseBackendHeaders(true),/must be public or tavern/);
});
