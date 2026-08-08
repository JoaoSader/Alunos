
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ======================================================================
   BANCO DE DADOS (Firebase/Firestore) — mantido exatamente como estava,
   conforme pedido.
   ====================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBZwjp9B0vJ0LHtB2kIDNRhpps3T4EkD88",
  authDomain: "dojo-alunos.firebaseapp.com",
  projectId: "dojo-alunos",
  storageBucket: "dojo-alunos.firebasestorage.app",
  messagingSenderId: "1009769955949",
  appId: "1:1009769955949:web:5059c2fc8445c26e96f564",
  measurementId: "G-H9YHCMN2TY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const alunosRef = collection(db, "alunos");

/* ======================================================================
   TEMA 1 (Aula 6) — Objeto usado como "registro": cada chave (faixa)
   guarda um objeto com as propriedades bg/fg/strip. Vamos iterar sobre
   ele mais adiante com for...in.
   ====================================================================== */
const BELT_ORDER = ["Branca","Cinza","Azul","Amarela","Laranja","Verde","Roxa","Marrom","Preta"];

const BELT_COLORS = {
  "Branca":  {bg:"var(--white-belt)", fg:"#4a4a45", strip:"var(--white-belt-b)"},
  "Cinza":   {bg:"#eceded", fg:"#4a4d50", strip:"var(--gray-belt)"},
  "Azul":    {bg:"#e5edf8", fg:"var(--blue-belt)", strip:"var(--blue-belt)"},
  "Amarela": {bg:"#fbf1cf", fg:"#8a6d00", strip:"var(--yellow-belt)"},
  "Laranja": {bg:"#fbe6d5", fg:"#a1470c", strip:"var(--orange-belt)"},
  "Verde":   {bg:"#e1f0e2", fg:"var(--green-belt)", strip:"var(--green-belt)"},
  "Roxa":    {bg:"#ece2f5", fg:"var(--purple-belt)", strip:"var(--purple-belt)"},
  "Marrom":  {bg:"#e9dcd2", fg:"var(--brown-belt)", strip:"var(--brown-belt)"},
  "Preta":   {bg:"#e6e6e6", fg:"#111", strip:"var(--black-belt)"}
};

/* Estado da aplicação (Aula 5, Tema 2 — variáveis com let) */
let students = [];
let currentSort = "nome";
let searchTerm = "";

/* Referências ao DOM (Aula 6, Tema 4 — querySelector) */
const listEl     = document.querySelector("#list");
const searchEl   = document.querySelector("#search");
const overlayEl  = document.querySelector("#overlay");
const sheetEl    = document.querySelector("#sheet");
const toastEl    = document.querySelector("#toast");
const statTotal  = document.querySelector("#statTotal");



/* ======================================================================
   Função "arrow" (Aula 6, 2.4) — corpo curto, sem necessidade de return
   explícito.
   ====================================================================== */
const escapeHtml = (str) => {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
};

// Calcula a idade em anos a partir de uma data no formato AAAA-MM-DD
const calcularIdade = (dataISO) => {
  if (!dataISO) return null;
  const hoje = new Date();
  const nasc = new Date(dataISO + "T00:00:00");
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade--;
  return idade;
};

// Formata AAAA-MM-DD para exibição em DD/MM/AAAA
const formatarData = (dataISO) => {
  if (!dataISO) return "-";
  const [y, m, d] = dataISO.split("-");
  return `${d}/${m}/${y}`;
};

const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1600);
};

const closeOverlay = () => overlayEl.classList.remove("show");

const openOverlay = (html) => {
  sheetEl.innerHTML = html;
  overlayEl.classList.add("show");
};

/* ======================================================================
   Escuta o Firestore em tempo real (mantido igual ao original).
   ====================================================================== */
onSnapshot(alunosRef, (snapshot) => {
  students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
}, (err) => {
  console.error("Erro ao ler dados", err);
  toast("Não foi possível carregar os dados.");
});

/* ======================================================================
   Ordenação: função que devolve um novo array ordenado (Aula 6, 1.2 —
   arrays; usamos sort/localeCompare, conceitos de comparação vistos
   nos operadores relacionais da Aula 5).
   ====================================================================== */
