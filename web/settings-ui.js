(function(){
'use strict';
const STATUS_KEY='pa.backup.lastCreatedAt';
function route(){return (location.hash.replace(/^#\/?/,'')||'').split('?')[0];}
function bindShell(){document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{location.hash=`#/${el.dataset.route}`;}));}
function statusText(){const value=localStorage.getItem(STATUS_KEY);return value?`Last backup: ${new Date(value).toLocaleString()}`:'No backup created yet.';}
function renderSettings(){
 app.innerHTML=shell(`<section class="page"><p class="eyebrow">SETTINGS & BACKUP</p><h1>Settings & Backup</h1><p class="lead">Your business memory stays on this device unless you explicitly export an encrypted backup.</p><div class="card"><strong>Language</strong><p>App display language and voice/typing language are separate.</p><button class="button" type="button" data-route="language">Language settings</button></div><div class="card"><strong>Encrypted local backup</strong><p data-testid="backup-status">${statusText()}</p><label class="field"><span>Backup password</span><input data-testid="backup-password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" /></label><label class="field"><span>Confirm backup password</span><input data-testid="backup-password-confirm" type="password" autocomplete="new-password" minlength="8" placeholder="Type the same password again" /></label><p>Keep this password safe. Property Assistant cannot recover a forgotten backup password.</p><div class="page-actions"><button class="button primary" type="button" data-testid="create-backup">Create encrypted backup</button></div></div><div class="card"><strong>Restore backup</strong><p>Restore replaces the current local structured memory, settings, and saved poster images only after the backup is decrypted and validated.</p><label class="field"><span>Encrypted backup file</span><input data-testid="restore-file" type="file" accept=".pabackup,application/json" /></label><label class="field"><span>Backup password</span><input data-testid="restore-password" type="password" autocomplete="current-password" minlength="8" /></label><div class="page-actions"><button class="button" type="button" data-testid="restore-backup">Restore backup</button></div></div><div class="card"><strong>Privacy</strong><p>Property Assistant is local-first. Core data is not uploaded by default. Backup files are created only when you tap Create encrypted backup. Keep the backup password safe: Property Assistant cannot recover it.</p></div><p class="lead" data-testid="settings-status"></p></section>`,'settings');
 bindShell();
 document.querySelector('[data-testid="create-backup"]').addEventListener('click',createBackup);
 document.querySelector('[data-testid="restore-backup"]').addEventListener('click',restoreBackup);
}
async function createBackup(){
 const status=document.querySelector('[data-testid="settings-status"]');
 try{
  const passphrase=document.querySelector('[data-testid="backup-password"]').value;
  const confirmation=document.querySelector('[data-testid="backup-password-confirm"]').value;
  if(passphrase!==confirmation)throw new Error('Backup passwords do not match');
  const payload=await PropertyAssistantBackup.createPayload({repository:window.__PA_REPOSITORY__,imageStore:window.PropertyAssistantPosterImages,storage:localStorage});
  const encrypted=await PropertyAssistantBackup.encryptPayload(payload,passphrase);
  const blob=new Blob([encrypted],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`property-assistant-${new Date().toISOString().slice(0,10)}.pabackup`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  localStorage.setItem(STATUS_KEY,payload.createdAt);document.querySelector('[data-testid="backup-status"]').textContent=statusText();status.textContent='Encrypted backup created on this device.';
 }catch(error){status.textContent=error.message||'Backup could not be created.';}
}
async function restoreBackup(){
 const status=document.querySelector('[data-testid="settings-status"]');
 try{
  const file=document.querySelector('[data-testid="restore-file"]').files[0];if(!file)throw new Error('Choose an encrypted backup file first');
  const passphrase=document.querySelector('[data-testid="restore-password"]').value;
  const payload=await PropertyAssistantBackup.decryptBackup(await file.text(),passphrase);
  await PropertyAssistantBackup.restorePayload(payload,{imageStore:window.PropertyAssistantPosterImages,storage:localStorage});
  status.textContent='Backup restored safely. Reloading local memory…';setTimeout(()=>location.reload(),0);
 }catch(error){status.textContent=error.message||'Backup could not be restored.';}
}
function owned(){if(route()==='settings')renderSettings();}
window.addEventListener('hashchange',()=>setTimeout(owned,0));window.addEventListener('DOMContentLoaded',()=>setTimeout(owned,0));
})();
