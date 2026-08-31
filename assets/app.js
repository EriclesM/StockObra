import { createApi, isDemoMode } from "./api.js";

const api = createApi();
const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const state = {
  session: null,
  profile: null,
  view: "dashboard",
  authMode: "login",
  cache: { products: [], clients: [], works: [], movements: [] },
  reportFilters: { workId: "", start: "", end: "" }
};

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  box: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<path d="M3 21h18"/><path d="M6 21V7l6-4 6 4v14"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 13h1"/><path d="M14 13h1"/><path d="M10 21v-4h4v4"/>',
  arrows: '<path d="M7 7h11l-3-3"/><path d="m18 7-3 3"/><path d="M17 17H6l3 3"/><path d="m6 17 3-3"/>',
  report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 15H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  arrowIn: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  arrowOut: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  money: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
  activity: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
};

const icon = (name, label = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label ? `aria-label="${label}"` : 'aria-hidden="true"'}>${iconPaths[name] || ""}</svg>`;
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = value => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const shortDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const today = () => new Date().toISOString().slice(0, 10);
const initials = name => (name || "U").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function toast(message, type = "success", title = type === "error" ? "Não foi possível" : "Tudo certo") {
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.innerHTML = `${icon(type === "error" ? "warning" : "check")}<div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
  toastRegion.append(element);
  setTimeout(() => element.remove(), 4300);
}

function readableError(error) {
  const message = error?.message || "Ocorreu um erro inesperado.";
  if (message.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("duplicate key")) return "Já existe um cadastro com esses dados.";
  if (message.includes("violates foreign key")) return "Este registro possui vínculos e não pode ser excluído.";
  if (message.includes("Estoque insuficiente")) return message;
  return message;
}

function setButtonLoading(button, loading, text = "Salvando...") {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.original || button.innerHTML;
  }
}