function sortStudents(list){
  const arr = [...list];
  if (currentSort === "nome"){
    arr.sort((a,b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } else if (currentSort === "graduacao"){
    arr.sort((a,b) => BELT_ORDER.indexOf(b.graduacao) - BELT_ORDER.indexOf(a.graduacao)
      || a.nome.localeCompare(b.nome, "pt-BR"));
  } else if (currentSort === "idade"){
    arr.sort((a,b) => calcularIdade(b.dataNascimento) - calcularIdade(a.dataNascimento) || a.nome.localeCompare(b.nome, "pt-BR"));
  }
  return arr;
}

/* ======================================================================
   Renderização da lista. Cada aluno vira um <article class="card">,
   conforme a semântica estudada (Aula 4, 1.3): conteúdo independente
   e repetível.
   ====================================================================== */
function render(){
  let data = sortStudents(students);

  if (searchTerm.trim()){
    const q = searchTerm.trim().toLowerCase();
    data = data.filter(s => s.nome.toLowerCase().includes(q));
  }

  statTotal.textContent = students.length;


  if (data.length === 0){
    listEl.innerHTML = `<div class="empty"><b>Nenhum aluno encontrado</b>Toque no + para adicionar o primeiro aluno do dojô.</div>`;
    return;
  }

  /* Tema 5, Aula 6 — for...of para montar o HTML de cada card */
  let html = "";
  for (let s of data){
    const belt = BELT_COLORS[s.graduacao] || BELT_COLORS["Branca"];
    html += `
    <article class="card" data-id="${s.id}">
      <div class="belt-strip" style="background:${belt.strip}"></div>
      <div class="card-body">
        <div style="min-width:0;">
          <div class="card-name">${escapeHtml(s.nome)}</div>
          <div class="card-sub">Toque para ver detalhes</div>
        </div>
        <div class="card-right">
          <span class="belt-tag" style="background:${belt.bg}; color:${belt.fg}">${s.graduacao}</span>
          <span class="age-badge">${calcularIdade(s.dataNascimento)}a</span>
          <span class="chev">›</span>
        </div>
      </div>
    </article>`;
  }
  listEl.innerHTML = html;
}

/* ======================================================================
   TEMA 5 (Aula 6) — Eventos com addEventListener e delegação de
   evento: em vez de "onclick" inline, escutamos os cliques no
   contêiner da lista e descobrimos em qual card o usuário clicou.
   ====================================================================== */
listEl.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) return;
  openDetail(card.dataset.id);
});

function openDetail(id){
  const s = students.find(x => x.id === id);
  if (!s) return;
  const belt = BELT_COLORS[s.graduacao] || BELT_COLORS["Branca"];
  const idade = calcularIdade(s.dataNascimento);
  const menorDeIdade = idade !== null && idade < 18;

  openOverlay(`
    <div class="sheet-handle"></div>
    <h2>${escapeHtml(s.nome)}</h2>
    <span class="detail-belt" style="background:${belt.bg}; color:${belt.fg}">Faixa ${s.graduacao}</span>
    <div class="detail-grid">
      <div class="detail-box">
        <div class="lbl">Graduação</div>
        <div class="val">${s.graduacao}</div>
      </div>
      <div class="detail-box">
        <div class="lbl">Data de nascimento</div>
        <div class="val">${formatarData(s.dataNascimento)}</div>
      </div>
    </div>
    ${menorDeIdade ? `
    <div class="detail-grid" style="margin-top:12px;">
      <div class="detail-box">
        <div class="lbl">Responsável</div>
        <div class="val">${s.responsavelNome ? escapeHtml(s.responsavelNome) : "-"}</div>
      </div>
      <div class="detail-box">
        <div class="lbl">Telefone</div>
        <div class="val">${s.responsavelTelefone ? escapeHtml(s.responsavelTelefone) : "-"}</div>
      </div>
    </div>
    ` : ""}
    <div class="sheet-actions">
      <button class="btn-edit" data-action="editar" data-id="${s.id}">Editar</button>
      <button class="btn-del" data-action="excluir" data-id="${s.id}">Excluir</button>
    </div>
  `);
}

