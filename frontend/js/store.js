/* ============================================================
   STORE — backend-backed state cache
   ------------------------------------------------------------
   Keeps the same synchronous read/mutate API the rest of the app
   already relies on (getRecord/updateField/... never block), by
   caching each period's record in memory once loaded and saving
   mutations back to the backend on a short debounce. Callers that
   switch to a period must `await Store.ensureRecordLoaded(period)`
   before rendering it for the first time.
   ============================================================ */

const Store = (() => {
  const SAVE_DEBOUNCE_MS = 500;

  let _settings = null;
  let _records = {}; // period -> record object (cache)
  let _periods = new Set(); // known periods, from the backend
  let _saveStatusCallback = null;
  const _recordTimers = {};
  let _settingsTimer = null;

  function notify(status, message) {
    if (_saveStatusCallback) _saveStatusCallback(status, message);
  }

  function scheduleRecordSave(period) {
    notify("saving");
    clearTimeout(_recordTimers[period]);
    _recordTimers[period] = setTimeout(async () => {
      try {
        await Api.put(`/records/${period}`, _records[period]);
        notify("saved");
      } catch (err) {
        notify("error", err.message);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function touch(period) {
    const r = _records[period];
    if (r) r.updatedAt = new Date().toISOString();
    scheduleRecordSave(period);
  }

  function getRecord(period) {
    return _records[period];
  }

  return {
    // ---------- Init ----------
    async init() {
      _settings = await Api.get("/settings");
      _periods = new Set(await Api.get("/records"));
    },

    setSaveStatusCallback(fn) {
      _saveStatusCallback = fn;
    },

    // ---------- Settings ----------
    getSettings() {
      return _settings;
    },

    saveSettings(patch) {
      _settings = { ..._settings, ...patch };
      if (patch.exchangeRates) {
        _settings.exchangeRates = { ..._settings.exchangeRates, ...patch.exchangeRates };
      }
      notify("saving");
      clearTimeout(_settingsTimer);
      _settingsTimer = setTimeout(async () => {
        try {
          await Api.put("/settings", _settings);
          notify("saved");
        } catch (err) {
          notify("error", err.message);
        }
      }, SAVE_DEBOUNCE_MS);
    },

    // ---------- Records ----------
    async ensureRecordLoaded(period) {
      if (_records[period]) return _records[period];
      const record = await Api.get(`/records/${period}`);
      _records[period] = record;
      _periods.add(period);
      return record;
    },

    getRecord,

    updateField(period, section, field, value) {
      const r = getRecord(period);
      if (!r) return;
      r[section][field] = value;
      touch(period);
    },

    updateNotes(period, notes) {
      const r = getRecord(period);
      if (!r) return;
      r.notes = notes || "";
      touch(period);
    },

    updateAssetItem(period, group, idx, subfield, value) {
      const r = getRecord(period);
      if (r?.balance[group]?.[idx] !== undefined) {
        r.balance[group][idx][subfield] = value;
        touch(period);
      }
    },

    addCustomItem(period, section, item) {
      const r = getRecord(period);
      if (!r?.[section]) return;
      if (!Array.isArray(r[section].customItems)) r[section].customItems = [];
      r[section].customItems.push(item);
      touch(period);
    },

    updateCustomItem(period, section, idx, subfield, value) {
      const r = getRecord(period);
      if (!r?.[section]?.customItems?.[idx]) return;
      r[section].customItems[idx][subfield] = value;
      touch(period);
    },

    removeCustomItem(period, section, idx) {
      const r = getRecord(period);
      if (!r?.[section]?.customItems) return;
      r[section].customItems.splice(idx, 1);
      touch(period);
    },

    addAssetItem(period, group, item) {
      const r = getRecord(period);
      if (!r) return;
      if (!Array.isArray(r.balance[group])) r.balance[group] = [];
      r.balance[group].push(item);
      touch(period);
    },

    removeAssetItem(period, group, idx) {
      const r = getRecord(period);
      if (Array.isArray(r?.balance[group])) {
        r.balance[group].splice(idx, 1);
        touch(period);
      }
    },

    copyBalanceFrom(sourcePeriod, destPeriod) {
      const src = getRecord(sourcePeriod);
      const dest = getRecord(destPeriod);
      if (!src || !dest) return;
      dest.balance = JSON.parse(JSON.stringify(src.balance));
      touch(destPeriod);
    },

    async exportJSON() {
      const data = await Api.get("/export");
      return JSON.stringify(data);
    },

    async importJSON(json) {
      const parsed = JSON.parse(json);
      if (!parsed.settings || !parsed.records) throw new Error("格式错误");
      await Api.post("/import", parsed);
      _records = {};
      _periods = new Set(Object.keys(parsed.records));
      _settings = parsed.settings;
    },

    getPrevPeriod(period) {
      const [y, m] = period.split("-").map(Number);
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    },

    hasPeriod(p) {
      return _periods.has(p);
    },

    async deleteRecord(p) {
      await Api.del(`/records/${p}`);
      delete _records[p];
      _periods.delete(p);
    },

    getAllPeriods() {
      return Array.from(_periods).sort();
    },
  };
})();