function renderAuth() {
  const signup = state.authMode === "signup";
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-form-wrap">
        <form class="auth-form" id="auth-form">
          <div class="auth-brand"><div class="brand-mark">OS</div><strong>ObraStock</strong></div>
          <h1>${signup ? "Crie seu acesso" : "Bem-vindo de volta"}</h1>
          <p>${signup ? "Cadastre-se para começar a organizar produtos, obras e movimentações." : "Entre para acessar o controle de estoque da construtora."}</p>
          ${signup ? `<div class="field"><label class="required" for="full-name">Nome completo</label><input id="full-name" name="fullName" autocomplete="name" required placeholder="Ex.: Maria da Silva" /></div>` : ""}
          <div class="field"><label class="required" for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required placeholder="voce@empresa.com" /></div>
          <div class="field"><label class="required" for="password">Senha</label><input id="password" name="password" type="password" minlength="6" autocomplete="${signup ? "new-password" : "current-password"}" required placeholder="Mínimo de 6 caracteres" /></div>
          <div class="auth-actions"><button class="btn btn-primary" type="submit">${signup ? "Criar conta" : "Entrar no sistema"}</button></div>
          <div class="auth-switch">${signup ? "Já possui acesso?" : "Ainda não possui acesso?"} <button type="button" id="auth-switch">${signup ? "Fazer login" : "Criar conta"}</button></div>
          ${isDemoMode() ? `<div class="demo-hint"><strong>Modo demonstração</strong><br>E-mail: admin@obraestoque.com<br>Senha: 123456</div>` : ""}
        </form>
      </section>
      <aside class="auth-visual" aria-label="Apresentação do sistema">
        <div class="visual-content">
          <span class="visual-eyebrow">Estoque sob controle</span>
          <h2>Da prateleira até a obra.</h2>
          <p>Registre cada entrada e saída, saiba quem movimentou o estoque e acompanhe os custos de cada obra em um só lugar.</p>
          <div class="visual-stats"><div><strong>100%</strong><span>responsivo</span></div><div><strong>R$ 0</strong><span>para começar</span></div><div><strong>24h</strong><span>acesso pela nuvem</span></div></div>
        </div>
      </aside>
    </main>`;

  document.querySelector("#auth-switch").addEventListener("click", () => {
    state.authMode = signup ? "login" : "signup";
    renderAuth();
  });
  document.querySelector("#auth-form").addEventListener("submit", handleAuth);
}

async function handleAuth(event) {
  event.preventDefault();
  const button = event.submitter;
  const form = new FormData(event.currentTarget);
  setButtonLoading(button, true, state.authMode === "signup" ? "Criando conta..." : "Entrando...");
  try {
    if (state.authMode === "signup") {
      const result = await api.signUp({ fullName: form.get("fullName").trim(), email: form.get("email").trim(), password: form.get("password") });
      if (!result.session && !isDemoMode()) {
        state.authMode = "login";
        renderAuth();
        toast("Confira seu e-mail para confirmar o cadastro e depois faça login.");
      }
    } else {
      await api.signIn(form.get("email").trim(), form.get("password"));
    }
  } catch (error) {
    toast(readableError(error), "error");
  } finally {
    setButtonLoading(button, false);
  }
}

const navItems = [
  ["dashboard", "dashboard", "Visão geral"],
  ["products", "box", "Produtos"],
  ["clients", "users", "Clientes"],
  ["works", "building", "Obras"],
  ["movements", "arrows", "Movimentações"],
  ["reports", "report", "Relatórios"]
];

const viewTitles = Object.fromEntries(navItems.map(([key, _icon, title]) => [key, title]));

function renderShell() {
  const name = state.profile?.full_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.email || "Usuário";
  const email = state.profile?.email || state.session?.user?.email || "";
  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replaceAll(".", "");
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand"><div class="brand-mark">OS</div><div class="brand-copy"><strong>ObraStock</strong><span>GESTÃO DE ESTOQUE</span></div></div>
        <nav class="sidebar-nav" aria-label="Menu principal">
          <span class="nav-label">Gestão</span>
          ${navItems.map(([key, iconName, label]) => `<button class="nav-item ${state.view === key ? "active" : ""}" data-view="${key}">${icon(iconName)}<span>${label}</span></button>`).join("")}
        </nav>
        <div class="sidebar-bottom">
          ${isDemoMode() ? `<button class="nav-item" id="reset-demo">${icon("reset")}<span>Reiniciar demonstração</span></button>` : ""}
          <button class="nav-item" id="logout">${icon("logout")}<span>Sair</span></button>
          <div class="user-chip"><div class="avatar">${escapeHtml(initials(name))}</div><div class="user-meta"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(email)}</span></div></div>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <main class="main">
        <header class="topbar"><button class="mobile-menu" id="mobile-menu" aria-label="Abrir menu">${icon("menu")}</button><h1 id="topbar-title">${viewTitles[state.view]}</h1><span class="topbar-date">${dateLabel}</span></header>
        <div class="content" id="content"></div>
      </main>
    </div>`;

  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
  document.querySelector("#logout").addEventListener("click", () => api.signOut().catch(error => toast(readableError(error), "error")));
  document.querySelector("#mobile-menu").addEventListener("click", toggleSidebar);
  document.querySelector("#sidebar-overlay").addEventListener("click", toggleSidebar);
  document.querySelector("#reset-demo")?.addEventListener("click", () => confirmAction("Reiniciar demonstração?", "Todos os dados alterados neste navegador serão substituídos pelos dados iniciais.", async () => {
    await api.resetDemo();
  }));
  renderView();
}

function toggleSidebar() {
  document.querySelector("#sidebar")?.classList.toggle("open");
  document.querySelector("#sidebar-overlay")?.classList.toggle("show");
}

function navigate(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  document.querySelector("#topbar-title").textContent = viewTitles[view];
  document.querySelector("#sidebar")?.classList.remove("open");
  document.querySelector("#sidebar-overlay")?.classList.remove("show");
  renderView();
}

function loading() {
  document.querySelector("#content").innerHTML = '<div class="loading"><div><div class="spinner"></div>Carregando informações...</div></div>';
}

async function renderView() {
  loading();
  try {
    const views = { dashboard: renderDashboard, products: renderProducts, clients: renderClients, works: renderWorks, movements: renderMovements, reports: renderReports };
    await views[state.view]();
  } catch (error) {
    document.querySelector("#content").innerHTML = emptyState("warning", "Não foi possível carregar", readableError(error));
    toast(readableError(error), "error");
  }
}

function emptyState(iconName, title, description) {
  return `<div class="empty-state"><div class="empty-icon">${icon(iconName)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>`;
}

async function refreshCache(tables = ["products", "clients", "works", "movements"], options = {}) {
  const results = await Promise.all(tables.map(table => api.list(table, options[table])));
  tables.forEach((table, index) => { state.cache[table] = results[index]; });
}

