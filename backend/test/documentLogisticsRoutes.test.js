'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');const jwt=require('jsonwebtoken');
const env=require('../config/env');const service=require('../services/documentLogisticsLookupService');const {authenticateAccessToken}=require('../middleware/authMiddleware');const {runWithRequestContext,getRequestContext}=require('../services/requestContextService');
test('logistics endpoints require company login, allow ordinary users, and use authenticated scope',async()=>{
 const original={getOptions:service.getOptions,findChannels:service.findChannels,getChannel:service.getChannel};const calls=[];
 service.getOptions=async()=>{calls.push(getRequestContext().req.auth);return{shippingTypes:[{value:'1',label:'By Road'}],languages:[{value:'8',label:'English (UK)'}],errors:{}};};
 service.findChannels=async params=>{calls.push(params);return[{CardCode:'C001',CardName:'Channel customer'}];};
 service.getChannel=async code=>{calls.push(code);return{channel:{CardCode:code},contacts:[{value:'25',label:'Contact'}]};};
 const app=express();app.use((req,res,next)=>runWithRequestContext(req,next));app.use('/api',authenticateAccessToken);app.use('/api/document-logistics',require('../routes/documentLogisticsRoutes'));app.use((error,req,res,next)=>res.status(error.statusCode||error.status||500).json({error:error.message}));
 const server=await new Promise(resolve=>{const handle=app.listen(0,'127.0.0.1',()=>resolve(handle));});const base='http://127.0.0.1:'+server.address().port+'/api/document-logistics';
 try{
  const noLogin=await fetch(base+'/options');assert.equal(noLogin.status,401);assert.equal(calls.length,0);
  const token=jwt.sign({tokenType:'access',userId:42,username:'ordinary',companyId:3,roleName:'User'},env.jwtSecret,{expiresIn:'1m'});const headers={Authorization:'Bearer '+token};
  const options=await fetch(base+'/options?companyId=999',{headers});assert.equal(options.status,200);assert.match(options.headers.get('cache-control'),/private, no-store/);assert.equal((await options.json()).shippingTypes[0].label,'By Road');assert.equal(calls[0].userId,42);assert.equal(calls[0].companyId,3);
  await fetch(base+'/channels?query=ABC&top=25&skip=10&companyId=999',{headers});assert.deepEqual(calls[1],{query:'ABC',top:'25',skip:'10'});
  const contact=await fetch(base+'/channels/'+encodeURIComponent('C/001'),{headers});assert.equal(contact.status,200);assert.equal(calls[2],'C/001');assert.equal((await contact.json()).contacts[0].value,'25');
 }finally{await new Promise(resolve=>server.close(resolve));Object.assign(service,original);}
});
