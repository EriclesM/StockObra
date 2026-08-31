const STORAGE_KEY = "obrastock-demo-v1";
const SESSION_KEY = "obrastock-demo-session";

const uid = () => crypto.randomUUID();
const isoDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

function seedDemo() {
  const adminId = uid();
  const client1 = uid();
  const client2 = uid();
  const work1 = uid();
  const work2 = uid();
  const cement = uid();
  const brick = uid();
  const cable = uid();
  const paint = uid();

  return {
    users: [{ id: adminId, full_name: "Administrador", email: "admin@obraestoque.com", password: "123456" }],
    profiles: [{ id: adminId, full_name: "Administrador", email: "admin@obraestoque.com", created_at: new Date().toISOString() }],
    clients: [
      { id: client1, name: "Residencial Aurora", created_at: new Date().toISOString() },
      { id: client2, name: "Comercial São Bento", created_at: new Date().toISOString() }
    ],
    works: [
      { id: work1, client_id: client1, name: "Edifício Aurora", address: "Rua das Flores, 240 — Curitiba/PR", status: "Em andamento", created_at: new Date().toISOString() },
      { id: work2, client_id: client2, name: "Reforma Loja Centro", address: "Av. Sete de Setembro, 1510 — Curitiba/PR", status: "Planejada", created_at: new Date().toISOString() }
    ],
    products: [
      { id: cement, sku: "CIM-CP2-50", name: "Cimento CP II 50 kg", unit: "saco", minimum_stock: 20, sale_price: 42.9, current_stock: 68, active: true, created_at: new Date().toISOString() },
      { id: brick, sku: "TIJ-6F", name: "Tijolo cerâmico 6 furos", unit: "un", minimum_stock: 500, sale_price: 1.18, current_stock: 240, active: true, created_at: new Date().toISOString() },
      { id: cable, sku: "CAB-2.5-AZ", name: "Cabo flexível 2,5 mm azul", unit: "m", minimum_stock: 100, sale_price: 3.75, current_stock: 320, active: true, created_at: new Date().toISOString() },
      { id: paint, sku: "TIN-18-BR", name: "Tinta acrílica branca 18 L", unit: "lata", minimum_stock: 8, sale_price: 389, current_stock: 6, active: true, created_at: new Date().toISOString() }
    ],
    movements: [
      { id: uid(), type: "entrada", product_id: cement, work_id: null, supplier: "Materiais Paraná", quantity: 100, unit_value: 34.5, movement_date: isoDate(-12), performed_by: adminId, notes: "Compra mensal", created_at: new Date().toISOString() },
      { id: uid(), type: "saida", product_id: cement, work_id: work1, supplier: null, quantity: 32, unit_value: 42.9, movement_date: isoDate(-6), performed_by: adminId, notes: "Fundação bloco B", created_at: new Date().toISOString() },
      { id: uid(), type: "entrada", product_id: brick, work_id: null, supplier: "Cerâmica União", quantity: 1000, unit_value: 0.72, movement_date: isoDate(-10), performed_by: adminId, notes: "", created_at: new Date().toISOString() },
      { id: uid(), type: "saida", product_id: brick, work_id: work1, supplier: null, quantity: 760, unit_value: 1.18, movement_date: isoDate(-4), performed_by: adminId, notes: "Alvenaria 2º piso", created_at: new Date().toISOString() },
      { id: uid(), type: "entrada", product_id: cable, work_id: null, supplier: "Elétrica Sul", quantity: 500, unit_value: 2.45, movement_date: isoDate(-9), performed_by: adminId, notes: "", created_at: new Date().toISOString() },
      { id: uid(), type: "saida", product_id: cable, work_id: work2, supplier: null, quantity: 180, unit_value: 3.75, movement_date: isoDate(-2), performed_by: adminId, notes: "Instalação elétrica", created_at: new Date().toISOString() },
      { id: uid(), type: "entrada", product_id: paint, work_id: null, supplier: "Cores & Cia", quantity: 10, unit_value: 290, movement_date: isoDate(-8), performed_by: adminId, notes: "", created_at: new Date().toISOString() },
      { id: uid(), type: "saida", product_id: paint, work_id: work2, supplier: null, quantity: 4, unit_value: 389, movement_date: isoDate(-1), performed_by: adminId, notes: "Pintura interna", created_at: new Date().toISOString() }
    ]
  };
}

class DemoApi {
  constructor() {
    this.listeners = new Set();
    if (!localStorage.getItem(STORAGE_KEY)) this.save(seedDemo());
  }

  load() { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  sessionId() { return localStorage.getItem(SESSION_KEY); }

  async getSession() {
    const id = this.sessionId();
    if (!id) return null;
    const user = this.load().users.find(item => item.id === id);
    return user ? { user: { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } } } : null;
  }

  onAuthChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async notifyAuth() {
    const session = await this.getSession();
    this.listeners.forEach(callback => callback(session));
  }

  async signIn(email, password) {
    const user = this.load().users.find(item => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!user) throw new Error("E-mail ou senha incorretos.");
    localStorage.setItem(SESSION_KEY, user.id);
    await this.notifyAuth();
    return { user };
  }