async function renderDashboard() {
  await refreshCache();
  const { products, works, movements } = state.cache;
  const low = products.filter(item => Number(item.current_stock) <= Number(item.minimum_stock));
  const month = today().slice(0, 7);
  const monthMovements = movements.filter(item => item.movement_date.startsWith(month));
  const inventoryValue = products.reduce((sum, item) => sum + Number(item.current_stock) * Number(item.sale_price), 0);
  const recent = movements.slice(0, 6);
  const content = document.querySelector("#content");
  content.innerHTML = `
    <div class="page-head"><div><h2>Olá, ${escapeHtml((state.profile?.full_name || "usuário").split(" ")[0])}</h2><p>Acompanhe o que está acontecendo com o estoque hoje.</p></div><div class="page-actions"><button class="btn btn-accent" data-new-movement="saida">${icon("arrowOut")}Registrar saída</button></div></div>
    <section class="stats-grid" aria-label="Indicadores do estoque">
      ${statCard("box", "Produtos cadastrados", products.length, "green")}
      ${statCard("warning", "Estoque baixo", low.length, "red")}
      ${statCard("building", "Obras ativas", works.filter(item => item.status === "Em andamento").length, "blue")}
      ${statCard("money", "Valor em estoque", money(inventoryValue), "amber")}
    </section>
    <div class="section-grid">
      <section class="panel"><div class="panel-head"><h3>Movimentações recentes</h3><button class="btn btn-ghost" data-go="movements">Ver todas</button></div>${movementTable(recent, false)}</section>
      <section class="panel"><div class="panel-head"><h3>Ações rápidas</h3><span class="badge neutral">${monthMovements.length} no mês</span></div><div class="panel-body"><div class="quick-actions"><button class="quick-action" data-new-movement="entrada">${icon("arrowIn")}<span>Nova entrada</span></button><button class="quick-action" data-new-movement="saida">${icon("arrowOut")}<span>Nova saída</span></button><button class="quick-action" data-new="product">${icon("box")}<span>Novo produto</span></button><button class="quick-action" data-new="work">${icon("building")}<span>Nova obra</span></button></div></div></section>
    </div>`;
  bindGlobalActions();
}

function statCard(iconName, label, value, tone) {
  return `<article class="stat-card"><div class="stat-icon ${tone}">${icon(iconName)}</div><div class="stat-value number">${escapeHtml(value)}</div><div class="stat-label">${escapeHtml(label)}</div><span class="trend">Atualizado</span></article>`;
}

async function renderProducts() {
  await refreshCache(["products"]);
  const rows = state.cache.products;
  document.querySelector("#content").innerHTML = `
    ${pageHead("Produtos", "Cadastre os itens e acompanhe o saldo disponível.", `<button class="btn btn-primary" data-new="product">${icon("plus")}Novo produto</button>`)}
    <div class="toolbar"><div class="search-box">${icon("search")}<input id="table-search" placeholder="Buscar por nome ou código..." /></div><span class="badge neutral">${rows.length} itens</span></div>
    <section class="panel" id="products-panel">${productTable(rows)}</section>`;
  bindGlobalActions();
  bindSearch("products", rows, productTable);
}

function productTable(rows) {
  if (!rows.length) return emptyState("box", "Nenhum produto cadastrado", "Cadastre o primeiro produto para começar a controlar o estoque.");
  return `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Unidade</th><th>Estoque</th><th>Preço de saída</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(item => {
    const low = Number(item.current_stock) <= Number(item.minimum_stock);
    const percent = Math.min(100, Math.max(8, Number(item.current_stock) / Math.max(Number(item.minimum_stock) * 2, 1) * 100));
    return `<tr><td><div class="stock-name"><span class="stock-dot ${low ? "low" : ""}"></span><div><span class="cell-main">${escapeHtml(item.name)}</span><span class="cell-sub">${escapeHtml(item.sku || "Sem código")}</span></div></div></td><td>${escapeHtml(item.unit)}</td><td><span class="cell-main number">${number(item.current_stock)} ${escapeHtml(item.unit)}</span><span class="stock-meter"><span class="${low ? "low" : ""}" style="width:${percent}%"></span></span></td><td class="number">${money(item.sale_price)}</td><td><span class="badge ${low ? "danger" : "success"}">${low ? "Estoque baixo" : "Disponível"}</span></td><td><div class="table-actions"><button class="btn-icon" data-edit="product" data-id="${item.id}" aria-label="Editar">${icon("edit")}</button><button class="btn-icon danger" data-delete="products" data-id="${item.id}" data-name="${escapeHtml(item.name)}" aria-label="Excluir">${icon("trash")}</button></div></td></tr>`;
  }).join("")}</tbody></table></div>`;
}

