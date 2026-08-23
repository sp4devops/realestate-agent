(function(){
'use strict';
const STATUS_KEY='pa.backup.lastCreatedAt';
let pendingNativeExport=null;
function esc(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function bindShell(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));}
function statusText(){const value=localStorage.getItem(STATUS_KEY);return value?`Last backup: ${new Date(value).toLocaleString()}`:'No backup created yet.';}
function renderSettings(){
 const pinned=window.PropertyAssistantLocations?.readPinned()||[];
 const pinnedHtml=pinned.map(location=>`<span class="pinned-location-chip">${esc(location)}<button type="button" data-unpin-location="${esc(location)}" aria-label="Unpin ${esc(location)}">×</button></span>`).join('');
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">SETTINGS & BACKUP</p><h1>Settings & Backup</h1><p class="lead">Your business memory stays on this device unless you explicitly export an encrypted backup.</p><div class="card" data-testid="pilot-mode"><strong>Current pilot</strong><p>English typing is the supported capture and search path in this build. Voice and additional languages are deferred while the core memory and matching workflow is stabilized.</p></div><div class="card" data-testid="pinned-locations"><strong>Pinned areas</strong><p>Pinned areas appear first while entering a property or requirement location.</p><div class="pinned-location-list">${pinnedHtml||'<span class="lead">No areas pinned yet. Pin one from any area field.</span>'}</div></div><div class="card"><strong>Encrypted local backup</strong><p data-testid="backup-status">${statusText()}</p><label class="field"><span>Backup password</span><input data-testid="backup-password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" /></label><label class="field"><span>Confirm backup password</span><input data-testid="backup-password-confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Type the same password again" /></label><p>Keep this password safe. Property Assistant cannot recover a forgotten backup password.</p><div class="page-actions"><button class="button primary" type="button" data-testid="create-backup">Create encrypted backup</button></div></div><div class="card"><strong>Restore backup</strong><p>Restore replaces the current local structured memory, settings, pinned areas and saved poster images only after the backup is decrypted and validated.</p><label class="field"><span>Encrypted backup file</span><input data-testid="restore-file" type="file" accept=".pabackup,application/json" /></label><label class="field"><span>Backup password</span><input data-testid="restore-password" type="password" autocomplete="current-password" minlength="8" /></label><div class="page-actions"><button class="button" type="button" data-testid="restore-backup">Restore backup</button></div></div><div class="card"><strong>Privacy</strong><p>Property Assistant is local-first. Core data is not uploaded by default. Backup files are created only when you tap Create encrypted backup. Keep the backup password safe: Property Assistant cannot recover it.</p></div><p class="lead" data-testid="settings-status"></p></section>`,'settings');
 bindShell();
 document.querySelector('[data-testid="create-backup"]').addEventListener('click',createBackup);
 document.querySelector('[data-testid="restore-backup"]').addEventListener('click',restoreBackup);
 document.querySelectorAll('[data-unpin-location]').forEach(button=>button.addEventListener('click',()=>{window.PropertyAssistantLocations.unpin(button.dataset.unpinLocation);renderSettings();}));
}
function nativeBackupExportAvailable(){try{return typeof window.PropertyAssistantHost?.exportBackup==='function';}catch(_){return false;}}
function exportInBrowser(fileName,encrypted){
 const blob=new Blob([encrypted],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return Promise.resolve({ok:true,message:'Encrypted backup created on this device.'});
}
function exportNatively(fileName,encrypted){
 if(pendingNativeExport)return Promise.reject(new Error('Another backup export is already open.'));
 return new Promise((resolve,reject)=>{
  pendingNativeExport={resolve,reject};
  try{window.PropertyAssistantHost.exportBackup(fileName,encrypted);}catch(error){pendingNativeExport=null;reject(error);}
 });
}
window.__PA_BACKUP_EXPORT_RESULT__=result=>{
 const pending=pendingNativeExport;if(!pending)return;pendingNativeExport=null;
 if(result?.ok)pending.resolve(result);else pending.reject(new Error(result?.message||'Backup export was cancelled.'));
};
async function createBackup(){
 const status=document.querySelector('[data-testid="settings-status"]');const button=document.querySelector('[data-testid="create-backup"]');button.disabled=true;
 try{
  const passphrase=document.querySelector('[data-testid="backup-password"]').value;
  const confirmation=document.querySelector('[data-testid="backup-password-confirm"]').value;
  if(passphrase!==confirmation)throw new Error('Backup passwords do not match');
  const payload=await PropertyAssistantBackup.createPayload({repository:window.__PA_REPOSITORY__,imageStore:window.PropertyAssistantPosterImages,storage:localStorage});
  const encrypted=await PropertyAssistantBackup.encryptPayload(payload,passphrase);
  const fileName=`property-assistant-${new Date().toISOString().slice(0,10)}.pabackup`;
  const result=nativeBackupExportAvailable()?await exportNatively(fileName,encrypted):await exportInBrowser(fileName,encrypted);
  localStorage.setItem(STATUS_KEY,payload.createdAt);document.querySelector('[data-testid="backup-status"]').textContent=statusText();status.textContent=result?.message||'Encrypted backup created on this device.';
  document.querySelector('[data-testid="backup-password"]').value='';document.querySelector('[data-testid="backup-password-confirm"]').value='';
 }catch(error){status.textContent=error.message||'Backup could not be created.';}finally{button.disabled=false;}
}
async function restoreBackup(){
 const status=document.querySelector('[data-testid="settings-status"]');const button=document.querySelector('[data-testid="restore-backup"]');button.disabled=true;
 try{
  const file=document.querySelector('[data-testid="restore-file"]').files[0];if(!file)throw new Error('Choose an encrypted backup file first');
  const passphrase=document.querySelector('[data-testid="restore-password"]').value;
  const payload=await PropertyAssistantBackup.decryptBackup(await file.text(),passphrase);
  await PropertyAssistantBackup.restorePayload(payload,{imageStore:window.PropertyAssistantPosterImages,storage:localStorage});
  document.querySelector('[data-testid="restore-password"]').value='';status.textContent='Backup restored safely. Reloading local memory…';setTimeout(()=>location.reload(),0);
 }catch(error){status.textContent=error.message||'Backup could not be restored.';button.disabled=false;}
}
function owned(){if(route()==='settings')renderSettings();}
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
