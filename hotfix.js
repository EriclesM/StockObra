/* ObraStock: carregar depois do Supabase e antes de assets/app.js. */
(() => {
  'use strict';
  if (window.__obraHotfix) return;
  window.__obraHotfix = true;
  const sdk = window.supabase;
  if (!sdk?.createClient) return;
  const original = sdk.createClient;
  let userId = null;
  sdk.createClient = function (...args) {
    const client = original.apply(this, args);
    const subscribe = client.auth.onAuthStateChange.bind(client.auth);
    client.auth.onAuthStateChange = callback => {
      let previous;
      return subscribe((event, session) => {
        userId = session?.user?.id || null;
        const identity = userId || 'signed-out';
        if (identity === previous) return;
        previous = identity;
        // Return immediately, releasing the Auth lock before any API call.
        setTimeout(() => {
          Promise.resolve().then(() => callback(event, session)).catch(console.error);
        }, 0);
      });
    };
    return client;
  };

  // Scope drafts to the authenticated user and exact form title.
  const key = title => `obrastock-recovery-20260909:${userId}:${title}`;
  const read = title => { try { return JSON.parse(localStorage.getItem(key(title))); } catch { return null; } };
  const write = (title, value) => { try { localStorage.setItem(key(title), JSON.stringify(value)); return true; } catch { return false; } };
  const clear = title => { try { localStorage.removeItem(key(title)); } catch {} };
  function attach(form) {
    if (form.dataset.recovery || !userId) return;
    form.dataset.recovery = 'true';
    const modal = form.closest('.modal');
    const title = modal?.querySelector('h2')?.textContent;
    if (!title) return;
    const note = document.createElement('p');
    note.style.cssText = 'padding:0 24px;color:#40545c;font-size:14px';
    const saved = read(title);
    if (saved?.fields) {
      Object.entries(saved.fields).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (field) field.value = value;
      });
      form.querySelectorAll('input,select,textarea').forEach(field => field.dispatchEvent(new Event('input', { bubbles: true })));
      note.textContent = saved.pending
        ? 'Rascunho recuperado. O envio anterior não foi confirmado: confira o histórico antes de enviar novamente.'
        : 'Rascunho recuperado neste navegador. Confira os campos antes de salvar.';
    } else note.textContent = 'Os campos serão guardados neste navegador. Após F5, abra esta mesma tela para recuperá-los.';
    const discard = document.createElement('button');
    discard.type = 'button'; discard.className = 'btn btn-ghost'; discard.textContent = 'Descartar rascunho';
    discard.onclick = () => { clear(title); form.reset(); note.textContent = 'Rascunho descartado.'; };
    form.append(note, discard);
    let pending = Boolean(saved?.pending);
    const persist = () => {
      const fields = Object.fromEntries(new FormData(form));
      if (!write(title, { fields, pending })) note.textContent = 'O navegador bloqueou o rascunho. Não recarregue antes de salvar.';
    };
    form.addEventListener('input', persist);
    form.addEventListener('change', persist);
    let timer;
    form.addEventListener('submit', event => {
      if (form.dataset.sending) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      form.dataset.sending = 'true'; pending = true; persist();
      timer = setTimeout(() => {
        if (!form.isConnected) return;
        note.textContent = 'O envio está demorando e ainda não foi confirmado. Seus campos foram guardados. Após recarregar, confira o histórico antes de reenviar.';
      }, 25000);
    }, true);
    const watch = new MutationObserver(() => {
      const button = form.querySelector('button[type=submit]');
      if (button && !button.disabled) delete form.dataset.sending;
      if (!form.isConnected) { clearTimeout(timer); watch.disconnect(); }
    });
    watch.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['disabled'] });
    // Clear only on a positive save confirmation, never merely on modal close.
    const success = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === 1 && node.matches('.toast.success') && /registrada com sucesso|cadastrado\(a\) com sucesso|atualizado\(a\) com sucesso/.test(node.textContent)) {
          clear(title); success.disconnect(); return;
        }
      }
      if (!form.isConnected) setTimeout(() => success.disconnect(), 1000);
    });
    const region = document.querySelector('#toast-region');
    if (region) success.observe(region, { childList:true });
  }
  new MutationObserver(() => document.querySelectorAll('#modal-form').forEach(attach))
    .observe(document.documentElement, { subtree:true, childList:true });
})();
