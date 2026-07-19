"use strict";

const app = document.getElementById("app");
const toastEl = document.getElementById("toast");

/* ---------------- utilidades ---------------- */
async function api(path, opts = {}) {
  const resp = await fetch(path, opts);
  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resp.ok) throw new Error((dados && dados.erro) || `Erro ${resp.status}`);
  return dados;
}

let toastTimer;
function toast(msg, erro = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("is-error", erro);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), erro ? 6000 : 3000);
}

function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuracao(seg) {
  seg = Math.round(seg || 0);
  const m = String(Math.floor(seg / 60)).padStart(2, "0");
  const s = String(seg % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function statusDe(c) {
  if (c.prontuario) return { cls: "pronto", txt: "Prontuário pronto" };
  if (c.transcricao) return { cls: "transcrito", txt: "Transcrito" };
  return { cls: "rascunho", txt: "Rascunho" };
}

const ESPECIALIDADES = [
  "Clínica geral", "Pediatria", "Ginecologia e Obstetrícia", "Cardiologia",
  "Psiquiatria", "Ortopedia", "Dermatologia", "Neurologia", "Endocrinologia",
  "Gastroenterologia", "Pneumologia", "Otorrinolaringologia", "Oftalmologia",
  "Urologia", "Nutrição", "Fisioterapia", "Psicologia", "Odontologia",
];

const CAMPOS = [
  { chave: "queixa_principal", rotulo: "Queixa principal" },
  { chave: "historia_doenca_atual", rotulo: "História da doença atual" },
  { chave: "antecedentes", rotulo: "Antecedentes" },
  { chave: "exame_fisico", rotulo: "Exame físico" },
  { chave: "hipoteses_diagnosticas", rotulo: "Hipóteses diagnósticas", lista: true },
  { chave: "conduta", rotulo: "Conduta" },
  { chave: "observacoes", rotulo: "Observações" },
];

/* ---------------- tela: lista ---------------- */
async function viewLista() {
  pararGravacaoSilencioso();
  let consultas = [];
  try {
    consultas = await api("/api/consultas");
  } catch (e) {
    toast(e.message, true);
  }

  const itens = consultas
    .map((c) => {
      const st = statusDe(c);
      const nome = c.paciente || "Paciente sem nome";
      return `
      <div class="consulta-item" data-id="${c.id}">
        <div class="consulta-item__main">
          <div class="consulta-item__nome">${esc(nome)}</div>
          <div class="consulta-item__meta">${esc(fmtData(c.atualizado_em))}${
        c.duracao_seg ? " · " + fmtDuracao(c.duracao_seg) : ""
      }</div>
        </div>
        <span class="badge badge--${st.cls}">${st.txt}</span>
      </div>`;
    })
    .join("");

  const vazio = `
    <div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M9 15h6"></path><path d="M9 11h2"></path>
      </svg>
      <div>Nenhuma consulta ainda.</div>
      <div class="subtle" style="margin-top:6px">Clique em “Nova consulta” para começar.</div>
    </div>`;

  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Consultas</h1>
        <div class="subtle">Da conversa ao prontuário.</div>
      </div>
      <button id="btn-nova" class="btn btn--primary">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        Nova consulta
      </button>
    </div>
    <div class="list">${consultas.length ? itens : vazio}</div>`;

  document.getElementById("btn-nova").addEventListener("click", async () => {
    try {
      const nova = await api("/api/consultas", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      viewConsulta(nova.id);
    } catch (e) {
      toast(e.message, true);
    }
  });

  app.querySelectorAll(".consulta-item").forEach((el) =>
    el.addEventListener("click", () => viewConsulta(Number(el.dataset.id)))
  );
}

/* ---------------- tela: consulta ---------------- */
async function viewConsulta(id) {
  let c;
  try {
    c = await api(`/api/consultas/${id}`);
  } catch (e) {
    toast(e.message, true);
    return viewLista();
  }

  const camposProntuario = c.prontuario
    ? `<div class="section prontuario">
         <div class="section__title">Prontuário</div>
         ${CAMPOS.map((f) => {
           const val = c.prontuario[f.chave];
           const texto = f.lista ? (Array.isArray(val) ? val.join("\n") : "") : val || "";
           return `<label class="field">
             <span class="field__label">${f.rotulo}</span>
             <textarea data-campo="${f.chave}" ${f.lista ? 'data-lista="1"' : ""} rows="${f.lista ? 3 : 3}">${esc(texto)}</textarea>
           </label>`;
         }).join("")}
       </div>`
    : "";

  app.innerHTML = `
    <button class="link-back" id="voltar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="height:15px;width:15px"><path d="m15 18-6-6 6-6"></path></svg>
      Consultas
    </button>

    <div class="row" style="margin-bottom:20px">
      <label class="field" style="margin:0">
        <span class="field__label">Paciente</span>
        <input type="text" id="paciente" value="${esc(c.paciente)}" placeholder="Nome do paciente" />
      </label>
      <label class="field" style="margin:0">
        <span class="field__label">Especialidade</span>
        <select id="especialidade">${ESPECIALIDADES.map((e) => `<option ${e === c.especialidade ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>
      </label>
    </div>

    <div class="section section--audio">
      <div class="section__title">Gravação da consulta</div>
      <div class="rec">
        <button class="rec__btn" id="rec-btn" title="Gravar / parar">
          <svg id="rec-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" style="display:none"/><path class="mic" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path class="mic" d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line class="mic" x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <div class="rec__info">
          <div class="rec__timer" id="rec-timer">${fmtDuracao(c.duracao_seg)}</div>
          <div class="rec__hint" id="rec-hint">Clique para gravar o áudio da consulta.</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section__title">Transcrição</div>
      <textarea id="transcricao" rows="7" placeholder="A transcrição aparecerá aqui após a gravação — ou digite/cole o texto da consulta.">${esc(c.transcricao)}</textarea>
      <div class="actions">
        <button class="btn btn--primary" id="btn-gerar">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="m5 8 7-5 7 5"></path><path d="M5 16l7 5 7-5"></path></svg>
          ${c.prontuario ? "Gerar novamente" : "Gerar prontuário"}
        </button>
      </div>
    </div>

    <div id="prontuario-container">${camposProntuario}</div>

    <div class="actions">
      <button class="btn btn--ghost" id="btn-salvar">Salvar</button>
      <button class="btn btn--ghost" id="btn-copiar">Copiar prontuário</button>
      <button class="btn btn--ghost" id="btn-word">Exportar (Word)</button>
      <button class="btn btn--ghost" id="btn-exportar">Exportar (PDF)</button>
      <div class="spacer"></div>
      <button class="btn btn--danger" id="btn-excluir">Excluir</button>
    </div>`;

  document.getElementById("voltar").addEventListener("click", viewLista);

  const inputPaciente = document.getElementById("paciente");
  const txtTranscricao = document.getElementById("transcricao");

  // salva paciente/transcrição ao sair do campo
  inputPaciente.addEventListener("blur", () => salvar(id, false));
  txtTranscricao.addEventListener("blur", () => salvar(id, false));
  document.getElementById("especialidade").addEventListener("change", () => salvar(id, false));

  document.getElementById("rec-btn").addEventListener("click", () => alternarGravacao(id));
  document.getElementById("btn-gerar").addEventListener("click", () => gerarProntuario(id));
  document.getElementById("btn-salvar").addEventListener("click", async () => {
    await salvar(id, true);
  });
  document.getElementById("btn-copiar").addEventListener("click", () => copiarProntuario(c.paciente));
  document.getElementById("btn-word").addEventListener("click", async () => {
    if (!coletarProntuario()) return toast("Gere o prontuário antes de exportar.", true);
    await salvar(id, false);
    const a = document.createElement("a");
    a.href = `/api/consultas/${id}/docx`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  document.getElementById("btn-exportar").addEventListener("click", () => window.print());
  document.getElementById("btn-excluir").addEventListener("click", async () => {
    if (!confirm("Excluir esta consulta? Esta ação não pode ser desfeita.")) return;
    try {
      await api(`/api/consultas/${id}`, { method: "DELETE" });
      toast("Consulta excluída.");
      viewLista();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

function coletarProntuario() {
  const container = document.getElementById("prontuario-container");
  if (!container.querySelector("textarea[data-campo]")) return undefined;
  const out = {};
  CAMPOS.forEach((f) => {
    const ta = container.querySelector(`textarea[data-campo="${f.chave}"]`);
    const v = ta ? ta.value : "";
    out[f.chave] = f.lista ? v.split("\n").map((s) => s.trim()).filter(Boolean) : v;
  });
  return out;
}

async function salvar(id, avisar) {
  const corpo = {
    paciente: document.getElementById("paciente").value.trim(),
    especialidade: document.getElementById("especialidade").value,
    transcricao: document.getElementById("transcricao").value,
  };
  const pront = coletarProntuario();
  if (pront) corpo.prontuario = pront;
  try {
    await api(`/api/consultas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (avisar) toast("Alterações salvas.");
  } catch (e) {
    toast(e.message, true);
  }
}

async function gerarProntuario(id) {
  const transcricao = document.getElementById("transcricao").value.trim();
  if (!transcricao) return toast("Grave ou digite a transcrição primeiro.", true);

  await salvar(id, false);
  const container = document.getElementById("prontuario-container");
  container.innerHTML = `<div class="loading-line"><span class="spinner"></span> Gerando prontuário com a IA…</div>`;

  try {
    const c = await api(`/api/consultas/${id}/prontuario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcricao, especialidade: document.getElementById("especialidade").value }),
    });
    toast("Prontuário gerado.");
    viewConsulta(c.id);
  } catch (e) {
    container.innerHTML = "";
    toast(e.message, true);
  }
}

function copiarProntuario(paciente) {
  const pront = coletarProntuario();
  if (!pront) return toast("Nenhum prontuário para copiar.", true);
  let texto = paciente ? `Paciente: ${paciente}\n\n` : "";
  texto += CAMPOS.map((f) => {
    const v = pront[f.chave];
    const corpo = f.lista ? (v.length ? v.map((x) => "- " + x).join("\n") : "—") : v || "—";
    return `${f.rotulo.toUpperCase()}\n${corpo}`;
  }).join("\n\n");
  navigator.clipboard.writeText(texto).then(
    () => toast("Prontuário copiado."),
    () => toast("Não foi possível copiar.", true)
  );
}

/* ---------------- gravação de áudio ---------------- */
let mediaRecorder = null;
let chunks = [];
let stream = null;
let timerInt = null;
let inicioGravacao = 0;
let gravandoConsultaId = null;

function atualizarTimer() {
  const seg = (Date.now() - inicioGravacao) / 1000;
  const el = document.getElementById("rec-timer");
  if (el) el.textContent = fmtDuracao(seg);
}

async function alternarGravacao(id) {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    pararGravacao();
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    return toast("Não foi possível acessar o microfone. Verifique a permissão.", true);
  }
  gravandoConsultaId = id;
  chunks = [];
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
  mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  mediaRecorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
  mediaRecorder.onstop = enviarAudio;
  mediaRecorder.start();

  inicioGravacao = Date.now();
  timerInt = setInterval(atualizarTimer, 250);

  const btn = document.getElementById("rec-btn");
  const ico = document.getElementById("rec-ico");
  if (btn) btn.classList.add("is-recording");
  if (ico) {
    ico.querySelector("rect").style.display = "";
    ico.querySelectorAll(".mic").forEach((n) => (n.style.display = "none"));
  }
  const hint = document.getElementById("rec-hint");
  if (hint) hint.textContent = "Gravando… clique novamente para parar e transcrever.";
}

function pararGravacao() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
}

function pararGravacaoSilencioso() {
  // usado ao trocar de tela: encerra streams sem enviar
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  if (mediaRecorder) mediaRecorder.onstop = null;
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  if (stream) stream.getTracks().forEach((t) => t.stop());
  mediaRecorder = null; stream = null; chunks = [];
}

async function enviarAudio() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  const btn = document.getElementById("rec-btn");
  if (btn) btn.classList.remove("is-recording");
  const ico = document.getElementById("rec-ico");
  if (ico) { ico.querySelector("rect").style.display = "none"; ico.querySelectorAll(".mic").forEach((n) => (n.style.display = "")); }

  if (!chunks.length) return;
  const blob = new Blob(chunks, { type: "audio/webm" });
  const hint = document.getElementById("rec-hint");
  if (hint) hint.innerHTML = `<span class="spinner" style="height:13px;width:13px"></span> Transcrevendo o áudio localmente…`;

  const fd = new FormData();
  fd.append("audio", blob, "consulta.webm");
  try {
    const c = await api(`/api/consultas/${gravandoConsultaId}/transcrever`, { method: "POST", body: fd });
    const ta = document.getElementById("transcricao");
    if (ta) ta.value = c.transcricao;
    const tm = document.getElementById("rec-timer");
    if (tm) tm.textContent = fmtDuracao(c.duracao_seg);
    if (hint) hint.textContent = "Transcrição concluída. Revise o texto e gere o prontuário.";
    toast("Áudio transcrito.");
  } catch (e) {
    if (hint) hint.textContent = "Falha na transcrição.";
    toast(e.message, true);
  }
}

/* ---------------- configurações ---------------- */
async function viewConfig() {
  let cfg = {};
  try {
    cfg = await api("/api/config");
  } catch (e) {
    toast(e.message, true);
  }

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  const modelos = ["claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"];
  const whispers = ["tiny", "base", "small", "medium", "large-v3"];
  overlay.innerHTML = `
    <div class="modal">
      <h2>Configurações</h2>
      <div class="subtle">Os dados ficam apenas nesta máquina.</div>

      <label class="field">
        <span class="field__label">Chave da API da Anthropic</span>
        <input type="password" id="cfg-key" placeholder="${cfg.api_key_configurada ? "•••••••••• (configurada)" : "sk-ant-..."}" ${cfg.api_key_via_ambiente ? "disabled" : ""} />
      </label>
      <div class="hint">${
        cfg.api_key_via_ambiente
          ? "Definida pela variável de ambiente ANTHROPIC_API_KEY."
          : "Usada para gerar o prontuário (Claude). Fica salva em config.json nesta máquina."
      }</div>

      <label class="field">
        <span class="field__label">Modelo (Claude)</span>
        <select id="cfg-modelo">${modelos.map((m) => `<option ${m === cfg.claude_model ? "selected" : ""}>${m}</option>`).join("")}</select>
      </label>

      <label class="field">
        <span class="field__label">Modelo de transcrição (Whisper)</span>
        <select id="cfg-whisper">${whispers.map((m) => `<option ${m === cfg.whisper_model ? "selected" : ""}>${m}</option>`).join("")}</select>
      </label>
      <div class="hint">Maior = mais preciso, porém mais lento. “base” é um bom começo. O modelo é baixado na primeira transcrição.</div>

      <div class="actions">
        <div class="spacer"></div>
        <button class="btn btn--ghost btn--sm" id="cfg-cancelar">Cancelar</button>
        <button class="btn btn--primary btn--sm" id="cfg-salvar">Salvar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const fechar = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fechar(); });
  overlay.querySelector("#cfg-cancelar").addEventListener("click", fechar);
  overlay.querySelector("#cfg-salvar").addEventListener("click", async () => {
    const corpo = {
      claude_model: overlay.querySelector("#cfg-modelo").value,
      whisper_model: overlay.querySelector("#cfg-whisper").value,
    };
    const key = overlay.querySelector("#cfg-key").value.trim();
    if (key) corpo.anthropic_api_key = key;
    try {
      await api("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      toast("Configurações salvas.");
      fechar();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

/* ---------------- boas-vindas (1ª execução) ---------------- */
function viewOnboarding() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="modal">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <span class="brand__mark" style="height:34px;width:34px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="height:18px;width:18px"><path d="M6 20.5V16" stroke-width="1.6"></path><path d="M9 20.5V11" stroke-width="1.6"></path><path d="M12 20.5V4.5" stroke-width="1.6"></path><path d="M15 20.5V11" stroke-width="1.6"></path><path d="M18 20.5V16" stroke-width="1.6"></path><path d="M8.5 14.5H15.5" stroke-width="1.4"></path></svg>
        </span>
        <h2 style="margin:0">Bem-vindo ao Aiora<span class="brand__accent">Flow</span></h2>
      </div>
      <div class="subtle" style="margin-bottom:18px">Para gerar prontuários, informe sua chave da API da Anthropic. Ela fica salva apenas nesta máquina e é usada só nessa etapa — gravar e transcrever funciona sem ela.</div>

      <label class="field">
        <span class="field__label">Chave da API da Anthropic</span>
        <input type="password" id="ob-key" placeholder="sk-ant-..." autofocus />
      </label>
      <div class="hint">Você encontra ou cria a chave em console.anthropic.com › API Keys. Pode alterá-la depois em Configurações.</div>

      <div class="actions">
        <button class="btn btn--ghost btn--sm" id="ob-depois">Configurar depois</button>
        <div class="spacer"></div>
        <button class="btn btn--primary btn--sm" id="ob-salvar">Salvar e começar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const entrar = () => { overlay.remove(); viewLista(); };
  overlay.querySelector("#ob-depois").addEventListener("click", entrar);
  overlay.querySelector("#ob-salvar").addEventListener("click", async () => {
    const key = overlay.querySelector("#ob-key").value.trim();
    if (!key) return toast("Cole a chave ou clique em “Configurar depois”.", true);
    try {
      await api("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anthropic_api_key: key }) });
      toast("Chave salva. Tudo pronto!");
      entrar();
    } catch (e) {
      toast(e.message, true);
    }
  });
  overlay.querySelector("#ob-key").addEventListener("keydown", (e) => {
    if (e.key === "Enter") overlay.querySelector("#ob-salvar").click();
  });
}

/* ---------------- init ---------------- */
document.getElementById("btn-config").addEventListener("click", viewConfig);

(async function init() {
  let cfg = {};
  try { cfg = await api("/api/config"); } catch (e) { /* mostra a lista mesmo assim */ }
  if (cfg && cfg.api_key_configurada) {
    viewLista();
  } else {
    viewLista();       // renderiza o fundo
    viewOnboarding();  // e pede a chave por cima
  }
})();