async function renderClients() {
  await refreshCache(["clients", "works"]);
  const rows = state.cache.clients;
  document.querySelector("#content").innerHTML = `
    ${pageHead("Clientes", "Organize os responsáveis e contratantes das obras.", `<button class="btn btn-primary" data-new="client">${icon("plus")}Novo cliente</button>`)}
    <div class="toolbar"><div class="search-box">${icon("search")}<input id="table-search" placeholder="Buscar cliente..." /></div><span class="badge neutral">${rows.length} clientes</span></div>
    <section class="panel" id="clients-panel">${clientTable(rows)}</section>`;
  bindGlobalActions();
  bindSearch("clients", rows, clientTable);
}

function clientTable(rows) {
  if (!rows.length) return emptyState("users", "Nenhum cliente cadastrado", "Adicione os clientes vinculados às obras da construtora.");
  return `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cadastro</th><th>Obras vinculadas</th><th></th></tr></thead><tbody>${rows.map(item => `<tr><td><span class="cell-main">${escapeHtml(item.name)}</span></td><td>${new Date(item.created_at).toLocaleDateString("pt-BR")}</td><td>${state.cache.works.filter(work => work.client_id === item.id).length || "—"}</td><td><div class="table-actions"><button class="btn-icon" data-edit="client" data-id="${item.id}" aria-label="Editar">${icon("edit")}</button><button class="btn-icon danger" data-delete="clients" data-id="${item.id}" data-name="${escapeHtml(item.name)}" aria-label="Excluir">${icon("trash")}</button></div></td></tr>`).join("")}</tbody></table></div>`;
}

async function renderWorks() {
  await refreshCache(["works", "clients"]);
  const rows = state.cache.works;
  document.querySelector("#content").innerHTML = `
    ${pageHead("Obras", "Centralize endereços, clientes e andamento dos projetos.", `<button class="btn btn-primary" data-new="work">${icon("plus")}Nova obra</button>`)}
    <div class="toolbar"><div class="search-box">${icon("search")}<input id="table-search" placeholder="Buscar obra ou endereço..." /></div><span class="badge neutral">${rows.length} obras</span></div>
    <section class="panel" id="works-panel">${workTable(rows)}</section>`;
  bindGlobalActions();
  bindSearch("works", rows, workTable);
}

function workTable(rows) {
  if (!rows.length) return emptyState("building", "Nenhuma obra cadastrada", "Adicione uma obra para relacionar as saídas de materiais.");
  const statusTone = { "Em andamento": "success", "Planejada": "warning", "Concluída": "neutral" };
  return `<div class="table-wrap"><table><thead><tr><th>Obra</th><th>Cliente</th><th>Endereço</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(item => `<tr><td><span class="cell-main">${escapeHtml(item.name)}</span></td><td>${escapeHtml(item.clients?.name || "Não informado")}</td><td>${escapeHtml(item.address)}</td><td><span class="badge ${statusTone[item.status] || "neutral"}">${escapeHtml(item.status)}</span></td><td><div class="table-actions"><button class="btn-icon" data-edit="work" data-id="${item.id}" aria-label="Editar">${icon("edit")}</button><button class="btn-icon danger" data-delete="works" data-id="${item.id}" data-name="${escapeHtml(item.name)}" aria-label="Excluir">${icon("trash")}</button></div></td></tr>`).join("")}</tbody></table></div>`;
}

async function renderMovements() {
  await refreshCache(["movements", "products", "works"]);
  const rows = state.cache.movements;
  document.querySelector("#content").innerHTML = `
    ${pageHead("Movimentações", "Histórico completo e rastreável de entradas e saídas.", `<button class="btn btn-ghost" data-new-movement="entrada">${icon("arrowIn")}Entrada</button><button class="btn btn-primary" data-new-movement="saida">${icon("arrowOut")}Saída</button>`)}
    <div class="toolbar"><div class="search-box">${icon("search")}<input id="table-search" placeholder="Buscar produto, obra ou fornecedor..." /></div><span class="badge neutral">${rows.length} registros</span></div>
    <section class="panel" id="movements-panel">${movementTable(rows, true)}</section>`;
  bindGlobalActions();
  bindSearch("movements", rows, rowsFiltered => movementTable(rowsFiltered, true));
}