/* Delegação de evento dentro do próprio painel (sheet) */
sheetEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;

  if (btn.dataset.action === "editar"){
    openEdit(btn.dataset.id);
  } else if (btn.dataset.action === "excluir"){
    deleteStudent(btn.dataset.id);
  } else if (btn.dataset.action === "cancelar"){
    closeOverlay();
  }
});

overlayEl.addEventListener("click", (event) => {
  if (event.target.id === "overlay") closeOverlay();
});

function openEdit(id){
  const s = id ? students.find(x => x.id === id) : null;
  const menorDeIdade = s && calcularIdade(s.dataNascimento) < 18;

  let beltOptions = "";
  for (let b of BELT_ORDER){
    const selecionada = (s && s.graduacao === b) ? "selected" : "";
    beltOptions += `<option value="${b}" ${selecionada}>${b}</option>`;
  }

  openOverlay(`
    <div class="sheet-handle"></div>
    <h2>${s ? "Editar aluno" : "Novo aluno"}</h2>
    <form class="editform" id="studentForm">
      <div>
        <label>Nome completo</label>
        <input type="text" id="fNome" value="${s ? escapeHtml(s.nome) : ""}" required>
      </div>
      <div>
        <label>Graduação</label>
        <select id="fGraduacao">${beltOptions}</select>
      </div>
      <div>
        <label>Data de nascimento</label>
        <input type="date" id="fDataNasc" value="${s ? s.dataNascimento : ""}" required>
      </div>
      <div id="responsavelFields" style="display:${menorDeIdade ? "flex" : "none"}; flex-direction:column; gap:12px;">
        <div>
          <label>Nome do responsável</label>
          <input type="text" id="fRespNome" value="${s && s.responsavelNome ? escapeHtml(s.responsavelNome) : ""}">
        </div>
        <div>
          <label>Telefone do responsável</label>
          <input type="tel" id="fRespTelefone" placeholder="(00) 00000-0000" value="${s && s.responsavelTelefone ? escapeHtml(s.responsavelTelefone) : ""}">
        </div>
      </div>
      <div class="save-row">
        <button type="button" data-action="cancelar" class="btn-cancel">Cancelar</button>
        <button type="submit" class="btn-save">Salvar</button>
      </div>
    </form>
  `);

  const dataNascInput = document.querySelector("#fDataNasc");
  const respFieldsDiv = document.querySelector("#responsavelFields");

  const atualizarCamposResponsavel = () => {
    const idade = calcularIdade(dataNascInput.value);
    respFieldsDiv.style.display = (idade !== null && idade < 18) ? "flex" : "none";
  };

  dataNascInput.addEventListener("input", atualizarCamposResponsavel);

  const form = document.querySelector("#studentForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.querySelector("#fNome").value.trim();
    const graduacao = document.querySelector("#fGraduacao").value;
    const dataNascimento = document.querySelector("#fDataNasc").value;
    const idade = calcularIdade(dataNascimento);

    const responsavelNome = idade !== null && idade < 18
      ? document.querySelector("#fRespNome").value.trim()
      : "";
    const responsavelTelefone = idade !== null && idade < 18
      ? document.querySelector("#fRespTelefone").value.trim()
      : "";

    if (!nome || !dataNascimento) return;

    const dadosAluno = { nome, graduacao, dataNascimento, responsavelNome, responsavelTelefone };

    try{
      if (s){
        await updateDoc(doc(db, "alunos", s.id), dadosAluno);
      } else {
        await addDoc(alunosRef, dadosAluno);
      }
      closeOverlay();
      toast(s ? "Aluno atualizado" : "Aluno adicionado");
    } catch (err){
      console.error("Falha ao salvar", err);
      toast("Não foi possível salvar. Tente novamente.");
    }
  });
}

async function deleteStudent(id){
  try{
    await deleteDoc(doc(db, "alunos", id));
    closeOverlay();
    toast("Aluno removido");
  } catch (err){
    console.error("Falha ao excluir", err);
    toast("Não foi possível excluir. Tente novamente.");
  }
}

/* Botão de adicionar (fab) e barra de ordenação — addEventListener */
document.querySelector("#addBtn").addEventListener("click", () => openEdit(null));

document.querySelectorAll(".sortbtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sortbtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentSort = btn.dataset.sort;
    render();
  });
});

searchEl.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  render();
});
