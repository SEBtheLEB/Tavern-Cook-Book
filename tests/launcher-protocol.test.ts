import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 COOKBOOK_APP_ID,DEFAULT_LAUNCHER_ORIGINS,WORKSHOP_SESSION_TYPE,isTrustedLauncherEvent,launcherOrigins,parseAllowedOrigins,validateLauncherSessionPayload,validateProgressRequest
} from '../src/utils/launcherProtocol.ts';

const NOW=Date.UTC(2026,9,23,12);
const base64url=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt=(claims:Record<string,unknown>)=>`${base64url({alg:'RS256',typ:'JWT'})}.${base64url(claims)}.c2lnbmF0dXJl`;
const parent={name:'parent window'},opener={name:'opener window'},self={name:'cook book window'},stranger={name:'other frame'};
const context={allowedOrigins:['https://stl-workshop.vercel.app'],selfOrigin:'https://the-tavern-cook-book.vercel.app',selfWindow:self,trustedSources:[parent,opener]};
const session=(extra:Record<string,unknown>={})=>({type:WORKSHOP_SESSION_TYPE,appId:COOKBOOK_APP_ID,user:{name:'Sebastien',email:'Seb@Example.com',role:'Admin',permissions:['admin']},...extra});

test('allowed launcher origins are exact http(s) origins only',()=>{
 assert.deepEqual(parseAllowedOrigins(' https://stl-workshop.vercel.app, http://127.0.0.1:5181 ,*,https://a.example/path,https://b.example/,javascript:alert(1),https://*.vercel.app'),['https://stl-workshop.vercel.app','http://127.0.0.1:5181']);
 assert.deepEqual(launcherOrigins(''),DEFAULT_LAUNCHER_ORIGINS);
 assert.deepEqual(launcherOrigins('*'),DEFAULT_LAUNCHER_ORIGINS);
 assert.deepEqual(launcherOrigins('https://launcher.example'),['https://launcher.example']);
});

test('session messages need an approved origin and the parent or opener window as source',()=>{
 assert.equal(isTrustedLauncherEvent({origin:'https://stl-workshop.vercel.app',source:parent,data:{}},context),true);
 assert.equal(isTrustedLauncherEvent({origin:'https://stl-workshop.vercel.app',source:opener,data:{}},context),true);
 assert.equal(isTrustedLauncherEvent({origin:'https://stl-workshop.vercel.app',source:stranger,data:{}},context),false,'another frame on the launcher origin');
 assert.equal(isTrustedLauncherEvent({origin:'https://stl-workshop.vercel.app',source:null,data:{}},context),false);
 // The former hostname heuristic accepted any host containing "stl-workshop" and any loopback port.
 assert.equal(isTrustedLauncherEvent({origin:'https://stl-workshop.attacker.example',source:parent,data:{}},context),false);
 assert.equal(isTrustedLauncherEvent({origin:'http://127.0.0.1:9999',source:parent,data:{}},context),false);
 assert.equal(isTrustedLauncherEvent({origin:'null',source:parent,data:{}},context),false,'sandboxed frames');
 assert.equal(isTrustedLauncherEvent({origin:'',source:parent,data:{}},context),false);
 // Same-origin documents already share the app's storage.
 assert.equal(isTrustedLauncherEvent({origin:'https://the-tavern-cook-book.vercel.app',source:self,data:{}},context),true);
 assert.equal(isTrustedLauncherEvent({origin:'https://the-tavern-cook-book.vercel.app',source:stranger,data:{}},context),false);
});

test('valid sessions are normalized and legacy app IDs stay accepted',()=>{
 const result=validateLauncherSessionPayload(session(),NOW);
 assert.equal(result.ok,true);
 if(!result.ok)return;
 assert.equal(result.value.user?.email,'seb@example.com');
 assert.deepEqual(result.value.user?.permissions,['admin']);
 assert.equal(validateLauncherSessionPayload(session({appId:'tales-codex'}),NOW).ok,true);
 assert.equal(validateLauncherSessionPayload({type:WORKSHOP_SESSION_TYPE,user:{email:'legacy@example.com'}},NOW).ok,true,'older launchers omit appId');
 const withPicture=validateLauncherSessionPayload(session({user:{email:'a@example.com',picture:'http://insecure.example/a.png',name:'x'.repeat(300)}}),NOW);
 assert.equal(withPicture.ok&&withPicture.value.user?.picture,'');
 assert.equal(withPicture.ok&&withPicture.value.user?.name.length,200);
});

test('credentials must be well formed, unexpired and match the launcher user',()=>{
 const credential=jwt({email:'seb@example.com',email_verified:true,exp:NOW/1000+600});
 const result=validateLauncherSessionPayload(session({googleCredential:credential}),NOW);
 assert.equal(result.ok&&result.value.credentialEmail,'seb@example.com');
 assert.equal(validateLauncherSessionPayload({type:WORKSHOP_SESSION_TYPE,appId:COOKBOOK_APP_ID,googleCredential:credential},NOW).ok,true,'credential-only session');
 assert.deepEqual(validateLauncherSessionPayload(session({googleCredential:jwt({email:'other@example.com',exp:NOW/1000+600})}),NOW),{ok:false,reason:'email-mismatch'});
 assert.deepEqual(validateLauncherSessionPayload(session({googleCredential:jwt({email:'seb@example.com',exp:NOW/1000-1})}),NOW),{ok:false,reason:'expired'});
 for(const bad of ['not-a-jwt','a.b','a.%%%.c',jwt({name:'no email'}),'x'.repeat(9000)+'.a.b',42])
  assert.equal(validateLauncherSessionPayload(session({googleCredential:bad}),NOW).ok,false,String(bad).slice(0,20));
});

test('wrong type, app or payload shape is rejected',()=>{
 const cases:[unknown,string][]=[
  [null,'payload'],['stl-workshop-session','payload'],[[],'payload'],
  [{...session(),type:'stl-workshop-progress'},'type'],
  [{...session(),appId:'another-app'},'appId'],[{...session(),appId:7},'appId'],
  [session({user:{email:'not an email'}}),'email'],[session({user:{email:7}}),'user'],[session({user:['a@example.com']}),'user'],
  [session({user:{email:'a@example.com',permissions:'admin'}}),'permissions'],
  [session({user:{email:'a@example.com',permissions:Array(33).fill('editor')}}),'permissions'],
  [session({user:{email:'a@example.com',permissions:[{admin:true}]}}),'permissions'],
  [{type:WORKSHOP_SESSION_TYPE,appId:COOKBOOK_APP_ID},'identity'],
 ];
 for(const [payload,reason] of cases)assert.deepEqual(validateLauncherSessionPayload(payload,NOW),{ok:false,reason},JSON.stringify(payload)?.slice(0,80));
});

test('progress requests use the same app ID rules',()=>{
 assert.equal(validateProgressRequest({type:'stl-workshop-progress-request',appId:COOKBOOK_APP_ID}),true);
 assert.equal(validateProgressRequest({type:'stl-workshop-progress-request'}),true);
 assert.equal(validateProgressRequest({type:'stl-workshop-progress-request',appId:'another-app'}),false);
 assert.equal(validateProgressRequest({type:'stl-workshop-session'}),false);
});