function movementTable(rows, full = true) {
  if (!rows.length) return emptyState("arrows", "Nenhuma movimentação encontrada", "Registre uma entrada ou saída para visualizar o histórico.");
  return `<div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Produto</th>${full ? "<th>Origem / destino</th>" : ""}<th>Quantidade</th><th>Valor total</th><th>Data</th>${full ? "<th>Responsável</th>" : ""}</tr></thead><tbody>${rows.map(item => `<tr><td><span class="badge ${item.type === "entrada" ? "entry" : "exit"}">${item.type === "entrada" ? "Entrada" : "Saída"}</span></td><td><span class="cell-main">${escapeHtml(item.products?.name || "Produto")}</span>${full ? `<span class="cell-sub">${money(item.unit_value)} / ${escapeHtml(item.products?.unit || "un")}</span>` : ""}</td>${full ? `<td><span class="cell-main">${escapeHtml(item.type === "entrada" ? (item.supplier || "Fornecedor não informado") : (item.works?.name || "Sem obra"))}</span><span class="cell-sub">${escapeHtml(item.notes || "Sem observação")}</span></td>` : ""}<td class="number">${number(item.quantity)} ${escapeHtml(item.products?.unit || "")}</td><td class="number">${money(item.total_value ?? Number(item.quantity) * Number(item.unit_value))}</td><td>${shortDate(item.movement_date)}</td>${full ? `<td>${escapeHtml(item.profiles?.full_name || "Usuário")}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}

async function renderReports() {
  await refreshCache(["movements", "works"], { works: { includeInactive: true } });
  if (!state.cache.works.some(item => item.id === state.reportFilters.workId)) {
    state.reportFilters.workId = state.cache.works[0]?.id || "";
  }
  drawReport();
}

function drawReport() {
  const { workId, start, end } = state.reportFilters;
  const work = state.cache.works.find(item => item.id === workId);
  const rows = state.cache.movements.filter(item => (!workId || item.work_id === workId) && (!start || item.movement_date >= start) && (!end || item.movement_date <= end));
  const entries = rows.filter(item => item.type === "entrada").reduce((sum, item) => sum + Number(item.total_value ?? item.quantity * item.unit_value), 0);
  const exits = rows.filter(item => item.type === "saida").reduce((sum, item) => sum + Number(item.total_value ?? item.quantity * item.unit_value), 0);
  document.querySelector("#content").innerHTML = `
    ${pageHead("Relatório por obra", "Filtre o período, imprima ou exporte as movimentações em CSV.", `<button class="btn btn-ghost" id="export-csv">${icon("download")}Exportar CSV</button><button class="btn btn-primary" id="print-report">${icon("print")}Imprimir</button>`)}
    <section class="panel filter-panel"><div class="panel-body"><div class="filter-row">
      <div class="field"><label for="report-work">Obra</label><select id="report-work">${state.cache.works.map(item => `<option value="${item.id}" ${item.id === workId ? "selected" : ""}>${escapeHtml(item.name)}${item.active === false ? " (arquivada)" : ""}</option>`).join("")}</select></div>
      <div class="field"><label for="report-start">Data inicial</label><input id="report-start" type="date" value="${start}" /></div>
      <div class="field"><label for="report-end">Data final</label><input id="report-end" type="date" value="${end}" /></div>
    </div></div></section>
    <section class="panel" style="margin-top:20px">
      <div class="report-header"><div class="report-title-row"><div><h3>${escapeHtml(work?.name || "Selecione uma obra")}</h3><p>${escapeHtml(work?.address || "Nenhum endereço informado")}</p></div><span class="badge neutral">${rows.length} movimentações</span></div>
      <div class="report-totals"><div class="report-total"><span>Total de entradas</span><strong>${money(entries)}</strong></div><div class="report-total"><span>Total de saídas</span><strong>${money(exits)}</strong></div><div class="report-total balance"><span>Saldo financeiro</span><strong>${money(entries - exits)}</strong></div></div></div>
      ${movementTable(rows, true)}
    </section>`;
  ["report-work", "report-start", "report-end"].forEach(id => document.querySelector(`#${id}`).addEventListener("change", event => {
    const map = { "report-work": "workId", "report-start": "start", "report-end": "end" };
    state.reportFilters[map[id]] = event.target.value;
    drawReport();
  }));
  document.querySelector("#print-report").addEventListener("click", () => window.print());
  document.querySelector("#export-csv").addEventListener("click", () => exportCsv(rows, work));
}