  async signUp({ fullName, email, password }) {
    const data = this.load();
    if (data.users.some(item => item.email.toLowerCase() === email.toLowerCase())) throw new Error("Este e-mail já está cadastrado.");
    const id = uid();
    const user = { id, full_name: fullName, email, password };
    data.users.push(user);
    data.profiles.push({ id, full_name: fullName, email, created_at: new Date().toISOString() });
    this.save(data);
    localStorage.setItem(SESSION_KEY, id);
    await this.notifyAuth();
    return { user };
  }

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    await this.notifyAuth();
  }

  async getProfile() {
    return this.load().profiles.find(item => item.id === this.sessionId()) || null;
  }

  decorate(table, rows, data = this.load()) {
    if (table === "works") {
      return rows.map(row => ({ ...row, clients: data.clients.find(item => item.id === row.client_id) || null }));
    }
    if (table === "movements") {
      return rows.map(row => ({
        ...row,
        total_value: Number(row.quantity) * Number(row.unit_value),
        products: data.products.find(item => item.id === row.product_id) || null,
        works: data.works.find(item => item.id === row.work_id) || null,
        profiles: data.profiles.find(item => item.id === row.performed_by) || null
      }));
    }
    return rows;
  }

  async list(table) {
    const data = this.load();
    let rows = [...(data[table] || [])];
    if (table === "movements") rows.sort((a, b) => b.movement_date.localeCompare(a.movement_date) || b.created_at.localeCompare(a.created_at));
    else if (table === "products") rows.sort((a, b) => a.name.localeCompare(b.name));
    else rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return this.decorate(table, rows, data);
  }

  async create(table, payload) {
    const data = this.load();
    if (!data[table]) throw new Error("Cadastro não reconhecido.");
    const record = { id: uid(), ...payload, created_at: new Date().toISOString() };
    if (table === "products") record.current_stock = 0;
    if (table === "movements") {
      const product = data.products.find(item => item.id === payload.product_id);
      if (!product) throw new Error("Produto não encontrado.");
      const quantity = Number(payload.quantity);
      if (payload.type === "saida" && Number(product.current_stock) < quantity) {
        throw new Error(`Estoque insuficiente. Disponível: ${product.current_stock} ${product.unit}.`);
      }
      product.current_stock = Number(product.current_stock) + (payload.type === "entrada" ? quantity : -quantity);
      record.performed_by = this.sessionId();
    }
    data[table].push(record);
    this.save(data);
    return this.decorate(table, [record], data)[0];
  }

  async update(table, id, payload) {
    const data = this.load();
    const index = data[table].findIndex(item => item.id === id);
    if (index < 0) throw new Error("Registro não encontrado.");
    data[table][index] = { ...data[table][index], ...payload, updated_at: new Date().toISOString() };
    this.save(data);
    return this.decorate(table, [data[table][index]], data)[0];
  }

  async remove(table, id) {
    if (table === "movements") throw new Error("Movimentações não podem ser excluídas para preservar o histórico.");
    const data = this.load();
    const references = {
      products: data.movements.some(item => item.product_id === id),
      works: data.movements.some(item => item.work_id === id),
      clients: data.works.some(item => item.client_id === id)
    };
    if (references[table]) throw new Error("Este registro possui vínculos e não pode ser excluído.");
    data[table] = data[table].filter(item => item.id !== id);
    this.save(data);
  }

  async resetDemo() {
    this.save(seedDemo());
    localStorage.removeItem(SESSION_KEY);
    await this.notifyAuth();
  }
}

class SupabaseApi {
  constructor(url, key) {
    if (!window.supabase?.createClient) throw new Error("Não foi possível carregar a biblioteca do Supabase.");
    this.client = window.supabase.createClient(url, key);
  }

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  onAuthChange(callback) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  }

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp({ fullName, email, password }) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async getProfile() {
    const session = await this.getSession();
    if (!session) return null;
    const { data, error } = await this.client.from("profiles").select("*").eq("id", session.user.id).single();
    if (error) throw error;
    return data;
  }

  async list(table) {
    let select = "*";
    if (table === "works") select = "*, clients(name)";
    if (table === "movements") select = "*, products(name, unit), works(name), profiles!movements_performed_by_fkey(full_name)";
    let query = this.client.from(table).select(select);
    query = table === "movements"
      ? query.order("movement_date", { ascending: false }).order("created_at", { ascending: false })
      : query.order("name", { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async create(table, payload) {
    const { data, error } = await this.client.from(table).insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async update(table, id, payload) {
    const { data, error } = await this.client.from(table).update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(table, id) {
    if (table === "movements") throw new Error("Movimentações não podem ser excluídas para preservar o histórico.");
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw error;
  }
}

export function createApi() {
  const config = window.APP_CONFIG || {};
  const readyForCloud = !config.DEMO_MODE && config.SUPABASE_URL && config.SUPABASE_ANON_KEY;
  return readyForCloud ? new SupabaseApi(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : new DemoApi();
}

export const isDemoMode = () => {
  const config = window.APP_CONFIG || {};
  return config.DEMO_MODE || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY;
};
