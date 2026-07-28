export const BROWSER_SETUP_WIZARD_VERSION = "1.0";

function normalizeApiBase(apiBase = "/api/setup") {
  return String(apiBase).replace(/\/$/, "");
}

function createHtml(options) {
  return `<main class="wpsc-setup" data-wpsc-setup-wizard data-api-base="${normalizeApiBase(options.apiBase)}">
  <section class="wpsc-setup__card" aria-labelledby="setup-title">
    <p class="wpsc-setup__eyebrow">WPSC Site Setup</p>
    <h1 id="setup-title" data-setup-title>Start a new site</h1>
    <p class="wpsc-setup__progress" data-setup-progress>0%</p>
    <form data-setup-start-form>
      <label for="setup-site-id">Site ID</label>
      <input id="setup-site-id" name="siteId" required autocomplete="off">
      <button type="submit">Start setup</button>
    </form>
    <button type="button" data-setup-advance hidden>Continue</button>
    <button type="button" data-setup-refresh hidden>Refresh status</button>
    <section data-setup-errors aria-live="polite"></section>
  </section>
</main>`;
}

function createCss() {
  return `.wpsc-setup{min-height:100vh;display:grid;place-items:center;padding:2rem;background:linear-gradient(135deg,#f4efe6,#d7e9df);color:#1d3328;font-family:Georgia,serif}.wpsc-setup__card{width:min(100%,34rem);padding:2.5rem;background:#fffdf8;border:1px solid #b6cbbd;box-shadow:12px 12px 0 #1d3328}.wpsc-setup__eyebrow{margin:0;color:#40705a;font:700 .75rem/1.2 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.wpsc-setup h1{margin:.75rem 0;font-size:2.25rem}.wpsc-setup form{display:grid;gap:.6rem}.wpsc-setup input,.wpsc-setup button{padding:.75rem;border:1px solid #1d3328;font:inherit}.wpsc-setup button{margin-top:.75rem;background:#1d3328;color:#fffdf8;cursor:pointer}.wpsc-setup button[hidden]{display:none}.wpsc-setup [data-setup-errors]{margin-top:1rem;color:#982f28}.wpsc-setup [data-setup-errors] p{margin:.35rem 0}`;
}

function createJavaScript() {
  return `const root=document.querySelector('[data-wpsc-setup-wizard]');
if(root){
  const apiBase=root.dataset.apiBase;
  const model={sessionId:null,currentStateId:null,revision:null};
  const title=root.querySelector('[data-setup-title]');
  const progress=root.querySelector('[data-setup-progress]');
  const errors=root.querySelector('[data-setup-errors]');
  const startForm=root.querySelector('[data-setup-start-form]');
  const advance=root.querySelector('[data-setup-advance]');
  const refresh=root.querySelector('[data-setup-refresh]');

  function renderDiagnostics(diagnostics){
    errors.replaceChildren(...(diagnostics?.errors||[]).map((item)=>{
      const line=document.createElement('p');
      line.textContent=item.message;
      line.dataset.code=item.code;
      line.dataset.severity=item.severity;
      return line;
    }));
  }

  function render(snapshot){
    const presentation=snapshot.presentation||{};
    model.currentStateId=snapshot.session?.currentStateId||null;
    model.revision=snapshot.session?.revision??null;
    title.textContent=presentation.title||'';
    progress.textContent=(presentation.progress??0)+'%';
    advance.hidden=!presentation.canAdvance;
    refresh.hidden=!model.sessionId;
    renderDiagnostics(snapshot.diagnostics);
  }

  async function request(path,method,body){
    const response=await fetch(apiBase+path,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
    return response.json();
  }

  async function refreshState(){
    if(!model.sessionId)return;
    render(await request('/sessions/'+encodeURIComponent(model.sessionId),'GET'));
  }

  startForm.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const snapshot=await request('/sessions','POST',{siteId:new FormData(startForm).get('siteId')});
    if(snapshot.ok){model.sessionId=snapshot.session.id;await refreshState();return;}
    render(snapshot);
  });

  advance.addEventListener('click',async()=>{
    if(!model.sessionId)return;
    await request('/sessions/'+encodeURIComponent(model.sessionId)+'/advance','POST');
    await refreshState();
  });
  refresh.addEventListener('click',refreshState);
}`;
}

export default function createSetupWizard(options = {}) {
  return {
    assets: {
      css: createCss(),
      js: createJavaScript()
    },
    html: createHtml(options),
    version: BROWSER_SETUP_WIZARD_VERSION
  };
}