function pageHead(title, description, actions = "") {
  return `<div class="page-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
}

function bindSearch(entity, rows, renderer) {
  const input = document.querySelector("#table-search");
  input?.addEventListener("input", () => {
    const query = input.value.trim().toLocaleLowerCase("pt-BR");
    const filtered = rows.filter(item => JSON.stringify(item).toLocaleLowerCase("pt-BR").includes(query));
    document.querySelector(`#${entity}-panel`).innerHTML = renderer(filtered);
    bindGlobalActions();
  });
}

function bindGlobalActions() {
  document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
  document.querySelectorAll("[data-new-movement]").forEach(button => button.addEventListener("click", () => openMovementModal(button.dataset.newMovement)));
  document.querySelectorAll("[data-new]").forEach(button => button.addEventListener("click", () => openEntityModal(button.dataset.new)));
  document.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => openEntityModal(button.dataset.edit, button.dataset.id)));
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => confirmDelete(button.dataset.delete, button.dataset.id, button.dataset.name)));
}

function showModal(content, size = "") {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">${content}</div>`;
  document.body.append(backdrop);
  backdrop.addEventListener("mousedown", event => { if (event.target === backdrop) backdrop.remove(); });
  backdrop.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => backdrop.remove()));
  document.addEventListener("keydown", function esc(event) {
    if (event.key === "Escape") { backdrop.remove(); document.removeEventListener("keydown", esc); }
  });
  return backdrop;
}

function modalFrame(title, subtitle, body, saveLabel = "Salvar") {
  return `<div class="modal-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button class="btn-icon" type="button" data-close aria-label="Fechar">${icon("close")}</button></div><form id="modal-form"><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${escapeHtml(saveLabel)}</button></div></form>`;
}

