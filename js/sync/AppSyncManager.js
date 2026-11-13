window.MacroChef = window.MacroChef || {};

(function () {
  const remoteTables = { products: 'products', recipes: 'recipes', plannerEntries: 'planner', goals: 'goals' };
  const slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  function clean(value) {
    if (value === undefined) return null;
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]));
    }
    return value;
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    }
    return value;
  }

  function same(a, b) {
    return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  }

  function productToRemote(product) {
    const name = typeof product.name === 'object' && product.name ? product.name : { pl: product.name, en: product.name };
    const category = product.categoryName || {};
    return clean({
      id: product.id, name_pl: name.pl, name_en: name.en, category: product.category,
      category_pl: category.pl, category_en: category.en, unit: product.unit,
      package_size: product.packageSize, source_url: product.sourceUrl,
      source_verified_at: product.sourceVerifiedAt
    });
  }

  function fromRemote(table, row) {
    if (table === 'products') {
      return {
        id: row.id, name: { pl: row.name_pl, en: row.name_en }, category: row.category,
        categoryName: { pl: row.category_pl, en: row.category_en }, unit: row.unit,
        packageSize: row.package_size, sourceUrl: row.source_url, sourceVerifiedAt: row.source_verified_at
      };
    }
    const record = { ...row.data, id: row.id, ...(table === 'plannerEntries' ? { dayKey: row.day_key } : {}) };
    if (table === 'plannerEntries') {
      slots.forEach((slot) => { if (record[slot] === null) delete record[slot]; });
    }
    return record;
  }

  function toRemote(table, record, userId) {
    if (table === 'products') return productToRemote(record);
    return {
      id: record.id, user_id: userId, data: clean(record),
      ...(table === 'plannerEntries' ? { day_key: record.dayKey } : {})
    };
  }

  function applyChanges(record, changes) {
    const result = structuredClone(record);
    for (const [path, value] of Object.entries(changes)) {
      const parts = path.split('.');
      let target = result;
      for (const part of parts.slice(0, -1)) {
        if (!target[part] || typeof target[part] !== 'object') target[part] = {};
        target = target[part];
      }
      target[parts[parts.length - 1]] = clean(value);
    }
    return result;
  }

  class AppSyncManager {
    constructor() {
      this.listeners = new Set();
      this.status = { state: 'idle', message: null };
      this.stopped = true;
      this.timer = null;
      this.running = null;
      this.again = false;
    }

    start(scope) {
      if (!this.stopped || !scope || !scope.repository || !scope.userId || !scope.client) {
        throw new Error('A stopped manager and an authenticated scope are required');
      }
      this.scope = scope;
      this.stopped = false;
      this.controller = new AbortController();
      this.onOnline = () => this.requestSync();
      this.onOffline = () => this.setStatus('offline');
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
      scope.repository.mutations.onChange = () => this.requestSync();
      this.requestSync();
    }

    setStatus(state, message = null) {
      this.status = { state, message };
      this.listeners.forEach((listener) => listener(this.getStatus()));
    }

    getStatus() { return { ...this.status }; }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    requestSync() {
      if (this.stopped) return;
      if (navigator.onLine === false) {
        this.setStatus('offline');
        return;
      }
      if (this.running) {
        this.again = true;
        return;
      }
      window.clearTimeout(this.timer);
      this.setStatus('pending');
      this.timer = window.setTimeout(() => {
        this.timer = null;
        this.running = this.sync().catch((error) => {
          if (!this.stopped) {
            console.error('Synchronization failed:', error);
            if (navigator.onLine === false) this.setStatus('offline');
            else this.setStatus('error', error.message);
          }
        }).finally(() => {
          this.running = null;
          if (this.again && !this.stopped) {
            this.again = false;
            this.requestSync();
          }
        });
      }, 1500);
    }

    async stop() {
      if (this.stopped) {
        if (this.running) await this.running;
        return;
      }
      this.stopped = true;
      window.clearTimeout(this.timer);
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
      this.scope.repository.mutations.onChange = null;
      this.controller.abort();
      if (this.running) await this.running;
      this.token = null;
      this.setStatus('idle');
    }

    checkActive() {
      if (this.stopped) throw new DOMException('Synchronization stopped', 'AbortError');
    }

    async abortable(promise) {
      const signal = this.controller.signal;
      this.checkActive();
      let abort;
      const stopped = new Promise((resolve, reject) => {
        abort = () => reject(new DOMException('Synchronization stopped', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
      });
      try {
        return await Promise.race([promise, stopped]);
      } finally {
        signal.removeEventListener('abort', abort);
      }
    }

    async request(table, params, method = 'GET', body) {
      this.checkActive();
      const { client } = this.scope;
      const url = new URL(`/rest/v1/${table}`, client.supabaseUrl);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await fetch(url.href, {
        method,
        headers: {
          apikey: client.supabaseKey,
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Prefer: method === 'GET' ? 'count=exact' : 'return=representation'
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: this.controller.signal,
        cache: 'no-store'
      });
      this.checkActive();
      if (!response.ok) throw new Error(`Supabase ${table}: HTTP ${response.status}`);
      const data = await response.json();
      this.checkActive();
      return { status: response.status, data, range: response.headers.get('content-range') };
    }

    async readAll(table) {
      const rows = [];
      let total;
      do {
        const params = { select: '*', order: 'id.asc', limit: '1000', offset: String(rows.length) };
        if (table === 'planner' || table === 'goals') params.user_id = `eq.${this.scope.userId}`;
        const response = await this.request(table, params);
        const match = response.range && response.range.match(/\/(\d+)$/);
        if (!match || !Array.isArray(response.data)) throw new Error(`Invalid ${table} response`);
        total = Number(match[1]);
        if (!response.data.length && rows.length < total) throw new Error(`Incomplete ${table} response`);
        rows.push(...response.data);
      } while (rows.length < total);
      return rows;
    }

    async readRemote() {
      const result = {};
      const states = await this.scope.repository.db.SyncState.toArray();
      for (const [local, remote] of Object.entries(remoteTables)) {
        result[local] = await this.readAll(remote);
        const ids = new Set(result[local].map((row) => row.id));
        for (const state of states.filter((item) => item.table === local && !ids.has(item.recordId))) {
          const params = { select: '*', id: `eq.${state.recordId}` };
          if (remote === 'planner' || remote === 'goals') params.user_id = `eq.${this.scope.userId}`;
          const response = await this.request(remote, params);
          if (!Array.isArray(response.data) || response.data.length > 1) {
            throw new Error(`Invalid ${remote} record response`);
          }
          if (response.data.length) result[local].push(response.data[0]);
        }
        for (const row of result[local]) {
          if (!row || typeof row.id !== 'string' || !row.id ||
              typeof row.updated_at !== 'string' || Number.isNaN(Date.parse(row.updated_at)) ||
              (local !== 'products' && (!row.data || typeof row.data !== 'object' || Array.isArray(row.data))) ||
              (local === 'plannerEntries' && typeof row.day_key !== 'string') ||
              ((local === 'plannerEntries' || local === 'goals') && row.user_id !== this.scope.userId)) {
            throw new Error(`Invalid ${remote} record`);
          }
        }
      }
      return result;
    }

    async sync() {
      if (navigator.onLine === false) {
        this.setStatus('offline');
        return;
      }
      this.setStatus('syncing');
      const { data, error } = await this.abortable(this.scope.client.auth.getSession());
      this.checkActive();
      if (error) throw error;
      const session = data && data.session;
      if (!session || !session.access_token || !session.user || session.user.id !== this.scope.userId) {
        throw new Error('Active session does not match the synchronization account');
      }
      const verified = await this.abortable(this.scope.client.auth.getUser(session.access_token));
      this.checkActive();
      if (verified.error) throw verified.error;
      if (!verified.data || !verified.data.user || verified.data.user.id !== this.scope.userId) {
        throw new Error('Verified token does not match the synchronization account');
      }
      this.token = session.access_token;
      let remote = await this.readRemote();
      const db = this.scope.repository.db;
      const queue = await db.OutboxQueue.toArray();
      queue.sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.timestamp - b.timestamp);
      const conflicts = [];
      const blocked = new Set();
      for (const queued of queue) {
        this.checkActive();
        const entry = await db.OutboxQueue.get(queued.id);
        if (!entry) continue;
        if (!remoteTables[entry.table]) {
          conflicts.push(`Unsupported queued table: ${entry.table}`);
          continue;
        }
        const key = `${entry.table}:${entry.payload.id}`;
        if (blocked.has(key)) continue;
        try {
          await this.push(entry, remote);
        } catch (error) {
          if (this.stopped) throw error;
          blocked.add(key);
          conflicts.push(error.message);
        }
      }
      remote = await this.readRemote();
      await this.pull(remote, conflicts);
      this.checkActive();
      this.setStatus(conflicts.length ? 'conflict' : 'synced', conflicts.join('; ') || null);
    }

    async push(entry, remote) {
      const db = this.scope.repository.db;
      const table = entry.table;
      const id = entry.payload.id;
      if (!['create', 'update', 'delete'].includes(entry.action)) {
        throw new Error(`Invalid queued action: ${table}/${id}`);
      }
      if (!entry.sequence) throw new Error(`Legacy queued change requires review: ${table}/${id}`);
      const current = remote[table].find((row) => row.id === id);
      if (entry.baseUpdatedAt && (!current || current.updated_at !== entry.baseUpdatedAt)) {
        throw new Error(`Server version changed: ${table}/${id}`);
      }
      if (!entry.baseUpdatedAt && current && entry.action !== 'create') {
        throw new Error(`Missing server baseline: ${table}/${id}`);
      }
      let record;
      if (entry.action !== 'delete') {
        if (entry.action === 'create') record = entry.payload;
        else if (entry.payload.value) record = entry.payload.value;
        else if (entry.payload.changes && current) record = applyChanges(fromRemote(table, current), entry.payload.changes);
        else if (entry.payload.changes && entry.snapshot) record = applyChanges(entry.snapshot, entry.payload.changes);
        else throw new Error(`Invalid queued change: ${table}/${id}`);
        if (table === 'plannerEntries') {
          const known = new Set(remote.recipes.map((row) => row.id));
          if (slots.some((slot) => record[slot] && !known.has(record[slot]))) {
            throw new Error(`Plan references local-only recipes: ${record.dayKey}`);
          }
        }
        if (table === 'plannerEntries' && remote[table].some((row) => row.id !== id && row.day_key === record.dayKey)) {
          throw new Error(`Another server plan exists: ${record.dayKey}`);
        }
        if (table === 'goals' && remote[table].some((row) => row.id !== id)) {
          throw new Error('Another server goals record exists');
        }
      }
      const payload = record && toRemote(table, record, this.scope.userId);
      if (current && !entry.baseUpdatedAt && entry.action === 'create') {
        const comparable = { ...current };
        delete comparable.updated_at;
        if (!same(comparable, payload)) throw new Error(`Server record already exists: ${table}/${id}`);
      }
      if (entry.action === 'delete' && !current) throw new Error(`Cannot confirm deletion: ${table}/${id}`);
      const params = { select: '*' };
      let method;
      if (!current) {
        method = 'POST';
      } else {
        method = entry.action === 'delete' ? 'DELETE' : 'PATCH';
        params.id = `eq.${id}`;
        params.updated_at = `eq.${current.updated_at}`;
        if (table !== 'products') params.user_id = `eq.${this.scope.userId}`;
      }
      const response = await this.request(remoteTables[table], params, method, method === 'DELETE' ? undefined : payload);
      if (![200, 201].includes(response.status) || !Array.isArray(response.data) ||
          response.data.length !== 1 || response.data[0].id !== id ||
          typeof response.data[0].updated_at !== 'string' ||
          Number.isNaN(Date.parse(response.data[0].updated_at)) ||
          (table !== 'products' && response.data[0].user_id !== this.scope.userId)) {
        throw new Error(`Write not acknowledged: ${table}/${id}`);
      }
      const acknowledged = response.data[0];
      await db.transaction('rw', db.OutboxQueue, db.SyncState, async () => {
        this.checkActive();
        if (entry.action === 'delete') await db.SyncState.delete(`${table}:${id}`);
        else await db.SyncState.put({ id: `${table}:${id}`, table, recordId: id, updatedAt: acknowledged.updated_at });
        await db.OutboxQueue.delete(entry.id);
        const pending = await db.OutboxQueue.toArray();
        for (const later of pending) {
          if (later.table === table && later.payload.id === id && later.sequence > entry.sequence &&
              later.baseUpdatedAt === entry.baseUpdatedAt) {
            await db.OutboxQueue.update(later.id, { baseUpdatedAt: entry.action === 'delete' ? null : acknowledged.updated_at });
          }
        }
      });
      const index = remote[table].findIndex((row) => row.id === id);
      if (index >= 0) remote[table].splice(index, 1);
      if (entry.action !== 'delete') remote[table].push(acknowledged);
    }

    async pull(remote, conflicts) {
      const db = this.scope.repository.db;
      await db.transaction('rw', db.products, db.recipes, db.plannerEntries, db.goals, db.OutboxQueue, db.SyncState, async () => {
        this.checkActive();
        const queued = await db.OutboxQueue.toArray();
        const states = await db.SyncState.toArray();
        for (const [table, rows] of Object.entries(remote)) {
          const seen = new Set(rows.map((row) => row.id));
          for (const state of states.filter((item) => item.table === table && !seen.has(item.recordId))) {
            if (queued.some((item) => item.table === table && item.payload.id === state.recordId)) {
              conflicts.push(`Server deleted a locally changed record: ${table}/${state.recordId}`);
              continue;
            }
            await db.table(table).delete(state.recordId);
            await db.SyncState.delete(state.id);
          }
          for (const row of rows) {
            this.checkActive();
            if (queued.some((item) => item.table === table && item.payload.id === row.id)) continue;
            const value = fromRemote(table, row);
            if (table === 'plannerEntries' && slots.some((slot) =>
              value[slot] && !remote.recipes.some((recipe) => recipe.id === value[slot]))) {
              conflicts.push(`Server plan references unavailable recipes: ${value.dayKey}`);
              continue;
            }
            if (table === 'plannerEntries' || table === 'goals') {
              const others = table === 'plannerEntries'
                ? await db.plannerEntries.where('dayKey').equals(value.dayKey).toArray()
                : await db.goals.toArray();
              if (others.some((item) => item.id !== row.id)) {
                conflicts.push(`Local and server records differ: ${table}/${row.id}`);
                continue;
              }
            }
            const existing = await db.table(table).get(row.id);
            const state = await db.SyncState.get(`${table}:${row.id}`);
            if (existing && !state && !same(existing, value)) {
              conflicts.push(`Local record has no server baseline: ${table}/${row.id}`);
              continue;
            }
            await db.table(table).put(value);
            await db.SyncState.put({ id: `${table}:${row.id}`, table, recordId: row.id, updatedAt: row.updated_at });
          }
        }
      });
    }
  }

  window.MacroChef.AppSyncManager = AppSyncManager;
})();