async function openEntityModal(entity, id = null) {
  const table = { product: "products", client: "clients", work: "works" }[entity];
  if (!table) return;
  if (entity === "work" && !state.cache.clients.length) await refreshCache(["clients"]);
  const item = id ? state.cache[table].find(row => row.id === id) : null;
  const availableClients = [...state.cache.clients];
  if (entity === "work" && item?.client_id && !availableClients.some(client => client.id === item.client_id)) {
    availableClients.push({ id: item.client_id, name: `${item.clients?.name || "Cliente"} (arquivado)` });
  }
  const titles = { product: "produto", client: "cliente", work: "obra" };
  let body = "";
  if (entity === "product") body = `
    <div class="form-grid">
      <div class="field span-2"><label class="required" for="name">Nome do produto</label><input id="name" name="name" required value="${escapeHtml(item?.name || "")}" placeholder="Ex.: Cimento CP II 50 kg" /></div>
      <div class="field"><label for="sku">Código / SKU</label><input id="sku" name="sku" value="${escapeHtml(item?.sku || "")}" placeholder="Ex.: CIM-001" /></div>
      <div class="field"><label class="required" for="unit">Unidade</label><select id="unit" name="unit" required>${["un", "kg", "m", "m²", "m³", "l", "saco", "lata", "caixa"].map(unit => `<option ${item?.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></div>
      <div class="field"><label class="required" for="minimum_stock">Estoque mínimo</label><input id="minimum_stock" name="minimum_stock" type="number" min="0" step="0.001" required value="${item?.minimum_stock ?? 0}" /></div>
      <div class="field"><label class="required" for="sale_price">Preço de saída</label><input id="sale_price" name="sale_price" type="number" min="0" step="0.01" required value="${item?.sale_price ?? ""}" placeholder="0,00" /></div>
    </div>`;
  if (entity === "client") body = `<div class="field"><label class="required" for="name">Nome do cliente</label><input id="name" name="name" required value="${escapeHtml(item?.name || "")}" placeholder="Pessoa ou empresa" /></div>`;
  if (entity === "work") body = `
    <div class="form-grid">
      <div class="field span-2"><label class="required" for="name">Nome da obra</label><input id="name" name="name" required value="${escapeHtml(item?.name || "")}" placeholder="Ex.: Residencial Jardim" /></div>
      <div class="field span-2"><label for="client_id">Cliente</label><select id="client_id" name="client_id"><option value="">Não informado</option>${availableClients.map(client => `<option value="${client.id}" ${item?.client_id === client.id ? "selected" : ""}>${escapeHtml(client.name)}</option>`).join("")}</select></div>
      <div class="field span-2"><label class="required" for="address">Endereço</label><input id="address" name="address" required value="${escapeHtml(item?.address || "")}" placeholder="Rua, número, bairro e cidade" /></div>
      <div class="field span-2"><label class="required" for="status">Situação</label><select id="status" name="status">${["Planejada", "Em andamento", "Concluída"].map(status => `<option ${item?.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></div>
    </div>`;
  const modal = showModal(modalFrame(`${id ? "Editar" : "Novo"} ${titles[entity]}`, "Preencha os dados abaixo.", body, id ? "Salvar alterações" : "Cadastrar"));
  modal.querySelector("#modal-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    if (entity === "product") {
      form.sku = form.sku.trim() || null;
      form.minimum_stock = Number(form.minimum_stock);
      form.sale_price = Number(form.sale_price);
      form.active = true;
    }
    if (entity === "work") form.client_id = form.client_id || null;
    setButtonLoading(button, true);
    try {
      if (id) await api.update(table, id, form); else await api.create(table, form);
      modal.remove();
      toast(`${titles[entity][0].toUpperCase()}${titles[entity].slice(1)} ${id ? "atualizado(a)" : "cadastrado(a)"} com sucesso.`);
      await renderView();
    } catch (error) {
      toast(readableError(error), "error");
      setButtonLoading(button, false);
    }
  });
}

async function openMovementModal(initialType = "saida") {
  if (!state.cache.products.length || !state.cache.works.length) await refreshCache(["products", "works"]);
  if (!state.cache.products.length) {
    toast("Cadastre pelo menos um produto antes de movimentar o estoque.", "error");
    return;
  }
  const body = `
    <div class="form-grid">
      <div class="span-2 radio-cards">
        <div class="radio-card"><input id="type-entry" name="type" value="entrada" type="radio" ${initialType === "entrada" ? "checked" : ""}><label for="type-entry">${icon("arrowIn")}<div><strong>Entrada</strong><span>Adicionar ao estoque</span></div></label></div>
        <div class="radio-card"><input id="type-exit" name="type" value="saida" type="radio" ${initialType === "saida" ? "checked" : ""}><label for="type-exit">${icon("arrowOut")}<div><strong>Saída</strong><span>Retirar do estoque</span></div></label></div>
      </div>
      <div class="field span-2"><label class="required" for="product_id">Produto</label><select id="product_id" name="product_id" required>${state.cache.products.map(item => `<option value="${item.id}" data-stock="${item.current_stock}" data-unit="${escapeHtml(item.unit)}" data-price="${item.sale_price}">${escapeHtml(item.name)} — saldo ${number(item.current_stock)} ${escapeHtml(item.unit)}</option>`).join("")}</select><small id="stock-help"></small></div>
      <div class="field"><label class="required" for="quantity">Quantidade</label><input id="quantity" name="quantity" type="number" min="0.001" step="0.001" required placeholder="0" /></div>
      <div class="field"><label class="required" for="unit_value">Valor unitário</label><input id="unit_value" name="unit_value" type="number" min="0" step="0.01" required placeholder="0,00" /></div>
      <div class="field"><label class="required" for="movement_date">Data</label><input id="movement_date" name="movement_date" type="date" required value="${today()}" /></div>
      <div class="field" id="supplier-field"><label for="supplier">Fornecedor</label><input id="supplier" name="supplier" placeholder="Nome do fornecedor" /></div>
      <div class="field span-2" id="work-field"><label for="work_id">Obra de destino (opcional)</label><select id="work_id" name="work_id"><option value="">Sem obra vinculada</option>${state.cache.works.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select><small>Deixe como “Sem obra vinculada” para vendas, perdas ou uso interno.</small></div>
      <div class="field span-2"><label for="notes">Observação</label><textarea id="notes" name="notes" placeholder="Lote, finalidade ou outra informação útil"></textarea></div>
    </div>
    <div class="summary-box"><span>Valor total da movimentação</span><strong id="movement-total">R$ 0,00</strong></div>`;
  const modal = showModal(modalFrame("Nova movimentação", "A operação ficará registrada no histórico.", body, "Confirmar movimentação"));
  const form = modal.querySelector("#modal-form");
  const product = form.elements.product_id;
  const quantity = form.elements.quantity;
  const unitValue = form.elements.unit_value;
  const supplierField = modal.querySelector("#supplier-field");

  function updateMovementForm() {
    const type = form.elements.type.value;
    const option = product.selectedOptions[0];
    supplierField.querySelector("label").classList.toggle("required", type === "entrada");
    supplierField.querySelector("input").required = type === "entrada";
    modal.querySelector("#stock-help").textContent = `Disponível: ${number(option.dataset.stock)} ${option.dataset.unit}`;
    if (type === "saida" && !unitValue.value) unitValue.value = option.dataset.price;
    modal.querySelector("#movement-total").textContent = money(Number(quantity.value || 0) * Number(unitValue.value || 0));
  }
  form.querySelectorAll("input[name=type]").forEach(radio => radio.addEventListener("change", updateMovementForm));
  [product, quantity, unitValue].forEach(input => input.addEventListener("input", updateMovementForm));
  product.addEventListener("change", () => { if (form.elements.type.value === "saida") unitValue.value = product.selectedOptions[0].dataset.price; updateMovementForm(); });
  updateMovementForm();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      type: data.type,
      product_id: data.product_id,
      work_id: data.work_id || null,
      supplier: data.type === "entrada" ? data.supplier.trim() : null,
      quantity: Number(data.quantity),
      unit_value: Number(data.unit_value),
      movement_date: data.movement_date,
      notes: data.notes.trim()
    };
    setButtonLoading(button, true, "Registrando...");
    try {
      await api.create("movements", payload);
      modal.remove();
      toast(`${payload.type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso.`);
      await renderView();
    } catch (error) {
      toast(readableError(error), "error");
      setButtonLoading(button, false);
    }
  });
}

function confirmDelete(table, id, name) {
  confirmAction(`Excluir “${name}”?`, "Se possuir vínculos, o cadastro será arquivado: deixará de aparecer nas telas operacionais, mas continuará no histórico e nos relatórios.", async () => {
    const result = await api.remove(table, id);
    toast(result.archived ? "Cadastro arquivado. O histórico foi preservado." : "Cadastro excluído definitivamente.");
    await renderView();
  }, "Excluir");
}

function confirmAction(title, description, action, label = "Confirmar") {
  const modal = showModal(`<div class="modal-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><button class="btn-icon" data-close>${icon("close")}</button></div><div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="confirm-action">${escapeHtml(label)}</button></div>`, "small");
  modal.querySelector("#confirm-action").addEventListener("click", async event => {
    setButtonLoading(event.currentTarget, true, "Aguarde...");
    try {
      await action();
      modal.remove();
    } catch (error) {
      toast(readableError(error), "error");
      setButtonLoading(event.currentTarget, false);
    }
  });
}

function exportCsv(rows, work) {
  if (!rows.length) { toast("Não há movimentações para exportar.", "error"); return; }
  const header = ["Tipo", "Produto", "Obra", "Fornecedor", "Quantidade", "Unidade", "Valor unitário", "Valor total", "Data", "Responsável", "Observação"];
  const escapeCsv = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = rows.map(item => [item.type, item.products?.name, item.works?.name, item.supplier, item.quantity, item.products?.unit, item.unit_value, item.total_value ?? item.quantity * item.unit_value, item.movement_date, item.profiles?.full_name, item.notes].map(escapeCsv).join(";"));
  const blob = new Blob(["\ufeff", header.join(";"), "\n", lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-${(work?.name || "obra").toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Relatório CSV gerado.");
}

async function init() {
  try {
    state.session = await api.getSession();
    api.onAuthChange(async session => {
      state.session = session;
      if (session) {
        state.profile = await api.getProfile().catch(() => null);
        renderShell();
      } else {
        state.profile = null;
        renderAuth();
      }
    });
    if (state.session) {
      state.profile = await api.getProfile().catch(() => null);
      renderShell();
    } else {
      renderAuth();
    }
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
  } catch (error) {
    app.innerHTML = emptyState("warning", "Falha ao iniciar o sistema", readableError(error));
  }
}

init();
