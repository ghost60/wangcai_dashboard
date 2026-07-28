const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");

loadDotEnv();

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const legacyStorePath = path.join(dataDir, "equity-store.json");
const metaStorePath = path.join(dataDir, "equity-meta.json");
const snapshotsStorePath = path.join(dataDir, "equity-snapshots.jsonl");
const transfersStorePath = path.join(dataDir, "equity-transfers.jsonl");
const manualAccountsStorePath = path.join(dataDir, "manual-accounts.json");
const manualEntriesStorePath = path.join(dataDir, "manual-account-entries.json");
const codexConfigPath = process.env.CODEX_CONFIG_PATH || path.join(os.homedir(), ".codex", "config.toml");
const codexAuthPath = process.env.CODEX_AUTH_PATH || path.join(os.homedir(), ".codex", "auth.json");
const externalEntityId = "__external__";
const marketQuoteSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
const config = {
  apiKey: process.env.BINANCE_API_KEY || "",
  apiSecret: process.env.BINANCE_API_SECRET || "",
  baseUrl: process.env.BINANCE_BASE_URL || "https://api.binance.com",
  fapiBaseUrl: process.env.BINANCE_FAPI_BASE_URL || "https://fapi.binance.com",
  dapiBaseUrl: process.env.BINANCE_DAPI_BASE_URL || "https://dapi.binance.com",
  papiBaseUrl: process.env.BINANCE_PAPI_BASE_URL || process.env.BINANCE_BASE_URL || "https://api.binance.com",
  recvWindow: Number(process.env.BINANCE_RECV_WINDOW || 5000),
  signedRequestRetries: Number(process.env.BINANCE_SIGNED_REQUEST_RETRIES || 2),
  fetchTimeoutMs: Number(process.env.FETCH_TIMEOUT_MS || 15000),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 15000),
  marketCacheTtlMs: Number(process.env.MARKET_CACHE_TTL_MS || 10000),
  positionPnlCacheTtlMs: Number(process.env.POSITION_PNL_CACHE_TTL_MS || 5 * 60 * 1000),
  positionPnlMinExposureUsdt: Number(process.env.POSITION_PNL_MIN_EXPOSURE_USDT || 10),
  fiatRateCacheTtlMs: Number(process.env.FIAT_RATE_CACHE_TTL_MS || 60 * 60 * 1000),
  cnyPerUsdt: Number(process.env.CNY_PER_USDT || 0),
  fallbackCnyPerUsdt: Number(process.env.FALLBACK_CNY_PER_USDT || 7.2),
  cnyRateUrl: process.env.CNY_RATE_URL || "https://open.er-api.com/v6/latest/USD",
  tradingStatsCacheTtlMs: Number(process.env.TRADING_STATS_CACHE_TTL_MS || 300000),
  snapshotIntervalMs: Number(process.env.SNAPSHOT_INTERVAL_MS || 300000),
  transferLookbackDays: Number(process.env.TRANSFER_LOOKBACK_DAYS || 14),
  dataRetentionDays: Number(process.env.DATA_RETENTION_DAYS || 0),
  port: Number(process.env.PORT || 5173)
};

let summaryCache = {
  fetchedAt: 0,
  data: null
};
let positionsCache = {
  fetchedAt: 0,
  data: null
};
let performanceCache = new Map();
let positionPnlLeadersCache = {
  key: "",
  fetchedAt: 0,
  data: null
};
let tradingStatsCache = {
  fetchedAt: 0,
  data: null
};
let marketCache = {
  fetchedAt: 0,
  data: null
};
let fiatRateCache = {
  fetchedAt: 0,
  data: null
};
let petCache = {
  key: "",
  data: null,
  fetchedAt: 0
};
let petQuipCache = {
  key: "",
  data: null,
  fetchedAt: 0
};
let equitySourcePresenceCache = new Map();
let isCapturingSnapshot = false;
let lastCaptureError = null;
let binanceTimeOffsetMs = 0;
let store = loadStore();
let manualAccountsStore = loadManualAccountsStore();
let manualEntriesStore = loadManualEntriesStore();
seedManualEntriesFromAccounts();
ensureStorePersisted();
const appStartedAt = new Date();
const requestStats = {
  total: 0,
  api: 0,
  static: 0,
  errors: 0,
  bytesIn: 0,
  bytesOut: 0,
  byPath: new Map()
};
let lastResourceSample = null;

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    let value = trimmed.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.bytesOut = Buffer.byteLength(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function textResponse(res, statusCode, body) {
  res.bytesOut = Buffer.byteLength(String(body));
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function normalizeRequestPath(pathname) {
  const normalized = pathname || "/";
  if (normalized.length > 1 && normalized.endsWith("/")) return normalized.slice(0, -1);
  return normalized;
}

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        error.code = "BODY_TOO_LARGE";
        reject(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        error.statusCode = 400;
        error.code = "INVALID_JSON";
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function loadStore() {
  const emptyStore = () => ({
    version: 2,
    storage: "jsonl",
    snapshots: [],
    transfers: [],
    accountTags: {},
    lastTransferSyncAtBySource: {},
    lastTransferSyncAt: null,
    lastSnapshotAt: null
  });

  try {
    if (fs.existsSync(metaStorePath) || fs.existsSync(snapshotsStorePath) || fs.existsSync(transfersStorePath)) {
      const meta = fs.existsSync(metaStorePath)
        ? JSON.parse(fs.readFileSync(metaStorePath, "utf8"))
        : {};
      return {
        version: 2,
        storage: "jsonl",
        snapshots: readJsonLines(snapshotsStorePath),
        transfers: readJsonLines(transfersStorePath),
        accountTags: normalizeAccountTags(meta.accountTags),
        lastTransferSyncAtBySource: normalizeTransferSyncCursors(meta.lastTransferSyncAtBySource),
        lastTransferSyncAt: meta.lastTransferSyncAt || null,
        lastSnapshotAt: meta.lastSnapshotAt || null
      };
    }

    if (!fs.existsSync(legacyStorePath)) return emptyStore();

    const parsed = JSON.parse(fs.readFileSync(legacyStorePath, "utf8"));
    return {
      version: 2,
      storage: "jsonl",
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
      accountTags: normalizeAccountTags(parsed.accountTags),
      lastTransferSyncAtBySource: normalizeTransferSyncCursors(parsed.lastTransferSyncAtBySource),
      lastTransferSyncAt: parsed.lastTransferSyncAt || null,
      lastSnapshotAt: parsed.lastSnapshotAt || null
    };
  } catch (error) {
    console.error("Failed to load equity store:", error.message);
    return emptyStore();
  }
}

function saveStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  writeJsonLinesAtomic(snapshotsStorePath, store.snapshots);
  writeJsonLinesAtomic(transfersStorePath, store.transfers);
  saveStoreMeta();
  markLegacyStoreMigrated();
}

function ensureStorePersisted() {
  if (fs.existsSync(metaStorePath) || fs.existsSync(snapshotsStorePath) || fs.existsSync(transfersStorePath)) {
    return;
  }
  if (fs.existsSync(legacyStorePath) || store.snapshots.length || store.transfers.length) {
    saveStore();
  }
}

function saveStoreMeta() {
  fs.mkdirSync(dataDir, { recursive: true });
  const meta = {
    version: 2,
    storage: "jsonl",
    accountTags: normalizeAccountTags(store.accountTags),
    lastTransferSyncAtBySource: normalizeTransferSyncCursors(store.lastTransferSyncAtBySource),
    lastTransferSyncAt: store.lastTransferSyncAt || null,
    lastSnapshotAt: store.lastSnapshotAt || null,
    updatedAt: new Date().toISOString()
  };
  const tempPath = `${metaStorePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(meta, null, 2));
  fs.renameSync(tempPath, metaStorePath);
}

function readJsonLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const rows = [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      console.error(`Skipping invalid JSONL row in ${path.basename(filePath)}:`, error.message);
    }
  }
  return rows;
}

function writeJsonLinesAtomic(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  const body = (rows || []).map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(tempPath, body ? `${body}\n` : "");
  fs.renameSync(tempPath, filePath);
}

function appendJsonLines(filePath, rows) {
  if (!rows || !rows.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function markLegacyStoreMigrated() {
  if (!fs.existsSync(legacyStorePath)) return;
  const backupPath = `${legacyStorePath}.legacy`;
  if (fs.existsSync(backupPath)) return;
  try {
    fs.renameSync(legacyStorePath, backupPath);
  } catch (error) {
    console.error("Failed to mark legacy equity store as migrated:", error.message);
  }
}

function loadManualAccountsStore() {
  const empty = () => ({
    version: 2,
    enabled: false,
    accounts: [],
    updatedAt: null
  });

  try {
    if (!fs.existsSync(manualAccountsStorePath)) return empty();
    const parsed = JSON.parse(fs.readFileSync(manualAccountsStorePath, "utf8"));
    const accounts = normalizeManualAccounts(parsed.accounts);
    return {
      version: 2,
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : accounts.length > 0,
      accounts,
      updatedAt: parsed.updatedAt || null
    };
  } catch (error) {
    console.error("Failed to load manual accounts:", error.message);
    return empty();
  }
}

function loadManualEntriesStore() {
  const empty = () => ({
    version: 1,
    entries: [],
    updatedAt: null
  });

  try {
    if (!fs.existsSync(manualEntriesStorePath)) return empty();
    const parsed = JSON.parse(fs.readFileSync(manualEntriesStorePath, "utf8"));
    return {
      version: 1,
      entries: normalizeManualEntries(parsed.entries),
      updatedAt: parsed.updatedAt || null
    };
  } catch (error) {
    console.error("Failed to load manual account entries:", error.message);
    return empty();
  }
}

function seedManualEntriesFromAccounts() {
  if (normalizeManualEntries(manualEntriesStore.entries).length) return;
  const accounts = normalizeManualAccounts(manualAccountsStore.accounts)
    .filter((account) => Number(account.equityCny || 0) > 0);
  if (!accounts.length) return;
  manualEntriesStore.entries = normalizeManualEntries(accounts.map((account) => ({
    accountId: account.id,
    date: localDateString(new Date(account.updatedAt || Date.now())),
    equityCny: account.equityCny,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  })));
  saveManualEntriesStore();
}

function saveManualAccountsStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  const enabled = manualAccountsEnabled();
  manualAccountsStore = {
    version: 2,
    enabled,
    accounts: normalizeManualAccounts(manualAccountsStore.accounts),
    updatedAt: new Date().toISOString()
  };
  const tempPath = `${manualAccountsStorePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(manualAccountsStore, null, 2));
  fs.renameSync(tempPath, manualAccountsStorePath);
}

function manualAccountsEnabled() {
  if (typeof manualAccountsStore.enabled === "boolean") return manualAccountsStore.enabled;
  return (
    normalizeManualAccounts(manualAccountsStore.accounts).length > 0 ||
    normalizeManualEntries(manualEntriesStore.entries).length > 0
  );
}

function setManualAccountsEnabled(enabled) {
  manualAccountsStore.enabled = Boolean(enabled);
  saveManualAccountsStore();
  clearDataCaches();
  return manualAccountsEnabled();
}

function saveManualEntriesStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  manualEntriesStore = {
    version: 1,
    entries: normalizeManualEntries(manualEntriesStore.entries),
    updatedAt: new Date().toISOString()
  };
  const tempPath = `${manualEntriesStorePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(manualEntriesStore, null, 2));
  fs.renameSync(tempPath, manualEntriesStorePath);
}

function normalizeManualAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  const seen = new Set();
  const normalized = [];
  for (const account of accounts) {
    const row = normalizeManualAccount(account);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    normalized.push(row);
  }
  return normalized.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

function normalizeManualAccount(account) {
  if (!account || typeof account !== "object") return null;
  const id = manualAccountId(account.id || account.label || account.name);
  if (!id) return null;
  const nowIso = new Date().toISOString();
  const label = normalizeManualLabel(account.label || account.name || id.replace(/^manual:/, ""));
  const equityCny = normalizeMoney(account.equityCny ?? account.equity ?? account.valueCny);
  return {
    id,
    label,
    broker: normalizeManualText(account.broker, 40),
    accountNo: normalizeManualText(account.accountNo || account.account, 40),
    currency: "CNY",
    equityCny,
    remark: normalizeManualText(account.remark, 120),
    tags: normalizeTags(account.tags),
    archived: Boolean(account.archived),
    updatedAt: normalizeIsoTimestamp(account.updatedAt) || nowIso,
    createdAt: normalizeIsoTimestamp(account.createdAt) || normalizeIsoTimestamp(account.updatedAt) || nowIso
  };
}

function manualAccountId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutPrefix = raw.replace(/^manual:/i, "");
  const key = withoutPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return key ? `manual:${key}` : "";
}

function normalizeManualLabel(value) {
  const label = normalizeManualText(value, 60);
  return label || "手工账户";
}

function normalizeManualText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeMoney(value) {
  const number = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(number)) return 0;
  return roundNumber(number, 2);
}

function normalizeIsoTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function normalizeManualEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const byKey = new Map();
  for (const entry of entries) {
    const normalized = normalizeManualEntry(entry);
    if (!normalized) continue;
    byKey.set(manualEntryKey(normalized.accountId, normalized.date), normalized);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare || a.accountId.localeCompare(b.accountId);
  });
}

function normalizeManualEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const accountId = manualAccountId(entry.accountId || entry.id || entry.label);
  const date = normalizeManualDate(entry.date || entry.asOf || entry.recordDate || entry.timestamp);
  if (!accountId || !date) return null;
  const equityCny = normalizeMoney(entry.equityCny ?? entry.equity ?? entry.valueCny);
  return {
    id: manualEntryKey(accountId, date),
    accountId,
    date,
    asOf: manualDateEndIso(date),
    equityCny,
    note: normalizeManualText(entry.note || entry.remark, 120),
    createdAt: normalizeIsoTimestamp(entry.createdAt) || new Date().toISOString(),
    updatedAt: normalizeIsoTimestamp(entry.updatedAt) || new Date().toISOString()
  };
}

function manualEntryKey(accountId, date) {
  return `${manualAccountId(accountId)}:${date}`;
}

function normalizeManualDate(value) {
  if (!value && value !== 0) return localDateString(new Date());
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return "";
  return localDateString(new Date(parsed));
}

function localDateString(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function manualDateEndIso(date) {
  return new Date(`${date}T15:30:00+08:00`).toISOString();
}

function assertConfig() {
  if (!config.apiKey || !config.apiSecret) {
    const error = new Error("Missing BINANCE_API_KEY or BINANCE_API_SECRET.");
    error.statusCode = 503;
    error.code = "CONFIG_MISSING";
    throw error;
  }
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

function sign(queryString) {
  return crypto
    .createHmac("sha256", config.apiSecret)
    .update(queryString)
    .digest("hex");
}

async function binanceSignedGet(endpoint, params = {}, baseUrl = config.baseUrl) {
  return binanceSignedRequest("GET", endpoint, params, baseUrl);
}

async function binancePublicGet(endpoint, params = {}, baseUrl = config.baseUrl) {
  const queryString = buildQuery(params);
  const targetUrl = queryString
    ? `${baseUrl}${endpoint}?${queryString}`
    : `${baseUrl}${endpoint}`;
  return fetchJson(targetUrl);
}

async function binanceSignedPost(endpoint, params = {}) {
  return binanceSignedRequest("POST", endpoint, params, config.baseUrl);
}

async function binanceSignedRequest(method, endpoint, params = {}, baseUrl = config.baseUrl) {
  assertConfig();

  let lastError = null;
  for (let attempt = 0; attempt <= config.signedRequestRetries; attempt += 1) {
    const queryString = buildQuery({
      ...params,
      recvWindow: config.recvWindow,
      timestamp: Date.now() + binanceTimeOffsetMs
    });
    const signature = sign(queryString);
    const targetUrl = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    try {
      return await fetchJson(targetUrl, {
        method,
        headers: {
          "X-MBX-APIKEY": config.apiKey
        }
      });
    } catch (error) {
      lastError = error;
      if (!isBinanceTimestampError(error) || attempt >= config.signedRequestRetries) break;
      await syncBinanceTimeOffset(baseUrl);
    }
  }

  throw lastError;
}

async function fetchJson(targetUrl, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || config.fetchTimeoutMs || 15000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let text = "";
  try {
    response = await fetch(targetUrl, {
      ...options,
      signal: controller.signal
    });
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms.`);
      timeoutError.statusCode = 504;
      timeoutError.code = "FETCH_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(payload.msg || `Binance request failed with ${response.status}.`);
    error.statusCode = response.status;
    error.code = payload.code || "BINANCE_ERROR";
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function syncBinanceTimeOffset(baseUrl = config.baseUrl) {
  const payload = await fetchJson(`${baseUrl}${binanceTimeEndpoint(baseUrl)}`);
  const serverTime = Number(payload.serverTime || 0);
  if (!serverTime) return;
  binanceTimeOffsetMs = serverTime - Date.now();
  console.warn(`Adjusted Binance time offset to ${binanceTimeOffsetMs}ms.`);
}

function binanceTimeEndpoint(baseUrl) {
  if (baseUrl === config.fapiBaseUrl) return "/fapi/v1/time";
  if (baseUrl === config.dapiBaseUrl) return "/dapi/v1/time";
  if (baseUrl === config.papiBaseUrl) return "/papi/v1/time";
  return "/api/v3/time";
}

function isBinanceTimestampError(error) {
  return String(error.code) === "-1021";
}

function assertAnyArrayField(payload, fields, label) {
  for (const field of fields) {
    if (Array.isArray(payload?.[field])) return;
  }

  const error = new Error(`${label} response missing account list.`);
  error.statusCode = 502;
  error.code = "BINANCE_RESPONSE_INVALID";
  error.details = {
    label,
    fields
  };
  throw error;
}

function isMissingAccountError(error) {
  return String(error.code) === "-3003";
}

function throwSubAccountListError(error) {
  const next = new Error(error?.message || "Failed to fetch sub-account list.");
  next.statusCode = error?.statusCode || 500;
  next.code = error?.code || "SUB_ACCOUNT_LIST_ERROR";
  next.payload = error;
  throw next;
}

async function fetchAllSubAccounts() {
  const limit = 200;
  const accounts = [];

  for (let page = 1; page <= 50; page += 1) {
    const payload = await binanceSignedGet("/sapi/v1/sub-account/list", {
      page,
      limit
    });
    const batch = Array.isArray(payload.subAccounts) ? payload.subAccounts : [];
    accounts.push(...batch);
    if (batch.length < limit) break;
  }

  return accounts;
}

async function fetchSpotSummaryPages() {
  const size = 20;
  const rows = [];
  let masterAccountTotalAsset = "0";
  let totalCount = 0;

  for (let page = 1; page <= 250; page += 1) {
    const payload = await binanceSignedGet("/sapi/v1/sub-account/spotSummary", {
      page,
      size
    });

    if (page === 1) {
      masterAccountTotalAsset = payload.masterAccountTotalAsset || "0";
      totalCount = Number(payload.totalCount || 0);
    }

    const batch = Array.isArray(payload.spotSubUserAssetBtcVoList)
      ? payload.spotSubUserAssetBtcVoList
      : [];
    rows.push(...batch);

    if (rows.length >= totalCount || batch.length === 0) break;
  }

  return {
    totalCount,
    masterAccountTotalAsset,
    spotSubUserAssetBtcVoList: rows
  };
}

async function fetchMarginSummary() {
  const payload = await binanceSignedGet("/sapi/v1/sub-account/margin/accountSummary");
  assertAnyArrayField(payload, ["marginSubAccountList", "subAccountList"], "Sub-account margin summary");
  return payload;
}

async function fetchFuturesSummaryPages(futuresType = 1) {
  const limit = 20;
  const rows = [];
  let summary = {};

  for (let page = 1; page <= 250; page += 1) {
    const payload = await binanceSignedGet("/sapi/v2/sub-account/futures/accountSummary", {
      futuresType,
      page,
      limit
    });
    const summaryKey = futuresType === 1 ? "futureAccountSummaryResp" : "deliveryAccountSummaryResp";
    const pageSummary = payload[summaryKey];
    assertAnyArrayField(pageSummary, ["subAccountList"], `Sub-account futures summary ${futuresType}`);
    const batch = pageSummary.subAccountList;

    if (page === 1) summary = { ...pageSummary, subAccountList: [] };
    rows.push(...batch);
    if (batch.length < limit) break;
  }

  return {
    ...summary,
    subAccountList: rows
  };
}

async function fetchMasterMarginAccount() {
  return binanceSignedGet("/sapi/v1/margin/account");
}

async function fetchMasterUsdMFuturesAccount() {
  return binanceSignedGet("/fapi/v3/account", {}, config.fapiBaseUrl);
}

async function fetchMasterCoinMFuturesAccount() {
  return binanceSignedGet("/dapi/v1/account", {}, config.dapiBaseUrl);
}

async function fetchMasterPortfolioMarginAccount() {
  return binanceSignedGet("/papi/v1/account", {}, config.papiBaseUrl);
}

async function fetchMasterPortfolioMarginAccountV2() {
  return binanceSignedGet("/papi/v2/account", {}, config.papiBaseUrl);
}

async function fetchMasterSimpleEarnAccount() {
  return binanceSignedGet("/sapi/v1/simple-earn/account");
}

async function fetchMasterFundingAssets() {
  return binanceSignedPost("/sapi/v1/asset/get-funding-asset");
}

async function fetchSubAccountSpotAssets(email) {
  const payload = await binanceSignedGet("/sapi/v4/sub-account/assets", { email });
  assertAnyArrayField(payload, ["balances"], "Sub-account spot assets");
  return payload;
}

async function fetchSubAccountMarginAccount(email) {
  return binanceSignedGet("/sapi/v1/sub-account/margin/account", { email });
}

async function fetchSubAccountFuturesAccount(email, futuresType = 1) {
  return binanceSignedGet("/sapi/v2/sub-account/futures/account", { email, futuresType });
}

async function fetchSubAccountFuturesPositionRisk(email, futuresType = 1) {
  return binanceSignedGet("/sapi/v2/sub-account/futures/positionRisk", { email, futuresType });
}

async function fetchSubAccountUniversalTransfers(startTime, endTime, summary = null) {
  const rows = [];
  const seen = new Set();
  const knownEmails = (summary?.entities || [])
    .filter((entity) => entity.type === "sub")
    .map((entity) => entity.email || entity.id)
    .filter((email) => /^[^@\s]+@[^@\s]+$/.test(String(email || "")));
  const queryScopes = [
    {},
    ...knownEmails.flatMap((email) => [{ fromEmail: email }, { toEmail: email }])
  ];

  for (const window of timeWindows(startTime, endTime, 7 * 24 * 60 * 60 * 1000 - 1)) {
    for (const scope of queryScopes) {
      for (let page = 1; page <= 250; page += 1) {
        const payload = await binanceSignedGet("/sapi/v1/sub-account/universalTransfer", {
          startTime: window.startTime,
          endTime: window.endTime,
          page,
          limit: 500,
          ...scope
        });
        const batch = Array.isArray(payload.result) ? payload.result : [];
        for (const row of batch) {
          const key = row.tranId || row.txId || JSON.stringify(row);
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push(row);
        }
        if (batch.length < 500) break;
      }
    }
  }

  return rows;
}

async function fetchSubAccountSpotTransfers(startTime, endTime) {
  const rows = [];

  for (let page = 1; page <= 250; page += 1) {
    const payload = await binanceSignedGet("/sapi/v1/sub-account/sub/transfer/history", {
      startTime,
      endTime,
      page,
      limit: 500
    });
    const batch = Array.isArray(payload) ? payload : Array.isArray(payload?.result) ? payload.result : [];
    rows.push(...batch);
    if (batch.length < 500) break;
  }

  return rows;
}

async function fetchMasterDeposits(startTime, endTime) {
  const rows = [];

  for (const window of timeWindows(startTime, endTime, 90 * 24 * 60 * 60 * 1000 - 1)) {
    for (let offset = 0; offset <= 50000; offset += 1000) {
      const payload = await binanceSignedGet("/sapi/v1/capital/deposit/hisrec", {
        startTime: window.startTime,
        endTime: window.endTime,
        status: 1,
        includeSource: true,
        offset,
        limit: 1000
      });
      const batch = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
  }

  return rows;
}

async function fetchMasterPayTransactions(startTime, endTime) {
  const rows = [];
  const seen = new Set();

  for (const window of timeWindows(startTime, endTime, 7 * 24 * 60 * 60 * 1000 - 1)) {
    const batch = await fetchMasterPayTransactionWindow(window.startTime, window.endTime);
    for (const row of batch.flatMap(expandPayTransactionRows)) {
      const key = `${row.transactionId || row.orderId || JSON.stringify(row)}:${row.payDetailIndex || 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }

  return rows;
}

async function fetchMasterPayTransactionWindow(startTime, endTime, depth = 0) {
  const payload = await binanceSignedGet("/sapi/v1/pay/transactions", {
    startTime,
    endTime,
    limit: 100
  });
  const batch = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  if (batch.length < 100 || endTime - startTime <= 60 * 60 * 1000 || depth >= 10) {
    return batch;
  }

  const midpoint = Math.floor((startTime + endTime) / 2);
  const [left, right] = await Promise.all([
    fetchMasterPayTransactionWindow(startTime, midpoint, depth + 1),
    fetchMasterPayTransactionWindow(midpoint + 1, endTime, depth + 1)
  ]);
  return [...left, ...right];
}

function expandPayTransactionRows(row) {
  const rowAmountUnits = decimalToUnits(row?.amount || "0", 8);
  if (rowAmountUnits === 0n) return [];

  const details = Array.isArray(row.fundsDetail) && row.fundsDetail.length
    ? row.fundsDetail
    : [{ currency: row.currency, amount: row.amount }];

  return details.map((detail, index) => {
    let detailAmountUnits = decimalToUnits(detail.amount || row.amount || "0", 8);
    if (rowAmountUnits < 0n && detailAmountUnits > 0n) detailAmountUnits = -detailAmountUnits;
    if (rowAmountUnits > 0n && detailAmountUnits < 0n) detailAmountUnits = -detailAmountUnits;
    return {
      ...row,
      payAsset: detail.currency || row.currency,
      payAmount: unitsToDecimal(detailAmountUnits, 8),
      payDetailIndex: index
    };
  });
}

async function fetchMasterWithdrawals(startTime, endTime) {
  const rows = [];

  for (const window of timeWindows(startTime, endTime, 90 * 24 * 60 * 60 * 1000 - 1)) {
    for (let offset = 0; offset <= 50000; offset += 1000) {
      const payload = await binanceSignedGet("/sapi/v1/capital/withdraw/history", {
        startTime: window.startTime,
        endTime: window.endTime,
        status: 6,
        offset,
        limit: 1000
      });
      const batch = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
  }

  return rows;
}

async function fetchSubAccountTransactionStatistics(email) {
  return binanceSignedGet("/sapi/v1/sub-account/transaction-statistics", { email });
}

async function fetchMarketPrices() {
  const now = Date.now();
  if (marketCache.data && now - marketCache.fetchedAt < config.marketCacheTtlMs) {
    return marketCache.data;
  }

  const [pricePayload, tickerPayload] = await Promise.all([
    binancePublicGet("/api/v3/ticker/price"),
    binancePublicGet("/api/v3/ticker/24hr", {
      symbols: JSON.stringify(marketQuoteSymbols)
    }).catch(() => [])
  ]);
  const payload = pricePayload;
  const rows = Array.isArray(payload) ? payload : [];
  const priceMap = new Map(rows.map((row) => [row.symbol, Number(row.price || 0)]));
  const tickerRows = Array.isArray(tickerPayload) ? tickerPayload : [];
  const tickerBySymbol = new Map(tickerRows.map((row) => [row.symbol, row]));
  const quotes = marketQuoteSymbols.map((symbol) => {
    const ticker = tickerBySymbol.get(symbol) || {};
    const price = Number(ticker.lastPrice || priceMap.get(symbol) || 0);
    const openPrice = Number(ticker.openPrice || 0);
    const priceChange = Number(ticker.priceChange || (openPrice ? price - openPrice : 0));
    const priceChangePercent = Number(ticker.priceChangePercent || 0);
    return {
      symbol,
      baseAsset: symbol.replace("USDT", ""),
      quoteAsset: "USDT",
      price,
      openPrice,
      highPrice: Number(ticker.highPrice || 0),
      lowPrice: Number(ticker.lowPrice || 0),
      volume: Number(ticker.volume || 0),
      quoteVolume: Number(ticker.quoteVolume || 0),
      priceChange,
      priceChangePercent,
      updatedAt: new Date().toISOString()
    };
  });
  const data = {
    btcUsdt: priceMap.get("BTCUSDT") || 0,
    priceMap,
    quotes
  };
  marketCache = {
    fetchedAt: now,
    data
  };
  return data;
}

async function fetchKlines(symbol, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 720), 1000));
  const params = {
    symbol,
    interval: options.interval || "1h",
    limit
  };
  if (options.startTime) params.startTime = options.startTime;
  if (options.endTime) params.endTime = options.endTime;
  const payload = await binancePublicGet(options.endpoint || "/api/v3/klines", params, options.baseUrl || config.baseUrl);
  return (Array.isArray(payload) ? payload : [])
    .map((row) => normalizeKline(row))
    .filter(Boolean);
}

async function fetchKlinesWindow(symbol, options = {}) {
  const intervalMs = 60 * 60 * 1000;
  const endTime = Number(options.endTime || Date.now());
  const startTime = Number(options.startTime || endTime - 30 * 24 * intervalMs);
  const maxCandles = Math.max(1, Math.min(Number(options.maxCandles || 24 * 30), 24 * 365 + 4));
  const rows = [];
  const seen = new Set();
  let cursor = startTime;
  while (cursor <= endTime && rows.length < maxCandles) {
    const batch = await fetchKlines(symbol, {
      ...options,
      startTime: cursor,
      endTime,
      limit: Math.min(1000, maxCandles - rows.length)
    });
    if (!batch.length) break;
    for (const row of batch) {
      if (seen.has(row.openTime)) continue;
      seen.add(row.openTime);
      rows.push(row);
    }
    const lastOpenTime = Number(batch.at(-1)?.openTime || 0);
    if (!lastOpenTime || lastOpenTime < cursor) break;
    cursor = lastOpenTime + intervalMs;
    if (batch.length < 1000) break;
  }
  return rows
    .filter((row) => row.openTime >= startTime && row.openTime <= endTime)
    .slice(-maxCandles);
}

function normalizeKline(row) {
  if (!Array.isArray(row) || row.length < 6) return null;
  const openTime = Number(row[0] || 0);
  const closeTime = Number(row[6] || 0);
  return {
    openTime,
    closeTime,
    timestamp: new Date(openTime).toISOString(),
    closeTimestamp: closeTime ? new Date(closeTime).toISOString() : null,
    open: Number(row[1] || 0),
    high: Number(row[2] || 0),
    low: Number(row[3] || 0),
    close: Number(row[4] || 0),
    volume: Number(row[5] || 0),
    quoteVolume: Number(row[7] || 0),
    tradeCount: Number(row[8] || 0)
  };
}

async function fetchCnyRate() {
  const now = Date.now();
  if (fiatRateCache.data && now - fiatRateCache.fetchedAt < config.fiatRateCacheTtlMs) {
    return fiatRateCache.data;
  }

  if (config.cnyPerUsdt > 0) {
    const data = {
      symbol: "USDT/CNY",
      rate: config.cnyPerUsdt,
      source: "env",
      updatedAt: new Date().toISOString()
    };
    fiatRateCache = { fetchedAt: now, data };
    return data;
  }

  try {
    const payload = await fetchJson(config.cnyRateUrl);
    const rate = Number(payload?.rates?.CNY || payload?.conversion_rates?.CNY || 0);
    if (rate > 0) {
      const data = {
        symbol: "USDT/CNY",
        rate,
        source: "market",
        updatedAt: new Date().toISOString()
      };
      fiatRateCache = { fetchedAt: now, data };
      return data;
    }
  } catch (error) {
    // Keep the dashboard usable when the public FX endpoint is unavailable.
  }

  const data = {
    symbol: "USDT/CNY",
    rate: config.fallbackCnyPerUsdt,
    source: "fallback",
    updatedAt: new Date().toISOString()
  };
  fiatRateCache = { fetchedAt: now, data };
  return data;
}

async function fetchCoinMFuturesExchangeInfo() {
  const payload = await binancePublicGet("/dapi/v1/exchangeInfo", {}, config.dapiBaseUrl);
  const symbols = Array.isArray(payload.symbols) ? payload.symbols : [];
  return new Map(
    symbols.map((row) => [
      row.symbol,
      {
        contractSize: Number(row.contractSize || 0),
        marginAsset: row.marginAsset || row.baseAsset || "",
        baseAsset: row.baseAsset || "",
        quoteAsset: row.quoteAsset || "USD"
      }
    ])
  );
}

async function fetchOptional(label, fn) {
  try {
    const data = await fn();
    return {
      label,
      ok: true,
      data
    };
  } catch (error) {
    return {
      label,
      ok: false,
      error: {
        code: error.code || "BINANCE_ERROR",
        message: error.message,
        statusCode: error.statusCode || 500
      }
    };
  }
}

function errorToPayload(error) {
  if (!error) return null;
  return {
    code: error.code || "SERVER_ERROR",
    message: error.message || "Request failed.",
    statusCode: error.statusCode || 500,
    details: error.details || error.payload || error.error || null
  };
}

function staleCachedPayload(cache, reason, error) {
  if (!cache?.data) return null;
  return {
    ...cache.data,
    stale: true,
    staleReason: reason,
    servedAt: new Date().toISOString(),
    cacheFetchedAt: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    cacheAgeMs: cache.fetchedAt ? Date.now() - cache.fetchedAt : null,
    lastError: errorToPayload(error)
  };
}

function staleSummaryFromLatestSnapshot(reason, error) {
  const rawSnapshot = (store.snapshots || [])
    .slice()
    .reverse()
    .find((item) => isUsablePerformanceSnapshot(item) && Number(item.totals?.allAccountsTotalAssetUsdt || 0) > 0);
  const snapshot = rawSnapshot
    ? manualAccountsEnabled()
      ? withHistoricalManualAccounts(rawSnapshot)
      : withoutManualSnapshotEntities(rawSnapshot)
    : null;
  if (!snapshot) return null;

  const quote = snapshot.quote || {};
  const totals = snapshot.totals || {};
  const btcUsdt =
    Number(quote.price || 0) ||
    (Number(totals.allAccountsTotalAssetBtc || 0) > 0
      ? Number(totals.allAccountsTotalAssetUsdt || 0) / Number(totals.allAccountsTotalAssetBtc || 0)
      : 0);
  const fiat = quote.fiat || fiatRateCache.data || {
    symbol: "CNY",
    rate: config.fallbackCnyPerUsdt,
    source: "fallback",
    updatedAt: snapshot.timestamp
  };
  const entities = (snapshot.entities || []).map((entity) => ({
    ...entity,
    tags: tagsForAccount(entity.id || entity.email)
  }));
  const accounts = entities
    .filter((entity) => entity.type === "sub")
    .map((entity) => {
      const sats = decimalToUnits(entity.equityBtc || "0", 8);
      const mode = inferSubAccountMode({
        email: entity.email || entity.id,
        remark: entity.remark || ""
      });
      return {
        email: entity.email || entity.id,
        remark: entity.remark || "",
        tags: entity.tags || [],
        accountMode: mode.mode,
        accountModeLabel: mode.label,
        accountModeSource: mode.source,
        isFreeze: false,
        isManagedSubAccount: false,
        isAssetManagementSubAccount: false,
        listed: true,
        hasSpotSummary: true,
        hasMarginSummary: true,
        hasUsdMFuturesSummary: true,
        hasCoinMFuturesSummary: true,
        spotAssetBtc: "0.00000000",
        marginAssetBtc: "0.00000000",
        usdMFuturesAssetBtc: "0.00000000",
        coinMFuturesAssetBtc: "0.00000000",
        totalAssetBtc: unitsToDecimal(sats, 8),
        totalAssetSats: sats.toString(),
        totalAssetUsdt: Number(entity.equityUsdt || 0)
      };
    })
    .sort((a, b) => compareBigIntDesc(BigInt(a.totalAssetSats), BigInt(b.totalAssetSats)));
  const distribution = entities
    .map((entity) => {
      const sats = decimalToUnits(entity.equityBtc || "0", 8);
      return {
        accountType: entity.type || "account",
        label: entity.label || entity.email || entity.id,
        totalAssetSats: sats.toString(),
        totalAssetBtc: unitsToDecimal(sats, 8),
        totalAssetUsdt: Number(entity.equityUsdt || 0),
        source: "snapshot"
      };
    })
    .sort((a, b) => compareBigIntDesc(BigInt(a.totalAssetSats), BigInt(b.totalAssetSats)));

  return {
    generatedAt: snapshot.timestamp,
    stale: true,
    staleReason: reason,
    snapshotFallback: true,
    servedAt: new Date().toISOString(),
    cacheFetchedAt: null,
    cacheAgeMs: Date.now() - Date.parse(snapshot.timestamp),
    lastError: errorToPayload(error),
    quote: {
      symbol: quote.symbol || "BTCUSDT",
      price: btcUsdt,
      markets: quote.markets || [],
      fiat
    },
    features: {
      manualAccountsEnabled: manualAccountsEnabled()
    },
    coverage: hydrateSnapshotCoverage(snapshot.coverage || []),
    totals,
    accounts,
    manualAccounts: [],
    entities,
    distribution,
    apiUsed: ["local snapshot fallback"]
  };
}

function hydrateSnapshotCoverage(coverage) {
  return coverage.map((item) => ({
    ...item,
    scope: item.scope || (String(item.key || "").startsWith("master") ? "master" : "sub-accounts")
  }));
}

function requiredCoverageFailures(payload) {
  return (payload?.coverage || []).filter((item) => isRequiredCoverageFailure(item, payload));
}

function buildCoverageIncompleteError(code, message, failures) {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = code;
  error.details = failures.map((item) => ({
    key: item.key,
    label: item.label,
    scope: item.scope || null,
    error: item.error || null
  }));
  return error;
}

function isRetryableLiveFetchError(error) {
  const statusCode = Number(error?.statusCode || 0);
  if (statusCode === 404 && String(error?.code || "") === "BINANCE_ERROR") return true;
  if (statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429) return true;
  return statusCode >= 500;
}

function historicalEquitySourceHasValue(key) {
  const fingerprint = `${(store.snapshots || []).length}:${store.lastSnapshotAt || ""}`;
  const cached = equitySourcePresenceCache.get(key);
  if (cached?.fingerprint === fingerprint) return cached.value;
  const value = (store.snapshots || []).some((snapshot) => equitySourceValue(snapshot, key) > 0);
  equitySourcePresenceCache.set(key, { fingerprint, value });
  return value;
}

function equitySourceValue(snapshot, key) {
  if (!snapshot?.totals) return 0;
  if (key === "masterSimpleEarn") {
    return Math.max(
      Number(snapshot.totals.masterSimpleEarnAssetUsdt || 0),
      Number(snapshot.totals.masterSimpleEarnAssetBtc || 0)
    );
  }
  if (key === "masterFunding") {
    return Math.max(
      Number(snapshot.totals.masterFundingAssetUsdt || 0),
      Number(snapshot.totals.masterFundingAssetBtc || 0)
    );
  }
  return 0;
}

function isHistoricallyContributingOptionalSourceFailure(item) {
  if (!item || item.ok || !item.optional) return false;
  if (item.usedForEquity === true) return true;
  if (item.key === "masterSimpleEarn") return historicalEquitySourceHasValue("masterSimpleEarn");
  if (item.key === "masterFunding") return historicalEquitySourceHasValue("masterFunding");
  return false;
}

async function buildSummary(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && summaryCache.data && now - summaryCache.fetchedAt < config.cacheTtlMs) {
    return summaryCache.data;
  }

  const [
    subAccounts,
    spotSummary,
    marketPrices,
    subMarginResult,
    subUsdMFuturesResult,
    subCoinMFuturesResult,
    masterMarginResult,
    masterUsdMFuturesResult,
    masterCoinMFuturesResult,
    masterPortfolioMarginResult,
    masterPortfolioMarginV2Result,
    masterSimpleEarnResult,
    masterFundingResult
  ] = await Promise.all([
    fetchAllSubAccounts(),
    fetchSpotSummaryPages(),
    fetchMarketPrices(),
    fetchOptional("Sub-account margin summary", fetchMarginSummary),
    fetchOptional("Sub-account USD-M futures summary", () => fetchFuturesSummaryPages(1)),
    fetchOptional("Sub-account COIN-M futures summary", () => fetchFuturesSummaryPages(2)),
    fetchOptional("Master margin account", fetchMasterMarginAccount),
    fetchOptional("Master USD-M futures account", fetchMasterUsdMFuturesAccount),
    fetchOptional("Master COIN-M futures account", fetchMasterCoinMFuturesAccount),
    fetchOptional("Master Portfolio Margin account", fetchMasterPortfolioMarginAccount),
    fetchOptional("Master Portfolio Margin account V2", fetchMasterPortfolioMarginAccountV2),
    fetchOptional("Master Simple Earn account", fetchMasterSimpleEarnAccount),
    fetchOptional("Master Funding wallet", fetchMasterFundingAssets)
  ]);
  const { btcUsdt, priceMap } = marketPrices;
  const cnyRate = await fetchCnyRate();

  const listByEmail = new Map(
    subAccounts.map((account) => [String(account.email || "").toLowerCase(), account])
  );
  const spotByEmail = new Map(
    spotSummary.spotSubUserAssetBtcVoList.map((row) => [
      String(row.email || "").toLowerCase(),
      row
    ])
  );
  const marginByEmail = new Map(
    getSubAccountList(subMarginResult.data, "marginSubAccountList").map((row) => [
      String(row.email || "").toLowerCase(),
      row
    ])
  );
  const usdMFuturesByEmail = new Map(
    getSubAccountList(subUsdMFuturesResult.data, "subAccountList").map((row) => [
      String(row.email || "").toLowerCase(),
      row
    ])
  );
  const coinMFuturesByEmail = new Map(
    getSubAccountList(subCoinMFuturesResult.data, "subAccountList").map((row) => [
      String(row.email || "").toLowerCase(),
      row
    ])
  );
  const allEmails = new Set([
    ...listByEmail.keys(),
    ...spotByEmail.keys(),
    ...marginByEmail.keys(),
    ...usdMFuturesByEmail.keys(),
    ...coinMFuturesByEmail.keys()
  ]);

  let accounts = Array.from(allEmails)
    .filter(Boolean)
    .map((emailKey) => {
      const listed = listByEmail.get(emailKey) || {};
      const spot = spotByEmail.get(emailKey) || {};
      const margin = marginByEmail.get(emailKey) || {};
      const usdMFutures = usdMFuturesByEmail.get(emailKey) || {};
      const coinMFutures = coinMFuturesByEmail.get(emailKey) || {};
      const spotSats = decimalToUnits(spot.totalAsset || "0", 8);
      const marginSats = decimalToUnits(margin.totalAssetOfBtc || "0", 8);
      const usdMFuturesSats = usdtToBtcUnits(usdMFutures.totalMarginBalance || "0", btcUsdt);
      const coinMFuturesSats = decimalToUnits(
        coinMFutures.totalMarginBalanceOfBTC || coinMFutures.totalMarginBalance || "0",
        8
      );
      const officialSats = spotSats + marginSats + usdMFuturesSats + coinMFuturesSats;
      const accountMode = inferSubAccountMode({
        email: spot.email || listed.email || emailKey,
        remark: listed.remark || ""
      });
      const email = spot.email || listed.email || emailKey;

      return {
        email,
        remark: listed.remark || "",
        tags: tagsForAccount(email),
        accountMode: accountMode.mode,
        accountModeLabel: accountMode.label,
        accountModeSource: accountMode.source,
        isFreeze: Boolean(listed.isFreeze),
        isManagedSubAccount: Boolean(listed.isManagedSubAccount),
        isAssetManagementSubAccount: Boolean(listed.isAssetManagementSubAccount),
        listed: Boolean(listByEmail.get(emailKey)),
        hasSpotSummary: Boolean(spotByEmail.get(emailKey)),
        hasMarginSummary: Boolean(marginByEmail.get(emailKey)),
        hasUsdMFuturesSummary: Boolean(usdMFuturesByEmail.get(emailKey)),
        hasCoinMFuturesSummary: Boolean(coinMFuturesByEmail.get(emailKey)),
        spotAssetBtc: unitsToDecimal(spotSats, 8),
        marginAssetBtc: unitsToDecimal(marginSats, 8),
        usdMFuturesAssetBtc: unitsToDecimal(usdMFuturesSats, 8),
        coinMFuturesAssetBtc: unitsToDecimal(coinMFuturesSats, 8),
        totalAssetBtc: unitsToDecimal(officialSats, 8),
        totalAssetSats: officialSats.toString(),
        totalAssetUsdt: unitsToNumber(officialSats, 8) * btcUsdt
      };
    })
    .sort((a, b) => compareBigIntDesc(BigInt(a.totalAssetSats), BigInt(b.totalAssetSats)));
  const subAccountDirectFuturesResult = await buildSummaryDirectFuturesCheck(accounts, priceMap, btcUsdt);
  accounts = applySummaryDirectFuturesOverrides(accounts, subAccountDirectFuturesResult.overrides, btcUsdt)
    .sort((a, b) => compareBigIntDesc(BigInt(a.totalAssetSats), BigInt(b.totalAssetSats)));

  const masterSpotSats = decimalToUnits(spotSummary.masterAccountTotalAsset || "0", 8);
  const masterMarginSats = masterMarginResult.ok
    ? decimalToUnits(masterMarginResult.data.totalNetAssetOfBtc || "0", 8)
    : 0n;
  const masterUsdMFuturesSats = masterUsdMFuturesResult.ok
    ? usdtToBtcUnits(masterUsdMFuturesResult.data.totalMarginBalance || "0", btcUsdt)
    : 0n;
  const masterCoinMFuturesSats = masterCoinMFuturesResult.ok
    ? coinMFuturesAccountToBtcUnits(masterCoinMFuturesResult.data, priceMap, btcUsdt)
    : 0n;
  const masterSimpleEarnSats = masterSimpleEarnResult.ok
    ? simpleEarnAccountToBtcUnits(masterSimpleEarnResult.data, btcUsdt)
    : 0n;
  const masterFundingSats = masterFundingResult.ok
    ? fundingWalletToBtcUnits(masterFundingResult.data, priceMap, btcUsdt)
    : 0n;
  const masterSimpleEarnExpectedForEquity = masterSimpleEarnResult.ok
    ? masterSimpleEarnSats > 0n
    : historicalEquitySourceHasValue("masterSimpleEarn");
  const masterFundingExpectedForEquity = masterFundingResult.ok
    ? masterFundingSats > 0n
    : historicalEquitySourceHasValue("masterFunding");
  const masterClassicSats =
    masterSpotSats + masterMarginSats + masterUsdMFuturesSats + masterCoinMFuturesSats;
  const masterPortfolioSats = masterPortfolioMarginV2Result.ok
    ? portfolioMarginAccountToBtcUnits(masterPortfolioMarginV2Result.data, priceMap, btcUsdt)
    : masterPortfolioMarginResult.ok
      ? portfolioMarginAccountToBtcUnits(masterPortfolioMarginResult.data, priceMap, btcUsdt)
      : 0n;
  const masterPortfolioAvailable = masterPortfolioMarginV2Result.ok || masterPortfolioMarginResult.ok;
  const masterClassicIncomplete =
    !masterMarginResult.ok || !masterUsdMFuturesResult.ok || !masterCoinMFuturesResult.ok;
  const shouldUseMasterPortfolio =
    masterPortfolioAvailable && (masterPortfolioSats > 0n || masterClassicIncomplete);
  const masterAccountMode = shouldUseMasterPortfolio ? "unified" : "standard";
  const masterSats =
    (shouldUseMasterPortfolio ? masterPortfolioSats : masterClassicSats) + masterSimpleEarnSats + masterFundingSats;
  const subAccountsSats = accounts.reduce(
    (total, account) => total + BigInt(account.totalAssetSats),
    0n
  );
  const manualEntities = manualAccountEntities(cnyRate, marketPrices, new Date());
  const manualAccountsSats = manualAccountsTotalSats(manualEntities);
  const totalSats = masterSats + subAccountsSats + manualAccountsSats;
  const nonZeroAccounts = accounts.filter((account) => BigInt(account.totalAssetSats) > 0n).length;

  const distribution = [
    {
      accountType: "master",
      label: "Master account",
      totalAssetSats: masterSats.toString(),
      totalAssetBtc: unitsToDecimal(masterSats, 8),
      totalAssetUsdt: unitsToNumber(masterSats, 8) * btcUsdt
    },
    ...accounts.map((account) => ({
      accountType: "sub",
      label: account.email,
      totalAssetSats: account.totalAssetSats,
      totalAssetBtc: account.totalAssetBtc,
      totalAssetUsdt: account.totalAssetUsdt
    })),
    ...manualAccountDistributionRows(manualEntities, btcUsdt)
  ].sort((a, b) => compareBigIntDesc(BigInt(a.totalAssetSats), BigInt(b.totalAssetSats)));

  const data = {
    generatedAt: new Date().toISOString(),
    quote: {
      symbol: "BTCUSDT",
      price: btcUsdt,
      markets: marketPrices.quotes,
      fiat: cnyRate
    },
    features: {
      manualAccountsEnabled: manualAccountsEnabled()
    },
    coverage: [
      {
        key: "spot",
        label: "Spot",
        ok: true,
        scope: "master + sub-accounts",
        endpoint: "GET /sapi/v1/sub-account/spotSummary"
      },
      {
        key: "subMargin",
        label: "Sub Margin",
        ok: subMarginResult.ok,
        scope: "sub-accounts",
        endpoint: "GET /sapi/v1/sub-account/margin/accountSummary",
        error: subMarginResult.error
      },
      {
        key: "subUsdMFutures",
        label: "Sub USD-M Futures",
        ok: subUsdMFuturesResult.ok,
        scope: "sub-accounts",
        endpoint: "GET /sapi/v2/sub-account/futures/accountSummary?futuresType=1",
        error: subUsdMFuturesResult.error
      },
      {
        key: "subCoinMFutures",
        label: "Sub COIN-M Futures",
        ok: subCoinMFuturesResult.ok,
        scope: "sub-accounts",
        endpoint: "GET /sapi/v2/sub-account/futures/accountSummary?futuresType=2",
        error: subCoinMFuturesResult.error
      },
      {
        key: "subDirectFuturesCrossCheck",
        label: "Sub Direct Futures Cross-check",
        ok: subAccountDirectFuturesResult.ok,
        scope: "sub-accounts",
        endpoint: "GET /sapi/v2/sub-account/futures/account",
        optional: subAccountDirectFuturesResult.candidateCount === 0,
        usedForEquity: subAccountDirectFuturesResult.overrideCount > 0,
        note: subAccountDirectFuturesResult.overrideCount > 0
          ? `聚合合约汇总疑似漏算，已用逐账户合约权益修正 ${subAccountDirectFuturesResult.overrideCount} 个子账户。`
          : "用于校验聚合合约汇总是否把有合约权益的子账户报成 0。",
        error: subAccountDirectFuturesResult.error
      },
      {
        key: "masterMargin",
        label: "Master Margin",
        ok: masterMarginResult.ok || shouldUseMasterPortfolio,
        scope: "master",
        endpoint: shouldUseMasterPortfolio ? "GET /papi/v1/account or /papi/v2/account" : "GET /sapi/v1/margin/account",
        error: shouldUseMasterPortfolio ? null : masterMarginResult.error
      },
      {
        key: "masterUsdMFutures",
        label: "Master USD-M Futures",
        ok: masterUsdMFuturesResult.ok || shouldUseMasterPortfolio,
        scope: "master",
        endpoint: shouldUseMasterPortfolio ? "GET /papi/v1/account or /papi/v2/account" : "GET /fapi/v3/account",
        error: shouldUseMasterPortfolio ? null : masterUsdMFuturesResult.error
      },
      {
        key: "masterCoinMFutures",
        label: "Master COIN-M Futures",
        ok: masterCoinMFuturesResult.ok || shouldUseMasterPortfolio,
        scope: "master",
        endpoint: shouldUseMasterPortfolio ? "GET /papi/v1/account or /papi/v2/account" : "GET /dapi/v1/account",
        error: shouldUseMasterPortfolio ? null : masterCoinMFuturesResult.error
      },
      {
        key: "masterPortfolioMargin",
        label: "Master Portfolio Margin",
        ok: shouldUseMasterPortfolio || masterPortfolioMarginResult.ok || masterPortfolioMarginV2Result.ok,
        scope: "master",
        endpoint: "GET /papi/v1/account, GET /papi/v2/account",
        optional: !shouldUseMasterPortfolio,
        usedForEquity: shouldUseMasterPortfolio,
        note: shouldUseMasterPortfolio
          ? "母账户为统一账户，已使用 Portfolio Margin 权益作为母账户净值。"
          : "仅母账户为统一账户时需要；普通母账户这里失败可以忽略。",
        error: masterPortfolioMarginV2Result.error || masterPortfolioMarginResult.error
      },
      {
        key: "masterSimpleEarn",
        label: "Master Simple Earn",
        ok: masterSimpleEarnResult.ok,
        scope: "master",
        endpoint: "GET /sapi/v1/simple-earn/account",
        optional: true,
        usedForEquity: masterSimpleEarnExpectedForEquity,
        note: masterSimpleEarnResult.ok
          ? masterSimpleEarnSats > 0n
            ? "已把母账户 Simple Earn 理财余额并入母账户净值。"
            : "接口可用，当前母账户 Simple Earn 理财余额为 0。"
          : masterSimpleEarnExpectedForEquity
            ? "历史采样中 Simple Earn 有余额，本次接口失败会被视为净值采样不完整。"
            : "母账户没有开通理财、权限不足或接口暂不可用时，这里失败不影响其他账户统计。",
        error: masterSimpleEarnResult.error
      },
      {
        key: "masterFunding",
        label: "Master Funding / Pay Wallet",
        ok: masterFundingResult.ok,
        scope: "master",
        endpoint: "POST /sapi/v1/asset/get-funding-asset",
        optional: true,
        usedForEquity: masterFundingExpectedForEquity,
        note: masterFundingResult.ok
          ? masterFundingSats > 0n
            ? "已把母账户 Funding/Pay 钱包余额并入母账户净值。"
            : "接口可用，当前母账户 Funding/Pay 钱包余额为 0。"
          : masterFundingExpectedForEquity
            ? "历史采样中 Funding/Pay 钱包有余额，本次接口失败会被视为净值采样不完整。"
            : "母账户没有 Funding/Pay 钱包余额、权限不足或接口暂不可用时，这里失败不影响其他账户统计。",
        error: masterFundingResult.error
      }
    ],
    totals: {
      masterAccountTotalAssetBtc: unitsToDecimal(masterSats, 8),
      masterAccountTotalAssetUsdt: unitsToNumber(masterSats, 8) * btcUsdt,
      masterSpotAssetBtc: unitsToDecimal(masterSpotSats, 8),
      masterMarginAssetBtc: unitsToDecimal(shouldUseMasterPortfolio ? 0n : masterMarginSats, 8),
      masterUsdMFuturesAssetBtc: unitsToDecimal(shouldUseMasterPortfolio ? 0n : masterUsdMFuturesSats, 8),
      masterCoinMFuturesAssetBtc: unitsToDecimal(shouldUseMasterPortfolio ? 0n : masterCoinMFuturesSats, 8),
      masterPortfolioMarginAssetBtc: unitsToDecimal(shouldUseMasterPortfolio ? masterPortfolioSats : 0n, 8),
      masterSimpleEarnAssetBtc: unitsToDecimal(masterSimpleEarnSats, 8),
      masterSimpleEarnAssetUsdt: unitsToNumber(masterSimpleEarnSats, 8) * btcUsdt,
      masterSimpleEarnAssetCny: unitsToNumber(masterSimpleEarnSats, 8) * btcUsdt * cnyRate.rate,
      masterFundingAssetBtc: unitsToDecimal(masterFundingSats, 8),
      masterFundingAssetUsdt: unitsToNumber(masterFundingSats, 8) * btcUsdt,
      masterFundingAssetCny: unitsToNumber(masterFundingSats, 8) * btcUsdt * cnyRate.rate,
      masterAccountMode,
      subAccountsTotalAssetBtc: unitsToDecimal(subAccountsSats, 8),
      subAccountsTotalAssetUsdt: unitsToNumber(subAccountsSats, 8) * btcUsdt,
      manualAccountsTotalAssetBtc: unitsToDecimal(manualAccountsSats, 8),
      manualAccountsTotalAssetUsdt: unitsToNumber(manualAccountsSats, 8) * btcUsdt,
      manualAccountsTotalAssetCny: unitsToNumber(manualAccountsSats, 8) * btcUsdt * cnyRate.rate,
      allAccountsTotalAssetBtc: unitsToDecimal(totalSats, 8),
      allAccountsTotalAssetUsdt: unitsToNumber(totalSats, 8) * btcUsdt,
      masterAccountTotalAssetCny: unitsToNumber(masterSats, 8) * btcUsdt * cnyRate.rate,
      subAccountsTotalAssetCny: unitsToNumber(subAccountsSats, 8) * btcUsdt * cnyRate.rate,
      allAccountsTotalAssetCny: unitsToNumber(totalSats, 8) * btcUsdt * cnyRate.rate,
      totalSubAccountsListed: subAccounts.length,
      totalSubAccountsInSpotSummary: spotSummary.totalCount,
      nonZeroSubAccounts: nonZeroAccounts,
      manualAccountCount: manualEntities.length
    },
    accounts,
    manualAccounts: manualAccountsEnabled() ? manualAccountsPayload(cnyRate, marketPrices).accounts : [],
    entities: [...buildEntities(masterSats, accounts, btcUsdt), ...manualEntities],
    distribution,
    apiUsed: [
      "GET /sapi/v1/sub-account/list",
      "GET /sapi/v1/sub-account/spotSummary",
      "GET /sapi/v1/sub-account/margin/accountSummary",
      "GET /sapi/v2/sub-account/futures/accountSummary",
      "GET /sapi/v1/sub-account/universalTransfer",
      "GET /sapi/v1/sub-account/sub/transfer/history",
      "GET /sapi/v1/capital/deposit/hisrec",
      "GET /sapi/v1/capital/withdraw/history",
      "GET /sapi/v1/pay/transactions",
      "GET /sapi/v1/margin/account",
      "GET /fapi/v3/account",
      "GET /dapi/v1/account",
      "GET /papi/v1/account",
      "GET /papi/v2/account",
      "GET /sapi/v1/simple-earn/account",
      "POST /sapi/v1/asset/get-funding-asset",
      "GET /api/v3/ticker/price",
      "GET /api/v3/ticker/24hr"
    ]
  };

  const failures = requiredCoverageFailures(data);
  if (failures.length) {
    const error = buildCoverageIncompleteError(
      "SUMMARY_COVERAGE_INCOMPLETE",
      `Live summary rejected because required data sources failed: ${failures
        .map((item) => item.label || item.key)
        .join(", ")}.`,
      failures
    );
    const stale = staleCachedPayload(summaryCache, "SUMMARY_COVERAGE_INCOMPLETE", error);
    if (stale) return stale;
    throw error;
  }

  summaryCache = {
    fetchedAt: now,
    data
  };
  return data;
}

async function buildPositions(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && positionsCache.data && now - positionsCache.fetchedAt < config.cacheTtlMs) {
    return positionsCache.data;
  }

  const [subAccountsResult, tradingStatsResult, marketPrices, coinMContractInfoResult] = await Promise.all([
    fetchOptional("Sub-account list", fetchAllSubAccounts),
    buildTradingStats(false).catch((error) => ({
      generatedAt: new Date().toISOString(),
      accounts: [],
      error: {
        code: error.code || "TRADING_STATS_ERROR",
        message: error.message,
        statusCode: error.statusCode || 500
      }
    })),
    fetchMarketPrices(),
    fetchOptional("COIN-M futures exchange info", fetchCoinMFuturesExchangeInfo)
  ]);
  if (!subAccountsResult.ok) throwSubAccountListError(subAccountsResult.error);
  const subAccounts = subAccountsResult.data;
  const { btcUsdt, priceMap } = marketPrices;
  const cnyRate = await fetchCnyRate();
  const coinMContractInfo = coinMContractInfoResult.ok ? coinMContractInfoResult.data : new Map();
  const tradingByAccount = new Map(
    (tradingStatsResult.accounts || []).map((account) => [
      normalizeEntityId(account.email),
      {
        lastTradeAt: account.lastTradeAt,
        lastTradeDate: account.lastTradeDate,
        tradingVolumeUsdt30d: account.totalVolumeUsdt30d || 0
      }
    ])
  );
  let accounts = await mapLimit(subAccounts, 4, (account) =>
    buildSubAccountPositions(account, priceMap, btcUsdt, coinMContractInfo)
  );
  accounts = await retryIncompletePositionAccounts(accounts, subAccounts, priceMap, btcUsdt, coinMContractInfo);
  const positionFailures = requiredPositionCoverageFailures(accounts);
  if (positionFailures.length) {
    const error = buildPositionsIncompleteError(positionFailures);
    const stale = staleCachedPayload(positionsCache, "POSITIONS_COVERAGE_INCOMPLETE", error);
    if (stale) return stale;
    throw error;
  }

  const rows = accounts
    .flatMap((account) => [
      ...account.assets.map((row) => ({
        ...row,
        accountEmail: account.email,
        remark: account.remark,
        tags: account.tags,
        accountMode: account.accountMode,
        accountModeLabel: account.accountModeLabel,
        accountModeSource: account.accountModeSource
      })),
      ...account.contracts.map((row) => ({
        ...row,
        accountEmail: account.email,
        remark: account.remark,
        tags: account.tags,
        accountMode: account.accountMode,
        accountModeLabel: account.accountModeLabel,
        accountModeSource: account.accountModeSource
      }))
    ])
    .sort((a, b) => Math.abs(Number(b.usdtValue || 0)) - Math.abs(Number(a.usdtValue || 0)));

  const accountSummaries = accounts
    .map((account) => {
      const contractNotionalUsdt = account.contracts.reduce(
        (sum, row) => sum + Math.abs(Number(row.notionalUsdt || 0)),
        0
      );
      const unrealizedPnlUsdt = account.contracts.reduce(
        (sum, row) => sum + Number(row.unrealizedPnlUsdt || 0),
        0
      );
      return {
        email: account.email,
        remark: account.remark,
        tags: account.tags,
        accountMode: account.accountMode,
        accountModeLabel: account.accountModeLabel,
        accountModeSource: account.accountModeSource,
        lastTradeAt: tradingByAccount.get(normalizeEntityId(account.email))?.lastTradeAt || null,
        lastTradeDate: tradingByAccount.get(normalizeEntityId(account.email))?.lastTradeDate || null,
        tradingVolumeUsdt30d: roundNumber(
          tradingByAccount.get(normalizeEntityId(account.email))?.tradingVolumeUsdt30d || 0
        ),
        isFreeze: account.isFreeze,
        listed: account.listed,
        totalAssetUsdt: roundNumber(account.totalAssetUsdt),
        spotUsdt: roundNumber(account.spotUsdt),
        marginUsdt: roundNumber(account.marginUsdt),
        futuresUsdt: roundNumber(account.futuresUsdt),
        contractCount: account.contracts.length,
        contractNotionalUsdt: roundNumber(contractNotionalUsdt),
        unrealizedPnlUsdt: roundNumber(unrealizedPnlUsdt),
        pnlPct: roundNumber(contractNotionalUsdt ? (unrealizedPnlUsdt / contractNotionalUsdt) * 100 : 0),
        coverage: account.coverage
      };
    })
    .sort((a, b) => b.totalAssetUsdt - a.totalAssetUsdt);

  const coverage = buildPositionsCoverage(accounts);
  coverage.push({
    key: "coinMExchangeInfo",
    label: "COIN-M Contract Info",
    ok: coinMContractInfoResult.ok,
    successCount: coinMContractInfoResult.ok ? 1 : 0,
    emptyCount: 0,
    failureCount: coinMContractInfoResult.ok ? 0 : 1,
    errors: coinMContractInfoResult.error ? [coinMContractInfoResult.error] : []
  });
  const totals = {
    accountCount: accounts.length,
    okAccountCount: accounts.filter((account) => account.coverage.every((item) => item.ok)).length,
    assetRowCount: rows.filter((row) => row.kind === "asset").length,
    contractRowCount: rows.filter((row) => row.kind === "contract").length,
    nonDustAssetRowCount: rows.filter((row) => row.kind === "asset" && Number(row.usdtValue || 0) >= 0.01).length,
    totalAssetUsdt: roundNumber(accounts.reduce((sum, account) => sum + account.totalAssetUsdt, 0)),
    openContractNotionalUsdt: roundNumber(
      rows
        .filter((row) => row.kind === "contract")
        .reduce((sum, row) => sum + Math.abs(Number(row.notionalUsdt || row.usdtValue || 0)), 0)
    ),
    unrealizedPnlUsdt: roundNumber(
      rows
        .filter((row) => row.kind === "contract")
        .reduce((sum, row) => sum + Number(row.unrealizedPnlUsdt || 0), 0)
    )
  };

  const data = {
    generatedAt: new Date().toISOString(),
    quote: {
      symbol: "BTCUSDT",
      price: btcUsdt,
      markets: marketPrices.quotes,
      fiat: cnyRate
    },
    totals,
    coverage,
    accounts: accountSummaries,
    rows,
    apiUsed: [
      "GET /sapi/v1/sub-account/list",
      "GET /sapi/v4/sub-account/assets",
      "GET /sapi/v1/sub-account/margin/account",
      "GET /sapi/v2/sub-account/futures/account",
      "GET /sapi/v2/sub-account/futures/positionRisk",
      "GET /sapi/v1/sub-account/transaction-statistics",
      "GET /api/v3/ticker/price"
    ]
  };

  positionsCache = {
    fetchedAt: now,
    data
  };
  return data;
}

async function buildPositionAssetDetail(assetInput, options = {}) {
  const asset = normalizeExposureAsset(assetInput);
  if (!asset) {
    const error = new Error("资产代码无效。");
    error.statusCode = 400;
    error.code = "INVALID_ASSET";
    throw error;
  }

  const [positions, marketPrices] = await Promise.all([
    buildPositions(Boolean(options.forceRefresh)),
    fetchMarketPrices().catch(() => null)
  ]);
  const klineDays = normalizePositionKlineDays(options.days);
  const rows = (positions.rows || []).filter((row) => positionRowMatchesAsset(row, asset));
  const klineCandidates = positionKlineCandidates(asset, rows, marketPrices?.priceMap);
  const klineErrors = [];
  let klineResult = null;
  let klines = [];
  for (const candidate of klineCandidates) {
    try {
      const endTime = Date.now();
      const candidateKlines = await fetchKlinesWindow(candidate.symbol, {
        endpoint: candidate.endpoint,
        baseUrl: candidate.baseUrl,
        interval: "1h",
        startTime: endTime - klineDays * 24 * 60 * 60 * 1000,
        endTime,
        maxCandles: klineDays * 24 + 4
      });
      if (candidateKlines.length) {
        klines = candidateKlines;
        klineResult = candidate;
        break;
      }
    } catch (error) {
      klineErrors.push({
        source: candidate.source,
        symbol: candidate.symbol,
        code: error.code || "KLINE_ERROR",
        message: error.message,
        statusCode: error.statusCode || 500
      });
    }
  }
  const klineSymbol = klineResult?.symbol || klineCandidates[0]?.symbol || "";
  const klineVenue = klineResult?.label || klineCandidates[0]?.label || "";

  const latestKline = klines.at(-1) || null;
  const totals = aggregatePositionAssetRows(rows, latestKline?.close || 0);
  const accountRows = aggregatePositionAssetAccounts(rows);
  const detailRows = rows
    .slice()
    .sort((a, b) => Math.abs(Number(b.usdtValue || b.notionalUsdt || 0)) - Math.abs(Number(a.usdtValue || a.notionalUsdt || 0)))
    .map((row) => ({
      accountEmail: row.accountEmail,
      remark: row.remark || "",
      tags: row.tags || [],
      venue: row.venue,
      kind: row.kind,
      symbol: row.symbol,
      asset: row.asset,
      positionSide: row.positionSide || "",
      quantity: roundNumber(row.quantity || 0),
      available: roundNumber(row.available || 0),
      locked: roundNumber(row.locked || 0),
      borrowed: roundNumber(row.borrowed || 0),
      entryPrice: roundNumber(row.entryPrice || 0),
      breakEvenPrice: roundNumber(row.breakEvenPrice || 0),
      priceUsdt: roundNumber(row.priceUsdt || 0),
      notionalUsdt: roundNumber(row.notionalUsdt || row.usdtValue || 0),
      usdtValue: roundNumber(row.usdtValue || 0),
      unrealizedPnlUsdt: roundNumber(row.unrealizedPnlUsdt || 0),
      pnlPct: row.pnlPct === null || row.pnlPct === undefined ? null : roundNumber(row.pnlPct || 0),
      leverage: row.leverage || "",
      marginAsset: row.marginAsset || "",
      pnlAsset: row.pnlAsset || ""
    }));

  return {
    generatedAt: new Date().toISOString(),
    asset,
    klineSymbol,
    klineVenue,
    interval: "1h",
    windowDays: klineDays,
    totals,
    accounts: accountRows,
    rows: detailRows,
    klines,
    tradeMarkers: [],
    coverage: [
      {
        key: "positions",
        label: "Current Positions",
        ok: rows.length > 0,
        rowCount: rows.length,
        optional: false
      },
      {
        key: "klines",
        label: `${klineVenue || "Market"} 1h Klines`,
        ok: klines.length > 0,
        symbol: klineSymbol,
        source: klineResult?.source || klineCandidates[0]?.source || "",
        rowCount: klines.length,
        optional: true,
        errors: klineErrors
      },
      {
        key: "tradeHistory",
        label: "Account Trade History",
        ok: false,
        rowCount: 0,
        optional: true,
        note: "当前主账户 API 可覆盖子账户资产和仓位，但没有逐个子账户 B/S 成交点权限；需要额外接入子账户成交导出或子账户 API key。"
      }
    ],
    apiUsed: [
      ...Array.from(new Set(klineCandidates.map((candidate) => `GET ${candidate.endpoint}`))).slice(0, 3),
      "GET /sapi/v4/sub-account/assets",
      "GET /sapi/v1/sub-account/margin/account",
      "GET /sapi/v2/sub-account/futures/positionRisk"
    ]
  };
}

async function buildPositionPnlLeaders(options = {}) {
  const hours = normalizePositionPnlHours(options.hours);
  const forceRefresh = Boolean(options.forceRefresh);
  const cacheKey = `hours:${hours}:min:${config.positionPnlMinExposureUsdt}`;
  const now = Date.now();
  if (
    !forceRefresh &&
    positionPnlLeadersCache.data &&
    positionPnlLeadersCache.key === cacheKey &&
    now - positionPnlLeadersCache.fetchedAt < config.positionPnlCacheTtlMs
  ) {
    return positionPnlLeadersCache.data;
  }

  const [positions, marketPrices] = await Promise.all([
    buildPositions(forceRefresh),
    fetchMarketPrices().catch(() => null)
  ]);
  const priceMap = marketPrices?.priceMap || new Map();
  const groups = positionPnlGroups(positions.rows || []);
  const endTime = Date.now();
  const targetTime = endTime - hours * 60 * 60 * 1000;
  const rows = await mapLimit(groups, 4, (group) =>
    buildPositionPnlLeaderRow(group, {
      priceMap,
      endTime,
      targetTime,
      hours
    })
  );
  const usableRows = rows
    .filter((row) => row && row.ok && Number.isFinite(Number(row.pnlUsdt)))
    .sort((a, b) => Math.abs(Number(b.pnlUsdt || 0)) - Math.abs(Number(a.pnlUsdt || 0)));
  const winners = usableRows
    .filter((row) => Number(row.pnlUsdt || 0) > 0)
    .sort((a, b) => Number(b.pnlUsdt || 0) - Number(a.pnlUsdt || 0))
    .slice(0, 10);
  const losers = usableRows
    .filter((row) => Number(row.pnlUsdt || 0) < 0)
    .sort((a, b) => Number(a.pnlUsdt || 0) - Number(b.pnlUsdt || 0))
    .slice(0, 10);
  const failures = rows.filter((row) => row && !row.ok);
  const data = {
    generatedAt: new Date().toISOString(),
    hours,
    startTime: new Date(targetTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    rowCount: usableRows.length,
    skippedCount: failures.length,
    minExposureUsdt: config.positionPnlMinExposureUsdt,
    totalEstimatedPnlUsdt: roundNumber(usableRows.reduce((sum, row) => sum + Number(row.pnlUsdt || 0), 0)),
    winners,
    losers,
    coverage: [
      {
        key: "currentPositions",
        label: "Current Positions",
        ok: (positions.rows || []).length > 0,
        rowCount: (positions.rows || []).length,
        optional: false
      },
      {
        key: "historicalKlines",
        label: "1h Market Klines",
        ok: usableRows.length > 0,
        rowCount: usableRows.length,
        failureCount: failures.length,
        optional: true,
        errors: failures.slice(0, 12).map((row) => ({
          asset: row.asset,
          symbol: row.klineSymbol || "",
          message: row.error || "K 线不可用"
        }))
      }
    ],
    note: "基于当前持仓数量和过去窗口的 1h K 线估算，不包含窗口内已平仓的逐笔已实现盈亏。",
    apiUsed: [
      "GET /api/positions",
      "GET /api/v3/klines",
      "GET /fapi/v1/klines",
      "GET /dapi/v1/klines"
    ]
  };
  positionPnlLeadersCache = {
    key: cacheKey,
    fetchedAt: now,
    data
  };
  return data;
}

function normalizePositionPnlHours(value) {
  const numeric = Math.floor(Number(value || 24));
  if (!Number.isFinite(numeric)) return 24;
  return Math.max(1, Math.min(720, numeric));
}

function positionPnlGroups(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    if (row.kind !== "asset" && row.kind !== "contract") continue;
    const asset = row.kind === "contract"
      ? contractBaseAsset(row.symbol || row.asset)
      : normalizeExposureAsset(row.asset || row.symbol);
    if (!asset || isStableQuoteAsset(asset)) continue;
    const quantity = Number(row.quantity || 0);
    const exposure = Math.abs(Number(row.notionalUsdt || row.usdtValue || 0));
    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(exposure) ||
      Math.abs(exposure) < config.positionPnlMinExposureUsdt
    ) {
      continue;
    }

    const group = groups.get(asset) || {
      asset,
      rows: [],
      symbols: new Set(),
      venues: new Set(),
      accounts: new Set(),
      quantity: 0,
      spotQuantity: 0,
      contractQuantity: 0,
      grossExposureUsdt: 0,
      signedExposureUsdt: 0,
      unrealizedPnlUsdt: 0
    };
    const signedExposure = row.kind === "contract"
      ? quantity < 0 ? -exposure : exposure
      : Number(row.usdtValue || 0);
    group.rows.push(row);
    group.symbols.add(row.symbol || row.asset);
    group.venues.add(row.venue || row.kind);
    if (row.accountEmail) group.accounts.add(row.accountEmail);
    group.quantity += quantity;
    if (row.kind === "contract") group.contractQuantity += quantity;
    else group.spotQuantity += quantity;
    group.grossExposureUsdt += exposure;
    group.signedExposureUsdt += signedExposure;
    group.unrealizedPnlUsdt += Number(row.unrealizedPnlUsdt || 0);
    groups.set(asset, group);
  }
  return Array.from(groups.values())
    .filter((group) => group.grossExposureUsdt >= config.positionPnlMinExposureUsdt)
    .sort((a, b) => b.grossExposureUsdt - a.grossExposureUsdt);
}

function isStableQuoteAsset(asset) {
  return ["USDT", "USDC", "BUSD", "FDUSD", "TUSD", "DAI", "USD"].includes(normalizeExposureAsset(asset));
}

async function buildPositionPnlLeaderRow(group, context) {
  const candidates = positionKlineCandidates(group.asset, group.rows, context.priceMap);
  const errors = [];
  for (const candidate of candidates) {
    try {
      const klines = await fetchKlinesWindow(candidate.symbol, {
        endpoint: candidate.endpoint,
        baseUrl: candidate.baseUrl,
        interval: "1h",
        startTime: context.targetTime - 2 * 60 * 60 * 1000,
        endTime: context.endTime,
        maxCandles: context.hours + 8
      });
      const window = positionPnlPriceWindow(klines, context.targetTime);
      if (!window) {
        errors.push(`${candidate.symbol} K 线窗口不足`);
        continue;
      }
      return finalizePositionPnlLeaderRow(group, candidate, window);
    } catch (error) {
      errors.push(`${candidate.symbol}: ${error.message}`);
    }
  }
  return {
    asset: group.asset,
    ok: false,
    rowCount: group.rows.length,
    grossExposureUsdt: roundNumber(group.grossExposureUsdt),
    klineSymbol: candidates[0]?.symbol || "",
    error: errors[0] || "没有可用的 USDT K 线"
  };
}

function positionPnlPriceWindow(klines, targetTime) {
  const rows = (klines || [])
    .filter((row) => Number.isFinite(Number(row.close)) && Number(row.close) > 0)
    .sort((a, b) => Number(a.openTime || 0) - Number(b.openTime || 0));
  if (rows.length < 2) return null;
  const start = rows.filter((row) => Number(row.openTime || 0) <= targetTime).at(-1) || rows[0];
  const end = rows.at(-1);
  if (!start || !end || start === end) return null;
  return {
    start,
    end,
    startPrice: Number(start.close || 0),
    endPrice: Number(end.close || 0)
  };
}

function finalizePositionPnlLeaderRow(group, candidate, window) {
  const priceDelta = window.endPrice - window.startPrice;
  const priceChangePct = window.startPrice ? (window.endPrice / window.startPrice - 1) * 100 : 0;
  let pnlUsdt = 0;
  for (const row of group.rows) {
    const quantity = Number(row.quantity || 0);
    if (row.kind === "contract" && row.venue === "COIN-M Futures") {
      const notional = Math.abs(Number(row.notionalUsdt || row.usdtValue || 0));
      const signedNotional = quantity < 0 ? -notional : notional;
      pnlUsdt += signedNotional * (priceChangePct / 100);
    } else {
      pnlUsdt += quantity * priceDelta;
    }
  }
  return {
    asset: group.asset,
    ok: true,
    klineSymbol: candidate.symbol,
    klineVenue: candidate.label,
    startTime: window.start.timestamp,
    endTime: window.end.timestamp,
    startPrice: roundNumber(window.startPrice),
    endPrice: roundNumber(window.endPrice),
    priceChangePct: roundNumber(priceChangePct),
    pnlUsdt: roundNumber(pnlUsdt),
    grossExposureUsdt: roundNumber(group.grossExposureUsdt),
    signedExposureUsdt: roundNumber(group.signedExposureUsdt),
    quantity: roundNumber(group.quantity),
    spotQuantity: roundNumber(group.spotQuantity),
    contractQuantity: roundNumber(group.contractQuantity),
    unrealizedPnlUsdt: roundNumber(group.unrealizedPnlUsdt),
    rowCount: group.rows.length,
    accountCount: group.accounts.size,
    venues: Array.from(group.venues).filter(Boolean).sort(),
    symbols: Array.from(group.symbols).filter(Boolean).sort()
  };
}

function normalizePositionKlineDays(value) {
  const numeric = Math.floor(Number(value || 7));
  if (!Number.isFinite(numeric)) return 7;
  return Math.max(1, Math.min(365, numeric));
}

function positionRowMatchesAsset(row, asset) {
  const rowAsset = row.kind === "contract"
    ? contractBaseAsset(row.symbol || row.asset)
    : normalizeExposureAsset(row.asset || row.symbol);
  return rowAsset === asset;
}

function positionKlineCandidates(asset, rows, priceMap = new Map()) {
  const candidates = [];
  const seen = new Set();
  const add = (candidate) => {
    if (!candidate?.symbol || !candidate.endpoint || !candidate.baseUrl) return;
    const key = `${candidate.baseUrl}:${candidate.endpoint}:${candidate.symbol}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };

  for (const row of rows || []) {
    if (row.kind === "contract" && row.venue === "USD-M Futures") {
      add({
        symbol: row.symbol || `${asset}USDT`,
        endpoint: "/fapi/v1/klines",
        baseUrl: config.fapiBaseUrl,
        source: "usdMFutures",
        label: "USD-M Futures"
      });
    } else if (row.kind === "contract" && row.venue === "COIN-M Futures") {
      add({
        symbol: row.symbol || `${asset}USD_PERP`,
        endpoint: "/dapi/v1/klines",
        baseUrl: config.dapiBaseUrl,
        source: "coinMFutures",
        label: "COIN-M Futures"
      });
    }
  }

  if (asset && asset !== "USDT" && asset !== "BUSD" && asset !== "FDUSD") {
    const spotSymbol = positionKlineSymbol(asset, priceMap);
    const hasSpotLikeRows = (rows || []).some((row) => row.kind !== "contract" || row.venue === "Spot" || row.venue === "Margin");
    if (spotSymbol && (hasSpotLikeRows || priceMap?.has?.(spotSymbol))) {
      add({
        symbol: spotSymbol,
        endpoint: "/api/v3/klines",
        baseUrl: config.baseUrl,
        source: "spot",
        label: "Spot"
      });
    }

    add({
      symbol: `${asset}USDT`,
      endpoint: "/fapi/v1/klines",
      baseUrl: config.fapiBaseUrl,
      source: "usdMFuturesFallback",
      label: "USD-M Futures"
    });
  }

  return candidates;
}

function normalizeExposureAsset(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function contractBaseAsset(symbol) {
  let value = String(symbol || "").toUpperCase();
  value = value.replace(/_\d+$/, "");
  for (const suffix of ["USDT", "BUSD", "USDC", "USD", "PERP"]) {
    if (value.endsWith(suffix) && value.length > suffix.length) return value.slice(0, -suffix.length);
  }
  return normalizeExposureAsset(value);
}

function positionKlineSymbol(asset, priceMap = new Map()) {
  if (!asset || asset === "USDT" || asset === "BUSD" || asset === "FDUSD") return "";
  const direct = `${asset}USDT`;
  if (priceMap?.has?.(direct)) return direct;
  if (asset === "USDC") return "USDCUSDT";
  return direct;
}

function aggregatePositionAssetRows(rows, fallbackPrice = 0) {
  const totals = {
    rowCount: rows.length,
    accountCount: new Set(rows.map((row) => row.accountEmail).filter(Boolean)).size,
    spotQuantity: 0,
    spotValueUsdt: 0,
    contractQuantity: 0,
    contractLongUsdt: 0,
    contractShortUsdt: 0,
    grossNotionalUsdt: 0,
    signedNotionalUsdt: 0,
    netQuantity: 0,
    weightedCostUsdt: null,
    breakEvenPriceUsdt: null,
    currentPriceUsdt: 0,
    currentPositionUsdt: 0,
    realizedPnlUsdt: null,
    unrealizedPnlUsdt: 0,
    unrealizedPnlPct: null,
    costBasisAvailable: false,
    tradeMarkerCount: 0
  };
  let costNumerator = 0;
  let costWeight = 0;
  let breakEvenNumerator = 0;
  let breakEvenWeight = 0;
  let priceNumerator = 0;
  let priceWeight = 0;

  for (const row of rows) {
    const quantity = Number(row.quantity || 0);
    const absQuantity = Math.abs(quantity);
    const value = Math.abs(Number(row.notionalUsdt || row.usdtValue || 0));
    const price = Number(row.priceUsdt || 0);
    if (price > 0 && value > 0) {
      priceNumerator += price * value;
      priceWeight += value;
    }

    if (row.kind === "contract") {
      const signedValue = quantity < 0 ? -value : value;
      totals.contractQuantity += quantity;
      totals.signedNotionalUsdt += signedValue;
      totals.grossNotionalUsdt += value;
      if (signedValue >= 0) totals.contractLongUsdt += value;
      else totals.contractShortUsdt += value;
      totals.unrealizedPnlUsdt += Number(row.unrealizedPnlUsdt || 0);

      const entryPrice = Number(row.entryPrice || 0);
      if (entryPrice > 0 && absQuantity > 0) {
        costNumerator += entryPrice * absQuantity;
        costWeight += absQuantity;
      }
      const breakEvenPrice = Number(row.breakEvenPrice || 0);
      if (breakEvenPrice > 0 && absQuantity > 0) {
        breakEvenNumerator += breakEvenPrice * absQuantity;
        breakEvenWeight += absQuantity;
      }
    } else {
      totals.spotQuantity += quantity;
      totals.spotValueUsdt += Number(row.usdtValue || 0);
      totals.signedNotionalUsdt += Number(row.usdtValue || 0);
      totals.grossNotionalUsdt += Math.abs(Number(row.usdtValue || 0));
    }
  }

  totals.netQuantity = totals.spotQuantity + totals.contractQuantity;
  totals.currentPositionUsdt = totals.signedNotionalUsdt;
  totals.currentPriceUsdt = priceWeight ? priceNumerator / priceWeight : Number(fallbackPrice || 0);
  totals.unrealizedPnlPct = totals.grossNotionalUsdt ? (totals.unrealizedPnlUsdt / totals.grossNotionalUsdt) * 100 : null;
  if (costWeight > 0) {
    totals.weightedCostUsdt = costNumerator / costWeight;
    totals.costBasisAvailable = true;
  }
  if (breakEvenWeight > 0) totals.breakEvenPriceUsdt = breakEvenNumerator / breakEvenWeight;

  for (const key of Object.keys(totals)) {
    if (typeof totals[key] === "number") totals[key] = roundNumber(totals[key]);
  }
  return totals;
}

function aggregatePositionAssetAccounts(rows) {
  const groups = new Map();
  for (const row of rows) {
    const id = row.accountEmail || "unknown";
    const current = groups.get(id) || {
      accountEmail: id,
      remark: row.remark || "",
      tags: row.tags || [],
      venues: new Set(),
      rowCount: 0,
      quantity: 0,
      signedNotionalUsdt: 0,
      grossNotionalUsdt: 0,
      unrealizedPnlUsdt: 0
    };
    const quantity = Number(row.quantity || 0);
    const value = Math.abs(Number(row.notionalUsdt || row.usdtValue || 0));
    const signedValue = row.kind === "contract"
      ? quantity < 0 ? -value : value
      : Number(row.usdtValue || 0);
    current.venues.add(row.venue || row.kind || "");
    current.rowCount += 1;
    current.quantity += quantity;
    current.signedNotionalUsdt += signedValue;
    current.grossNotionalUsdt += value;
    current.unrealizedPnlUsdt += Number(row.unrealizedPnlUsdt || 0);
    groups.set(id, current);
  }
  return Array.from(groups.values())
    .map((row) => ({
      ...row,
      venues: Array.from(row.venues).filter(Boolean).sort(),
      quantity: roundNumber(row.quantity),
      signedNotionalUsdt: roundNumber(row.signedNotionalUsdt),
      grossNotionalUsdt: roundNumber(row.grossNotionalUsdt),
      unrealizedPnlUsdt: roundNumber(row.unrealizedPnlUsdt),
      pnlPct: row.grossNotionalUsdt ? roundNumber((row.unrealizedPnlUsdt / row.grossNotionalUsdt) * 100) : null
    }))
    .sort((a, b) => Math.abs(b.signedNotionalUsdt) - Math.abs(a.signedNotionalUsdt));
}

async function buildSubAccountPositions(account, priceMap, btcUsdt, coinMContractInfo) {
  const email = account.email || "";
  const tags = tagsForAccount(email);
  const accountMode = inferSubAccountMode(account);
  const base = {
    email,
    remark: account.remark || "",
    tags,
    accountMode: accountMode.mode,
    accountModeLabel: accountMode.label,
    accountModeSource: accountMode.source,
    isFreeze: Boolean(account.isFreeze),
    listed: true,
    assets: [],
    contracts: [],
    spotUsdt: 0,
    marginUsdt: 0,
    futuresUsdt: 0,
    totalAssetUsdt: 0,
    coverage: []
  };

  const [
    spot,
    margin,
    usdMFuturesAccount,
    coinMFuturesAccount,
    usdMPositionRisk,
    coinMPositionRisk
  ] = await Promise.all([
    fetchAccountOptional("spot", "Spot", () => fetchSubAccountSpotAssets(email)),
    fetchAccountOptional("margin", "Margin", () => fetchSubAccountMarginAccount(email), { missingIsEmpty: true }),
    fetchAccountOptional("usdMFuturesAccount", "USD-M Futures Assets", () =>
      fetchSubAccountFuturesAccount(email, 1)
    ),
    fetchAccountOptional("coinMFuturesAccount", "COIN-M Futures Assets", () =>
      fetchSubAccountFuturesAccount(email, 2)
    ),
    fetchAccountOptional("usdMPositionRisk", "USD-M Futures Positions", () =>
      fetchSubAccountFuturesPositionRisk(email, 1)
    ),
    fetchAccountOptional("coinMPositionRisk", "COIN-M Futures Positions", () =>
      fetchSubAccountFuturesPositionRisk(email, 2)
    )
  ]);

  base.coverage = [
    accountCoverageItem(spot),
    accountCoverageItem(margin),
    accountCoverageItem(usdMFuturesAccount),
    accountCoverageItem(coinMFuturesAccount),
    accountCoverageItem(usdMPositionRisk),
    accountCoverageItem(coinMPositionRisk)
  ];

  if (spot.ok) {
    const rows = normalizeSpotPositionRows(spot.data, priceMap, btcUsdt);
    base.assets.push(...rows.map((row) => ({ ...row, venue: "Spot" })));
    base.spotUsdt += rows.reduce((sum, row) => sum + row.usdtValue, 0);
  }

  if (margin.ok) {
    const rows = normalizeMarginPositionRows(margin.data, priceMap, btcUsdt);
    base.assets.push(...rows.map((row) => ({ ...row, venue: "Margin" })));
    base.marginUsdt += rows.reduce((sum, row) => sum + row.usdtValue, 0);
  }

  if (usdMFuturesAccount.ok) {
    const rows = normalizeFuturesAssetRows(
      usdMFuturesAccount.data.futureAccountResp || usdMFuturesAccount.data,
      priceMap,
      btcUsdt
    );
    base.assets.push(...rows.map((row) => ({ ...row, venue: "USD-M Futures" })));
    base.futuresUsdt += rows.reduce((sum, row) => sum + row.usdtValue, 0);
  }

  if (coinMFuturesAccount.ok) {
    const rows = normalizeFuturesAssetRows(
      coinMFuturesAccount.data.deliveryAccountResp || coinMFuturesAccount.data,
      priceMap,
      btcUsdt
    );
    base.assets.push(...rows.map((row) => ({ ...row, venue: "COIN-M Futures" })));
    base.futuresUsdt += rows.reduce((sum, row) => sum + row.usdtValue, 0);
  }

  if (usdMPositionRisk.ok) {
    base.contracts.push(
      ...normalizeFuturesContractRows(usdMPositionRisk.data.futurePositionRiskVOS, "USD-M Futures", {
        priceMap,
        btcUsdt
      })
    );
  }

  if (coinMPositionRisk.ok) {
    base.contracts.push(
      ...normalizeFuturesContractRows(coinMPositionRisk.data.deliveryPositionRiskVOS, "COIN-M Futures", {
        priceMap,
        btcUsdt,
        coinMContractInfo
      })
    );
  }

  base.assets = base.assets
    .filter((row) => Math.abs(Number(row.quantity || 0)) > 0 || Math.abs(Number(row.usdtValue || 0)) > 0)
    .map((row) => ({
      ...row,
      usdtValue: roundNumber(row.usdtValue),
      priceUsdt: roundNumber(row.priceUsdt),
      quantity: roundNumber(row.quantity),
      available: roundNumber(row.available),
      locked: roundNumber(row.locked),
      pnlPct: null
    }));
  base.contracts = base.contracts
    .filter((row) => Math.abs(Number(row.quantity || 0)) > 0)
    .map((row) => ({
      ...row,
      usdtValue: roundNumber(row.usdtValue),
      notionalUsdt: roundNumber(row.notionalUsdt),
      priceUsdt: roundNumber(row.priceUsdt),
      entryPrice: roundNumber(row.entryPrice),
      breakEvenPrice: roundNumber(row.breakEvenPrice),
      unrealizedPnlUsdt: roundNumber(row.unrealizedPnlUsdt),
      quantity: roundNumber(row.quantity),
      pnlPct: roundNumber(row.pnlPct)
    }));

  base.spotUsdt = roundNumber(base.spotUsdt);
  base.marginUsdt = roundNumber(base.marginUsdt);
  base.futuresUsdt = roundNumber(base.futuresUsdt);
  base.totalAssetUsdt = roundNumber(base.spotUsdt + base.marginUsdt + base.futuresUsdt);
  return base;
}

async function buildTradingStats(forceRefresh = false) {
  const now = Date.now();
  if (
    !forceRefresh &&
    tradingStatsCache.data &&
    now - tradingStatsCache.fetchedAt < config.tradingStatsCacheTtlMs
  ) {
    return tradingStatsCache.data;
  }

  const [subAccounts, marketPrices] = await Promise.all([
    fetchAllSubAccounts(),
    fetchMarketPrices()
  ]);
  const btcUsdt = Number(marketPrices.btcUsdt || 0);
  const results = await mapLimit(subAccounts, 2, async (account) => {
    const email = account.email || "";
    const result = await fetchAccountOptional("tradingStats", "Trading Statistics", () =>
      fetchSubAccountTransactionStatistics(email)
    );
    return normalizeAccountTradingStats(account, result, btcUsdt);
  });
  const accounts = results.map((item) => item.account);
  const totalByDate = new Map();
  for (const account of accounts) {
    for (const point of account.points) {
      const current = totalByDate.get(point.date) || {
        date: point.date,
        timestamp: point.timestamp,
        volumeUsdt: 0
      };
      current.volumeUsdt += Number(point.volumeUsdt || 0);
      totalByDate.set(point.date, current);
    }
  }

  const totalPoints = Array.from(totalByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      date: point.date,
      timestamp: point.timestamp,
      volumeUsdt: roundNumber(point.volumeUsdt)
    }));
  const totalVolumeUsdt30d = accounts.reduce(
    (total, account) => total + Number(account.totalVolumeUsdt30d || 0),
    0
  );
  const activeAccounts = accounts.filter((account) => Number(account.totalVolumeUsdt30d || 0) > 0).length;
  const lastTradeAt = accounts
    .map((account) => account.lastTradeAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const coverage = buildTradingStatsCoverage(results);

  const data = {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    cacheTtlMs: config.tradingStatsCacheTtlMs,
    totals: {
      accountCount: accounts.length,
      activeAccounts,
      totalVolumeUsdt30d: roundNumber(totalVolumeUsdt30d),
      lastTradeAt,
      lastTradeDate: lastTradeAt ? lastTradeAt.slice(0, 10) : null
    },
    total: {
      id: "total",
      label: "全部子账户",
      points: totalPoints,
      totalVolumeUsdt30d: roundNumber(totalVolumeUsdt30d),
      lastTradeAt
    },
    accounts: accounts.sort((a, b) => b.totalVolumeUsdt30d - a.totalVolumeUsdt30d),
    coverage,
    apiUsed: [
      "GET /sapi/v1/sub-account/list",
      "GET /sapi/v1/sub-account/transaction-statistics"
    ]
  };

  tradingStatsCache = {
    fetchedAt: now,
    data
  };
  return data;
}

function normalizeAccountTradingStats(account, result, btcUsdt) {
  const email = account.email || "";
  const rows = result.ok ? extractTradingStatRows(result.data) : [];
  const points = rows
    .map((row) => normalizeTradingStatRow(row, btcUsdt))
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pointVolumeUsdt = points.reduce((total, point) => total + Number(point.volumeUsdt || 0), 0);
  const payloadVolumeUsdt = result.ok ? recent30VolumeUsdt(result.data, btcUsdt) : 0;
  const totalVolumeUsdt30d = result.ok ? payloadVolumeUsdt || pointVolumeUsdt : 0;
  const lastPoint = points
    .filter((point) => Number(point.volumeUsdt || 0) > 0)
    .at(-1);
  const mode = inferSubAccountMode(account);

  return {
    result,
    account: {
      email,
      remark: account.remark || "",
      tags: tagsForAccount(email),
      accountMode: mode.mode,
      accountModeLabel: mode.label,
      accountModeSource: mode.source,
      totalVolumeUsdt30d: roundNumber(totalVolumeUsdt30d),
      lastTradeAt: lastPoint ? lastPoint.timestamp : null,
      lastTradeDate: lastPoint ? lastPoint.date : null,
      points,
      coverage: accountCoverageItem(result)
    }
  };
}

function extractTradingStatRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tradeInfoVos)) return payload.tradeInfoVos;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeTradingStatRow(row, btcUsdt) {
  const timestamp = normalizeTradingStatTimestamp(row);
  if (!timestamp) return null;
  const documentedVolume = tradingVolumeUsdt(row, btcUsdt);
  const fallbackVolume = firstNumericField(row, [
    "totalTradeVolume",
    "totalVolume",
    "tradeVolume",
    "volume",
    "totalTradeAmount",
    "tradeAmount",
    "amount",
    "usdtVolume"
  ]);
  const volume = documentedVolume || fallbackVolume;
  const date = new Date(timestamp).toISOString().slice(0, 10);
  return {
    date,
    timestamp: `${date}T00:00:00.000Z`,
    volumeUsdt: roundNumber(volume)
  };
}

function recent30VolumeUsdt(payload, btcUsdt) {
  if (!payload || typeof payload !== "object") return 0;
  const btcVolume =
    Number(payload.recent30BtcTotal || 0) +
    Number(payload.recent30BtcFuturesTotal || 0) +
    Number(payload.recent30BtcMarginTotal || 0);
  const stableVolume =
    Number(payload.recent30BusdTotal || 0) +
    Number(payload.recent30BusdFuturesTotal || 0) +
    Number(payload.recent30BusdMarginTotal || 0);
  return stableVolume || btcVolume * btcUsdt;
}

function tradingVolumeUsdt(row, btcUsdt) {
  const stableVolume = busdTradingVolume(row);
  if (stableVolume) return stableVolume;
  return btcTradingVolume(row) * btcUsdt;
}

function btcTradingVolume(row) {
  return (
    Number(row.btc || 0) +
    Number(row.btcFutures || 0) +
    Number(row.btcMargin || 0)
  );
}

function busdTradingVolume(row) {
  return (
    Number(row.busd || 0) +
    Number(row.busdFutures || 0) +
    Number(row.busdMargin || 0)
  );
}

function normalizeTradingStatTimestamp(row) {
  const raw = row.date || row.time || row.day || row.tradeDate || row.statDate || row.timestamp;
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") {
    const millis = raw < 10000000000 ? raw * 1000 : raw;
    return Number.isFinite(millis) ? millis : 0;
  }

  const value = String(raw).trim();
  if (/^\d{8}$/.test(value)) {
    return Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(`${value}T00:00:00Z`);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstNumericField(row, fields) {
  for (const field of fields) {
    if (row[field] === undefined || row[field] === null || row[field] === "") continue;
    const numeric = Number(row[field]);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function buildTradingStatsCoverage(results) {
  const successCount = results.filter((item) => item.result.ok).length;
  const errors = results
    .filter((item) => !item.result.ok && item.result.error)
    .map((item) => item.result.error)
    .slice(0, 5);
  return [
    {
      key: "transactionStatistics",
      label: "Sub-account Trading Statistics",
      ok: errors.length === 0,
      successCount,
      emptyCount: results.filter((item) => item.result.ok && !item.account.points.length).length,
      failureCount: results.length - successCount,
      errors
    }
  ];
}

function inferSubAccountMode(account) {
  const explicit = String(process.env.UNIFIED_SUB_ACCOUNT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const email = String(account.email || "").toLowerCase();
  if (explicit.includes(email)) {
    return {
      mode: "unified",
      label: "统一账户",
      source: "env"
    };
  }

  const marker = `${account.email || ""} ${account.remark || ""}`;
  if (/(^|[_\-\s])unified($|[_\-\s\d])|统一/i.test(marker)) {
    return {
      mode: "unified",
      label: "统一账户",
      source: "name"
    };
  }

  return {
    mode: "standard",
    label: "普通账户",
    source: "default"
  };
}

async function fetchAccountOptional(key, label, fn, options = {}) {
  try {
    const data = await fn();
    return {
      key,
      label,
      ok: true,
      empty: false,
      data
    };
  } catch (error) {
    if (options.missingIsEmpty && isMissingAccountError(error)) {
      return {
        key,
        label,
        ok: true,
        empty: true,
        data: null
      };
    }

    return {
      key,
      label,
      ok: false,
      empty: false,
      error: {
        code: error.code || "BINANCE_ERROR",
        message: error.message,
        statusCode: error.statusCode || 500
      }
    };
  }
}

function accountCoverageItem(result) {
  return {
    key: result.key,
    label: result.label,
    ok: result.ok,
    empty: Boolean(result.empty),
    error: result.error || null
  };
}

function buildPositionsCoverage(accounts) {
  const byKey = new Map();
  for (const account of accounts) {
    for (const item of account.coverage) {
      const current = byKey.get(item.key) || {
        key: item.key,
        label: item.label,
        ok: true,
        successCount: 0,
        emptyCount: 0,
        failureCount: 0,
        errors: []
      };
      if (item.ok) {
        current.successCount += 1;
        if (item.empty) current.emptyCount += 1;
      } else {
        current.ok = false;
        current.failureCount += 1;
        if (item.error && current.errors.length < 5) current.errors.push(item.error);
      }
      byKey.set(item.key, current);
    }
  }
  return Array.from(byKey.values());
}

async function buildSummaryDirectFuturesCheck(accounts, priceMap, btcUsdt) {
  const candidates = (accounts || []).filter(shouldDirectVerifySummaryFutures);
  if (!candidates.length) {
    return {
      ok: true,
      candidateCount: 0,
      overrideCount: 0,
      overrides: new Map(),
      error: null
    };
  }

  const results = await mapLimit(candidates, 3, async (account) => {
    const email = account.email || "";
    const [usdM, coinM] = await Promise.all([
      fetchAccountOptional("usdMFuturesDirect", "USD-M Futures Direct", () =>
        fetchSubAccountFuturesAccount(email, 1)
      ),
      fetchAccountOptional("coinMFuturesDirect", "COIN-M Futures Direct", () =>
        fetchSubAccountFuturesAccount(email, 2)
      )
    ]);
    if (!usdM.ok || !coinM.ok) {
      return {
        email,
        ok: false,
        errors: [usdM.error, coinM.error].filter(Boolean)
      };
    }

    const usdSats = usdMFuturesAccountToBtcUnits(usdM.data, priceMap, btcUsdt);
    const coinSats = coinMFuturesAccountToBtcUnits(coinM.data?.deliveryAccountResp || coinM.data, priceMap, btcUsdt);
    const aggregateSats =
      decimalToUnits(account.usdMFuturesAssetBtc || "0", 8) +
      decimalToUnits(account.coinMFuturesAssetBtc || "0", 8);
    const directSats = usdSats + coinSats;
    const minDeltaSats = usdtToBtcUnits("1", btcUsdt);
    return {
      email,
      ok: true,
      usdSats,
      coinSats,
      directSats,
      aggregateSats,
      shouldOverride: directSats !== 0n && absBigInt(directSats - aggregateSats) > minDeltaSats
    };
  });

  const failures = results.filter((item) => !item.ok);
  const overrides = new Map(
    results
      .filter((item) => item.ok && item.shouldOverride)
      .map((item) => [normalizeEntityId(item.email), item])
  );
  return {
    ok: failures.length === 0,
    candidateCount: candidates.length,
    overrideCount: overrides.size,
    overrides,
    error: failures.length
      ? {
          code: "SUB_DIRECT_FUTURES_CHECK_FAILED",
          message: `Failed to verify direct futures equity for ${failures.length} sub-account(s).`,
          statusCode: 503,
          accounts: failures.map((item) => item.email).slice(0, 8),
          errors: failures.flatMap((item) => item.errors || []).slice(0, 5)
        }
      : null
  };
}

function shouldDirectVerifySummaryFutures(account) {
  if (!account) return false;
  const aggregateFuturesSats =
    decimalToUnits(account.usdMFuturesAssetBtc || "0", 8) +
    decimalToUnits(account.coinMFuturesAssetBtc || "0", 8);
  if (aggregateFuturesSats !== 0n) return false;
  return Boolean(account.hasUsdMFuturesSummary || account.hasCoinMFuturesSummary);
}

function applySummaryDirectFuturesOverrides(accounts, overrides, btcUsdt) {
  if (!overrides?.size) return accounts;
  return (accounts || []).map((account) => {
    const override = overrides.get(normalizeEntityId(account.email));
    if (!override) return account;
    const spotSats = decimalToUnits(account.spotAssetBtc || "0", 8);
    const marginSats = decimalToUnits(account.marginAssetBtc || "0", 8);
    const officialSats = spotSats + marginSats + override.usdSats + override.coinSats;
    return {
      ...account,
      hasUsdMFuturesSummary: true,
      hasCoinMFuturesSummary: true,
      usdMFuturesAssetBtc: unitsToDecimal(override.usdSats, 8),
      coinMFuturesAssetBtc: unitsToDecimal(override.coinSats, 8),
      totalAssetBtc: unitsToDecimal(officialSats, 8),
      totalAssetSats: officialSats.toString(),
      totalAssetUsdt: unitsToNumber(officialSats, 8) * btcUsdt,
      equityCorrection: {
        source: "directFuturesCrossCheck",
        previousFuturesBtc: unitsToDecimal(override.aggregateSats, 8),
        correctedFuturesBtc: unitsToDecimal(override.directSats, 8)
      }
    };
  });
}

function usdMFuturesAccountToBtcUnits(account, priceMap, btcUsdt) {
  const payload = account?.futureAccountResp || account;
  const rows = normalizeFuturesAssetRows(payload, priceMap, btcUsdt);
  if (rows.length) {
    const totalUsdt = rows.reduce((sum, row) => sum + Number(row.usdtValue || 0), 0);
    return usdtToBtcUnits(String(totalUsdt), btcUsdt);
  }

  const directUsdt = firstNumericField(payload, [
    "totalMarginBalance",
    "totalWalletBalance",
    "totalCrossWalletBalance",
    "availableBalance"
  ]);
  return directUsdt ? usdtToBtcUnits(String(directUsdt), btcUsdt) : 0n;
}

function absBigInt(value) {
  return value < 0n ? -value : value;
}

function requiredPositionCoverageFailures(accounts) {
  return (accounts || [])
    .flatMap((account) =>
      (account.coverage || [])
        .filter((item) => !item.ok)
        .map((item) => ({
          ...item,
          accountEmail: account.email,
          accountLabel: account.remark || account.email
        }))
    );
}

async function retryIncompletePositionAccounts(accounts, subAccounts, priceMap, btcUsdt, coinMContractInfo) {
  const failures = requiredPositionCoverageFailures(accounts);
  if (!failures.length) return accounts;

  const failedEmailIds = new Set(failures.map((item) => normalizeEntityId(item.accountEmail)));
  const retryTargets = (subAccounts || []).filter((account) => failedEmailIds.has(normalizeEntityId(account.email)));
  if (!retryTargets.length) return accounts;

  const retryResults = await mapLimit(retryTargets, 2, (account) =>
    buildSubAccountPositions(account, priceMap, btcUsdt, coinMContractInfo)
  );
  const retryByEmail = new Map(retryResults.map((account) => [normalizeEntityId(account.email), account]));
  return accounts.map((account) => {
    const retry = retryByEmail.get(normalizeEntityId(account.email));
    if (!retry) return account;
    const previousFailureCount = requiredPositionCoverageFailures([account]).length;
    const retryFailureCount = requiredPositionCoverageFailures([retry]).length;
    return retryFailureCount <= previousFailureCount ? retry : account;
  });
}

function buildPositionsIncompleteError(failures) {
  const labels = failures
    .slice(0, 6)
    .map((item) => `${item.accountLabel || item.accountEmail || "account"} ${item.label || item.key}`)
    .join(", ");
  const error = new Error(`Positions rejected because account data sources failed: ${labels}.`);
  error.statusCode = 503;
  error.code = "POSITIONS_COVERAGE_INCOMPLETE";
  error.details = failures.slice(0, 30).map((item) => ({
    accountEmail: item.accountEmail,
    key: item.key,
    label: item.label,
    error: item.error || null
  }));
  return error;
}

function normalizeSpotPositionRows(payload, priceMap, btcUsdt) {
  return (payload?.balances || []).map((row) => {
    const free = Number(row.free || 0);
    const locked = Number(row.locked || 0);
    const freeze = Number(row.freeze || 0);
    const withdrawing = Number(row.withdrawing || 0);
    const total = free + locked + freeze + withdrawing;
    const usdtValue = assetAmountToUsdt(row.asset, total, priceMap, btcUsdt);
    return {
      kind: "asset",
      asset: row.asset,
      symbol: row.asset,
      quantity: total,
      available: free,
      locked: locked + freeze + withdrawing,
      priceUsdt: total ? usdtValue / total : 0,
      usdtValue,
      unrealizedPnlUsdt: 0
    };
  });
}

function normalizeMarginPositionRows(payload, priceMap, btcUsdt) {
  return (payload?.userAssets || payload?.marginUserAssetVoList || []).map((row) => {
    const free = Number(row.free || 0);
    const locked = Number(row.locked || 0);
    const borrowed = Number(row.borrowed || 0);
    const interest = Number(row.interest || 0);
    const net = row.netAsset !== undefined ? Number(row.netAsset || 0) : free + locked - borrowed - interest;
    const gross = free + locked;
    const usdtValue = assetAmountToUsdt(row.asset, net, priceMap, btcUsdt);
    return {
      kind: "asset",
      asset: row.asset,
      symbol: row.asset,
      quantity: net,
      available: free,
      locked: locked,
      borrowed: roundNumber(borrowed + interest),
      grossQuantity: roundNumber(gross),
      priceUsdt: net ? usdtValue / net : assetAmountToUsdt(row.asset, 1, priceMap, btcUsdt),
      usdtValue,
      unrealizedPnlUsdt: 0
    };
  });
}

function normalizeFuturesAssetRows(payload, priceMap, btcUsdt) {
  return (payload?.assets || []).map((row) => {
    const asset = row.asset || payload.asset || "";
    const balance = Number(
      row.marginBalance ||
        row.walletBalance ||
        row.balance ||
        row.maxWithdrawAmount ||
        row.availableBalance ||
        0
    );
    const available = Number(row.availableBalance || row.maxWithdrawAmount || 0);
    const usdtValue = assetAmountToUsdt(asset, balance, priceMap, btcUsdt);
    return {
      kind: "asset",
      asset,
      symbol: asset,
      quantity: balance,
      available,
      locked: Math.max(balance - available, 0),
      priceUsdt: balance ? usdtValue / balance : assetAmountToUsdt(asset, 1, priceMap, btcUsdt),
      usdtValue,
      unrealizedPnlUsdt: Number(row.unrealizedProfit || 0)
    };
  });
}

function normalizeFuturesContractRows(rows, venue, context = {}) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const quantity = Number(row.positionAmt ?? row.positionAmount ?? row.positionAmt ?? 0);
    const markPrice = Number(row.markPrice || 0);
    const entryPrice = Number(row.entryPrice || 0);
    const breakEvenPrice = Number(row.breakEvenPrice || 0);
    const symbolInfo = context.coinMContractInfo?.get(row.symbol) || {};
    const contractSize = venue === "COIN-M Futures" ? Number(symbolInfo.contractSize || 100) : 0;
    const marginAsset = symbolInfo.marginAsset || inferCoinMMarginAsset(row.symbol);
    const notional =
      venue === "COIN-M Futures"
        ? Math.abs(quantity * contractSize)
        : Math.abs(quantity * markPrice);
    const unrealizedProfit = Number(row.unrealizedProfit || 0);
    const unrealizedPnlUsdt =
      venue === "COIN-M Futures"
        ? assetAmountToUsdt(marginAsset, unrealizedProfit, context.priceMap || new Map(), context.btcUsdt || 0)
        : unrealizedProfit;
    const pnlPct = notional ? (unrealizedPnlUsdt / notional) * 100 : 0;
    return {
      kind: "contract",
      venue,
      asset: row.symbol,
      symbol: row.symbol,
      positionSide: row.positionSide || "BOTH",
      quantity,
      available: 0,
      locked: 0,
      priceUsdt: markPrice,
      entryPrice,
      breakEvenPrice,
      leverage: row.leverage || "",
      usdtValue: notional,
      notionalUsdt: notional,
      unrealizedPnlUsdt,
      pnlPct,
      marginAsset,
      pnlAsset: venue === "COIN-M Futures" ? marginAsset : "USDT"
    };
  });
}

function inferCoinMMarginAsset(symbol) {
  const base = String(symbol || "").split("USD")[0];
  return base || "";
}

function timeWindows(startTime, endTime, maxWindowMs) {
  const start = Number(startTime || 0);
  const end = Number(endTime || 0);
  if (!start || !end || end <= start || !maxWindowMs) {
    return [{ startTime: startTime, endTime: endTime }];
  }

  const windows = [];
  for (let cursor = start; cursor <= end; cursor += maxWindowMs + 1) {
    windows.push({
      startTime: cursor,
      endTime: Math.min(end, cursor + maxWindowMs)
    });
  }
  return windows;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function decimalToUnits(value, decimals) {
  const raw = normalizeDecimalInput(value, decimals);
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholePart = "0", decimalPart = ""] = unsigned.split(".");
  const normalizedWhole = wholePart.replace(/[^\d]/g, "") || "0";
  const normalizedDecimal = decimalPart.replace(/[^\d]/g, "").padEnd(decimals, "0").slice(0, decimals);
  const units = BigInt(normalizedWhole + normalizedDecimal);
  return negative ? -units : units;
}

function normalizeDecimalInput(value, decimals) {
  const raw = String(value || "0").trim();
  if (!/e/i.test(raw)) return raw;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(decimals);
}

function usdtToBtcUnits(usdtValue, btcUsdt) {
  if (!btcUsdt) return 0n;
  const usdtUnits = decimalToUnits(usdtValue || "0", 8);
  const priceUnits = decimalToUnits(String(btcUsdt), 8);
  if (priceUnits === 0n) return 0n;
  return (usdtUnits * 100000000n) / priceUnits;
}

function coinMFuturesAccountToBtcUnits(account, priceMap, btcUsdt) {
  if (account.totalMarginBalanceOfBTC !== undefined) {
    return decimalToUnits(account.totalMarginBalanceOfBTC || "0", 8);
  }

  if (!Array.isArray(account.assets)) {
    return decimalToUnits(account.totalMarginBalance || "0", 8);
  }

  return account.assets.reduce((total, asset) => {
    const balance = decimalToUnits(asset.marginBalance || asset.walletBalance || "0", 8);
    return total + assetUnitsToBtcUnits(asset.asset, balance, priceMap, btcUsdt);
  }, 0n);
}

function simpleEarnAccountToBtcUnits(account, btcUsdt) {
  if (!account || typeof account !== "object") return 0n;

  const directBtc = firstNonEmptyField(account, [
    "totalAmountInBTC",
    "totalAmountInBtc",
    "totalBtcAmount",
    "totalBTC"
  ]);
  if (directBtc !== null) return decimalToUnits(directBtc, 8);

  const btcParts = [
    "totalFlexibleAmountInBTC",
    "totalLockedAmountInBTC",
    "flexibleAmountInBTC",
    "lockedAmountInBTC"
  ]
    .map((field) => firstNonEmptyField(account, [field]))
    .filter((value) => value !== null);
  if (btcParts.length) {
    return btcParts.reduce((total, value) => total + decimalToUnits(value, 8), 0n);
  }

  const directUsdt = firstNonEmptyField(account, [
    "totalAmountInUSDT",
    "totalAmountInUsdt",
    "totalUsdtAmount",
    "totalUSDT"
  ]);
  if (directUsdt !== null) return usdtToBtcUnits(directUsdt, btcUsdt);

  const usdtParts = [
    "totalFlexibleAmountInUSDT",
    "totalLockedAmountInUSDT",
    "flexibleAmountInUSDT",
    "lockedAmountInUSDT"
  ]
    .map((field) => firstNonEmptyField(account, [field]))
    .filter((value) => value !== null);
  if (usdtParts.length) {
    return usdtParts.reduce((total, value) => total + usdtToBtcUnits(value, btcUsdt), 0n);
  }

  return 0n;
}

function fundingWalletToBtcUnits(payload, priceMap, btcUsdt) {
  const rows = fundingWalletRows(payload);
  return rows.reduce((total, row) => {
    const asset = String(row.asset || row.coin || "").toUpperCase();
    if (!asset) return total;
    const amountUnits = fundingWalletRowAmountUnits(row);
    if (amountUnits !== 0n) {
      return total + assetUnitsToBtcUnits(asset, amountUnits, priceMap, btcUsdt);
    }
    const btcValuation = firstNonEmptyField(row, ["btcValuation", "btcValue", "totalAssetOfBtc"]);
    return btcValuation === null ? total : total + decimalToUnits(btcValuation, 8);
  }, 0n);
}

function fundingWalletRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.assets)) return payload.assets;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function fundingWalletRowAmountUnits(row) {
  const explicitFields = ["free", "locked", "freeze", "withdrawing"];
  const hasExplicitField = explicitFields.some((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "");
  if (hasExplicitField) {
    return explicitFields.reduce((total, field) => total + decimalToUnits(row?.[field] || "0", 8), 0n);
  }

  const fallback = firstNonEmptyField(row, ["balance", "total", "amount", "available"]);
  return fallback === null ? 0n : decimalToUnits(fallback, 8);
}

function firstNonEmptyField(row, fields) {
  for (const field of fields) {
    const value = row?.[field];
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }
  return null;
}

function portfolioMarginAccountToBtcUnits(account, priceMap, btcUsdt) {
  const directUsdt = firstNumericField(account, [
    "accountEquity",
    "actualEquity",
    "totalEquity",
    "totalWalletBalance",
    "totalMarginBalance",
    "uniMMR"
  ]);
  if (directUsdt) return usdtToBtcUnits(String(directUsdt), btcUsdt);

  const directBtc = firstNumericField(account, [
    "accountEquityOfBtc",
    "totalEquityOfBtc",
    "totalWalletBalanceOfBtc",
    "totalMarginBalanceOfBTC"
  ]);
  if (directBtc) return decimalToUnits(String(directBtc), 8);

  const assetRows = [
    ...(Array.isArray(account.assets) ? account.assets : []),
    ...(Array.isArray(account.balances) ? account.balances : []),
    ...(Array.isArray(account.userAssets) ? account.userAssets : [])
  ];
  if (assetRows.length) {
    return assetRows.reduce((total, row) => {
      const asset = row.asset || row.coin || row.marginAsset || "";
      const amount = firstNumericField(row, [
        "marginBalance",
        "walletBalance",
        "crossWalletBalance",
        "balance",
        "total",
        "equity",
        "netAsset"
      ]);
      return total + assetUnitsToBtcUnits(asset, decimalToUnits(String(amount || 0), 8), priceMap, btcUsdt);
    }, 0n);
  }

  return 0n;
}

function assetUnitsToBtcUnits(asset, amountUnits, priceMap, btcUsdt) {
  if (amountUnits === 0n) return 0n;
  if (asset === "BTC") return amountUnits;
  if (asset === "USDT" || asset === "USDC" || asset === "BUSD" || asset === "FDUSD") {
    return usdtToBtcUnits(unitsToDecimal(amountUnits, 8), btcUsdt);
  }

  const btcPair = priceMap.get(`${asset}BTC`);
  if (btcPair) {
    return (amountUnits * decimalToUnits(String(btcPair), 8)) / 100000000n;
  }

  const usdtPair = priceMap.get(`${asset}USDT`);
  if (usdtPair && btcUsdt) {
    const usdtUnits = (amountUnits * decimalToUnits(String(usdtPair), 8)) / 100000000n;
    return usdtToBtcUnits(unitsToDecimal(usdtUnits, 8), btcUsdt);
  }

  return 0n;
}

function assetAmountToUsdt(asset, amount, priceMap, btcUsdt) {
  const amountUnits = decimalToUnits(amount || "0", 8);
  if (amountUnits === 0n) return 0;
  if (asset === "USDT" || asset === "BUSD" || asset === "FDUSD") return unitsToNumber(amountUnits, 8);
  if (asset === "USDC") return unitsToNumber(amountUnits, 8);

  const usdtPair = priceMap.get(`${asset}USDT`);
  if (usdtPair) return unitsToNumber(amountUnits, 8) * usdtPair;

  if (asset === "BTC" && btcUsdt) return unitsToNumber(amountUnits, 8) * btcUsdt;

  const btcPair = priceMap.get(`${asset}BTC`);
  if (btcPair && btcUsdt) return unitsToNumber(amountUnits, 8) * btcPair * btcUsdt;

  return 0;
}

function buildEntities(masterSats, accounts, btcUsdt) {
  return [
    {
      id: "master",
      type: "master",
      label: "Master account",
      email: null,
      equityBtc: unitsToDecimal(masterSats, 8),
      equityUsdt: unitsToNumber(masterSats, 8) * btcUsdt
    },
    ...accounts.map((account) => ({
      id: account.email,
      type: "sub",
      label: account.email,
      email: account.email,
      remark: account.remark,
      tags: account.tags || [],
      equityBtc: account.totalAssetBtc,
      equityUsdt: account.totalAssetUsdt
    }))
  ];
}

function getSubAccountList(payload, preferredKey) {
  if (!payload) return [];
  if (Array.isArray(payload[preferredKey])) return payload[preferredKey];
  if (Array.isArray(payload.subAccountList)) return payload.subAccountList;
  if (payload.futureAccountSummaryResp?.subAccountList) {
    return payload.futureAccountSummaryResp.subAccountList;
  }
  if (payload.deliveryAccountSummaryResp?.subAccountList) {
    return payload.deliveryAccountSummaryResp.subAccountList;
  }
  if (Array.isArray(payload.futuresAccountSummaryResp)) return payload.futuresAccountSummaryResp;
  if (Array.isArray(payload.deliveryAccountSummaryResp)) return payload.deliveryAccountSummaryResp;
  if (Array.isArray(payload.marginSubAccountList)) return payload.marginSubAccountList;
  return [];
}

function unitsToDecimal(units, decimals) {
  const negative = units < 0n;
  const unsigned = negative ? -units : units;
  const raw = unsigned.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function unitsToNumber(units, decimals) {
  return Number(units) / 10 ** decimals;
}

function compareBigIntDesc(a, b) {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

function assertSnapshotQuality(summary) {
  const failedCoverage = (summary.coverage || []).filter((item) => !item.optional && !item.ok);
  if (failedCoverage.length) {
    const labels = failedCoverage.map((item) => item.label || item.key).join(", ");
    const error = new Error(`Snapshot rejected because required data sources failed: ${labels}.`);
    error.statusCode = 503;
    error.code = "SNAPSHOT_COVERAGE_INCOMPLETE";
    error.details = failedCoverage.map((item) => ({
      key: item.key,
      label: item.label,
      error: item.error || null
    }));
    throw error;
  }

  const failedEquityCoverage = (summary.coverage || []).filter(isHistoricallyContributingOptionalSourceFailure);
  if (failedEquityCoverage.length) {
    const labels = failedEquityCoverage.map((item) => item.label || item.key).join(", ");
    const error = new Error(`Snapshot rejected because equity-contributing data sources failed: ${labels}.`);
    error.statusCode = 503;
    error.code = "SNAPSHOT_EQUITY_SOURCE_INCOMPLETE";
    error.details = failedEquityCoverage.map((item) => ({
      key: item.key,
      label: item.label,
      error: item.error || null
    }));
    throw error;
  }

  const totalUsdt = Number(summary.totals?.allAccountsTotalAssetUsdt || 0);
  const entitySum = (summary.entities || []).reduce(
    (total, entity) => total + Number(entity.equityUsdt || 0),
    0
  );
  const tolerance = Math.max(1, Math.abs(totalUsdt) * 0.000001);
  const diff = totalUsdt - entitySum;
  if (!Number.isFinite(totalUsdt) || totalUsdt < 0 || Math.abs(diff) > tolerance) {
    console.error("SNAPSHOT_TOTAL_INVALID:", JSON.stringify({
      totalUsdt,
      entitySum,
      difference: diff,
      tolerance,
      entityCount: (summary.entities || []).length,
      totals: summary.totals,
      entitySample: (summary.entities || []).slice(0, 5).map((e) => ({
        id: e.id,
        type: e.type,
        equityUsdt: e.equityUsdt
      }))
    }, null, 2));
    const error = new Error("Snapshot rejected because total equity failed consistency checks.");
    error.statusCode = 503;
    error.code = "SNAPSHOT_TOTAL_INVALID";
    error.details = {
      totalUsdt,
      entitySum,
      difference: diff,
      tolerance
    };
    throw error;
  }
}

function assertSnapshotContinuity(snapshot) {
  const previous = store.snapshots
    .slice()
    .filter((item) => item.id !== snapshot.id)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .at(-1);
  if (!previous) return;

  const previousTotal = Number(previous.totals?.allAccountsTotalAssetUsdt || 0);
  const nextTotal = Number(snapshot.totals?.allAccountsTotalAssetUsdt || 0);
  if (previousTotal <= 0 || nextTotal <= 0) return;

  const externalFlow = store.transfers.filter(isTrackedPerformanceTransfer).reduce((total, transfer) => {
    const timestamp = Date.parse(transfer.timestamp);
    if (timestamp <= Date.parse(previous.timestamp) || timestamp > Date.parse(snapshot.timestamp)) {
      return total;
    }
    return total + entityTransferFlow("total", transfer);
  }, 0);
  const adjustedPreviousTotal = previousTotal + externalFlow;
  if (adjustedPreviousTotal <= 0) return;

  const ratio = nextTotal / adjustedPreviousTotal;
  const minRatio = Number(process.env.SNAPSHOT_MIN_TOTAL_RATIO || 0.7);
  const maxRatio = Number(process.env.SNAPSHOT_MAX_TOTAL_RATIO || 1.3);
  if (ratio >= minRatio && ratio <= maxRatio) return;

  const error = new Error(
    `Snapshot rejected because total equity changed too much: ratio ${ratio.toFixed(6)}.`
  );
  error.statusCode = 503;
  error.code = "SNAPSHOT_TOTAL_JUMP";
  error.details = {
    previousSnapshotAt: previous.timestamp,
    previousTotalUsdt: previousTotal,
    externalFlowUsdt: roundNumber(externalFlow),
    adjustedPreviousTotalUsdt: roundNumber(adjustedPreviousTotal),
    nextTotalUsdt: nextTotal,
    ratio,
    minRatio,
    maxRatio
  };
  throw error;
}

async function captureSnapshot({ force = false } = {}) {
  if (isCapturingSnapshot) return { skipped: true, reason: "capture_in_progress" };

  const now = Date.now();
  const lastSnapshotAt = store.lastSnapshotAt ? Date.parse(store.lastSnapshotAt) : 0;
  if (!force && lastSnapshotAt && now - lastSnapshotAt < config.snapshotIntervalMs) {
    return { skipped: true, reason: "interval_not_elapsed" };
  }

  isCapturingSnapshot = true;
  try {
    const summary = await buildSummary(true);
    assertSnapshotQuality(summary);

    const snapshot = {
      id: String(Date.parse(summary.generatedAt)),
      timestamp: summary.generatedAt,
      quote: summary.quote,
      totals: summary.totals,
      coverage: summary.coverage.map((item) => ({
        key: item.key,
        label: item.label,
        ok: item.ok,
        optional: Boolean(item.optional),
        usedForEquity: Boolean(item.usedForEquity),
        error: item.error || null
      })),
      entities: summary.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        label: entity.label,
        email: entity.email,
        remark: entity.remark || "",
        equityUsdt: roundNumber(entity.equityUsdt),
        equityBtc: entity.equityBtc
      }))
    };

    const transferSync = await syncTransfers(summary);
    assertSnapshotContinuity(snapshot);
    const snapshotWrite = upsertById(store.snapshots, snapshot);
    const pruned = pruneStore();
    store.lastSnapshotAt = snapshot.timestamp;
    if (
      snapshotWrite === "inserted" &&
      pruned.snapshots === 0 &&
      pruned.transfers === 0 &&
      !transferSync.touchedExistingTransfer
    ) {
      appendJsonLines(transfersStorePath, transferSync.insertedTransfers);
      appendJsonLines(snapshotsStorePath, [snapshot]);
      saveStoreMeta();
      markLegacyStoreMigrated();
    } else {
      saveStore();
    }
    lastCaptureError = null;
    return { skipped: false, snapshot };
  } catch (error) {
    lastCaptureError = {
      at: new Date().toISOString(),
      code: error.code || "CAPTURE_ERROR",
      message: error.message
    };
    throw error;
  } finally {
    isCapturingSnapshot = false;
  }
}

async function syncTransfers(summary) {
  const endTime = Date.now();
  const fallbackStartTime = endTime - config.transferLookbackDays * 24 * 60 * 60 * 1000;
  store.lastTransferSyncAtBySource = normalizeTransferSyncCursors(store.lastTransferSyncAtBySource);
  const sources = [
    {
      key: "universalTransferScoped",
      label: "Sub-account universal transfers",
      useGlobalCursor: false,
      fn: (startTime, sourceEndTime) =>
        fetchSubAccountUniversalTransfers(startTime, sourceEndTime, summary)
    },
    {
      key: "subAccountSpotTransfer",
      label: "Sub-account spot transfers",
      fn: fetchSubAccountSpotTransfers
    },
    {
      key: "deposit",
      label: "Master account deposits",
      fn: fetchMasterDeposits
    },
    {
      key: "payTransaction",
      label: "Master account Binance Pay transactions",
      useGlobalCursor: false,
      fn: fetchMasterPayTransactions
    },
    {
      key: "withdraw",
      label: "Master account withdrawals",
      fn: fetchMasterWithdrawals
    }
  ];
  const transferResults = await Promise.all(
    sources.map((source) => {
      const previousSync = store.lastTransferSyncAtBySource[source.key]
        ? Date.parse(store.lastTransferSyncAtBySource[source.key])
        : source.useGlobalCursor === false
          ? 0
          : store.lastTransferSyncAt
          ? Date.parse(store.lastTransferSyncAt)
          : 0;
      const startTime = previousSync
        ? Math.max(previousSync - 60 * 60 * 1000, fallbackStartTime)
        : fallbackStartTime;
      return fetchOptional(source.label, () => source.fn(startTime, endTime)).then((result) => ({
        ...result,
        sourceKey: source.key
      }));
    })
  );

  const marketPrices = await fetchOptional("Market prices for transfer valuation", fetchMarketPrices);
  const priceMap = marketPrices.ok ? marketPrices.data.priceMap : new Map();
  const btcUsdt = marketPrices.ok ? marketPrices.data.btcUsdt : Number(summary.quote.price || 0);
  if (!priceMap.has("BTCUSDT")) priceMap.set("BTCUSDT", btcUsdt);
  const insertedTransfers = [];
  let touchedExistingTransfer = false;

  for (const result of transferResults) {
    if (!result.ok) continue;
    store.lastTransferSyncAtBySource[result.sourceKey] = new Date(endTime).toISOString();
    for (const row of result.data || []) {
      const event = normalizeTransfer(row, priceMap, btcUsdt, result.label, summary);
      if (!event) continue;
      const upsertResult = upsertTransferEvent(store.transfers, event);
      if (upsertResult === "inserted") insertedTransfers.push(event);
      else if (upsertResult === "updated") touchedExistingTransfer = true;
    }
  }
  if (transferResults.every((result) => result.ok)) {
    store.lastTransferSyncAt = new Date(endTime).toISOString();
  }
  return {
    insertedTransfers,
    touchedExistingTransfer
  };
}

function normalizeTransfer(row, priceMap, btcUsdt, sourceLabel = "", summary = null) {
  if (sourceLabel === "Master account deposits") return normalizeMasterDeposit(row, priceMap, btcUsdt);
  if (sourceLabel === "Master account Binance Pay transactions") {
    return normalizeMasterPayTransaction(row, priceMap, btcUsdt);
  }
  if (sourceLabel === "Master account withdrawals") return normalizeMasterWithdrawal(row, priceMap, btcUsdt);
  if (sourceLabel === "Sub-account spot transfers") return normalizeSubAccountSpotTransfer(row, priceMap, btcUsdt, summary);
  return normalizeUniversalTransfer(row, priceMap, btcUsdt, summary);
}

function upsertTransferEvent(rows, next) {
  const idResult = upsertById(rows, next);
  if (idResult !== "inserted") return idResult;

  const inserted = rows.pop();
  const duplicateIndex = rows.findIndex((row) => sameTransferEvent(row, inserted));
  if (duplicateIndex < 0) {
    rows.push(inserted);
    return "inserted";
  }

  return "unchanged";
}

function sameTransferEvent(left, right) {
  if (!left || !right) return false;
  const leftTxId = String(left.txId || "");
  const rightTxId = String(right.txId || "");
  if (leftTxId && rightTxId && leftTxId === rightTxId) return true;

  return (
    Date.parse(left.timestamp) === Date.parse(right.timestamp) &&
    normalizeEntityId(left.from) === normalizeEntityId(right.from) &&
    normalizeEntityId(left.to) === normalizeEntityId(right.to) &&
    String(left.asset || "").toUpperCase() === String(right.asset || "").toUpperCase() &&
    decimalToUnits(left.amount || "0", 8) === decimalToUnits(right.amount || "0", 8)
  );
}

function normalizeUniversalTransfer(row, priceMap, btcUsdt, summary) {
  const timestamp = normalizeTransferTimestamp(row.createTimeStamp || row.createTime || row.time || row.timestamp);
  if (!timestamp) return null;

  const fromEmail = row.fromEmail || "";
  const toEmail = row.toEmail || "";
  const amount = row.amount || row.qty || row.quantity || "0";
  const asset = row.asset || row.coin || "";
  const usdtValue = assetAmountToUsdt(asset, amount, priceMap, btcUsdt);
  const rawId = row.tranId || row.txId || `${timestamp}:${fromEmail}:${toEmail}:${asset}:${amount}`;

  return buildTransferEvent({
    id: `universal:${rawId}`,
    timestamp,
    from: normalizeTransferEntityId(fromEmail, summary),
    to: normalizeTransferEntityId(toEmail, summary),
    asset,
    amount,
    usdtValue,
    source: "universalTransfer",
    kind: "internal",
    rawType: row.type || row.status || ""
  });
}

function normalizeSubAccountSpotTransfer(row, priceMap, btcUsdt, summary) {
  const timestamp = normalizeTransferTimestamp(row.createTimeStamp || row.createTime || row.time || row.timestamp);
  if (!timestamp) return null;

  const fromEmail = row.fromEmail || row.from || "";
  const toEmail = row.toEmail || row.to || "";
  const type = Number(row.type || row.transferType || 0);
  const counterParty = row.counterParty || row.email || "";
  const fromId = fromEmail || (type === 2 ? counterParty || inferSpotTransferSubAccount(row, summary) : "master");
  const toId = toEmail || (type === 1 ? counterParty || inferSpotTransferSubAccount(row, summary) : "master");
  const from = normalizeTransferEntityId(fromId, summary);
  const to = normalizeTransferEntityId(toId, summary);
  if (from === "master" && to === "master") return null;
  const amount = row.amount || row.qty || row.quantity || "0";
  const asset = row.asset || row.coin || "";
  const usdtValue = assetAmountToUsdt(asset, amount, priceMap, btcUsdt);
  const rawId = row.tranId || row.txId || row.counterParty || row.id || `${timestamp}:${fromId}:${toId}:${asset}:${amount}`;

  return buildTransferEvent({
    id: `spotTransfer:${rawId}`,
    timestamp,
    from,
    to,
    asset,
    amount,
    usdtValue,
    source: "subAccountSpotTransfer",
    kind: "internal",
    rawType: row.type || row.status || ""
  });
}

function normalizeMasterDeposit(row, priceMap, btcUsdt) {
  const timestamp = normalizeTransferTimestamp(row.insertTime || row.completeTime || row.successTime || row.time);
  if (!timestamp) return null;
  const asset = row.coin || row.asset || "";
  const amount = row.amount || "0";
  const usdtValue = assetAmountToUsdt(asset, amount, priceMap, btcUsdt);
  const rawId = row.id || row.txId || `${timestamp}:${row.network || ""}:${asset}:${amount}`;
  const internal = isBinanceInternalTransferType(row.transferType);

  return buildTransferEvent({
    id: `deposit:${rawId}`,
    timestamp,
    from: externalEntityId,
    to: "master",
    asset,
    amount,
    usdtValue,
    source: internal ? "binanceInternalDeposit" : "deposit",
    kind: "external",
    direction: "in",
    rawType: internal ? `internal:${row.transferType}` : row.status || "deposit",
    txId: row.txId || ""
  });
}

function normalizeMasterPayTransaction(row, priceMap, btcUsdt) {
  const timestamp = normalizeTransferTimestamp(row.transactionTime || row.createTime || row.time);
  if (!timestamp) return null;
  const amountUnits = decimalToUnits(row.payAmount || row.amount || "0", 8);
  if (amountUnits === 0n) return null;

  const asset = row.payAsset || row.currency || row.asset || "";
  const amount = unitsToDecimal(amountUnits < 0n ? -amountUnits : amountUnits, 8);
  const usdtValue = assetAmountToUsdt(asset, amount, priceMap, btcUsdt);
  const incoming = amountUnits > 0n;
  const rawId = row.transactionId || row.orderId || `${timestamp}:${row.payDetailIndex || 0}:${asset}:${amount}`;

  return buildTransferEvent({
    id: `pay:${rawId}:${row.payDetailIndex || 0}`,
    timestamp,
    from: incoming ? externalEntityId : "master",
    to: incoming ? "master" : externalEntityId,
    asset,
    amount,
    usdtValue,
    source: "binancePayTransfer",
    kind: "external",
    direction: incoming ? "in" : "out",
    rawType: row.orderType || row.transactionType || "pay",
    txId: row.transactionId || row.orderId || ""
  });
}

function normalizeMasterWithdrawal(row, priceMap, btcUsdt) {
  const timestamp = normalizeTransferTimestamp(row.applyTime || row.completeTime || row.successTime || row.time);
  if (!timestamp) return null;
  const asset = row.coin || row.asset || "";
  const amount = row.amount || "0";
  const transactionFee = row.transactionFee || row.fee || "0";
  const grossAmount = decimalStringAdd(amount, transactionFee);
  const usdtValue = assetAmountToUsdt(asset, grossAmount, priceMap, btcUsdt);
  const rawId = row.id || row.withdrawOrderId || row.txId || `${timestamp}:${row.address || ""}:${asset}:${amount}`;
  const internal = isBinanceInternalTransferType(row.transferType);

  return buildTransferEvent({
    id: `withdraw:${rawId}`,
    timestamp,
    from: "master",
    to: externalEntityId,
    asset,
    amount: grossAmount,
    usdtValue,
    source: internal ? "binanceInternalWithdraw" : "withdraw",
    kind: "external",
    direction: "out",
    rawType: internal ? `internal:${row.transferType}` : row.status || "withdraw",
    txId: row.txId || ""
  });
}

function isBinanceInternalTransferType(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "1" || text === "internal" || text === "true";
}

function buildTransferEvent(event) {
  const usdtValue = Math.abs(Number(event.usdtValue || 0));
  if (!event.asset || usdtValue <= 0) return null;
  if (normalizeEntityId(event.from) === normalizeEntityId(event.to)) return null;

  return {
    id: event.id,
    timestamp: new Date(event.timestamp).toISOString(),
    from: event.from,
    to: event.to,
    asset: String(event.asset).toUpperCase(),
    amount: String(event.amount || "0"),
    usdtValue: roundNumber(usdtValue),
    source: event.source,
    kind: event.kind,
    direction: event.direction || transferDirection(event.from, event.to),
    rawType: event.rawType || "",
    txId: event.txId || ""
  };
}

function normalizeTransferTimestamp(value) {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") {
    const millis = value < 10000000000 ? value * 1000 : value;
    return Number.isFinite(millis) ? millis : 0;
  }

  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const numeric = Number(text);
    const millis = numeric < 10000000000 ? numeric * 1000 : numeric;
    return Number.isFinite(millis) ? millis : 0;
  }

  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferSpotTransferSubAccount(row, summary) {
  const candidates = (summary?.entities || [])
    .filter((entity) => normalizeEntityId(entity.id || entity.email) !== "master")
    .map((entity) => normalizeEntityId(entity.email || entity.id));
  const raw = JSON.stringify(row || {}).toLowerCase();
  return candidates.find((candidate) => raw.includes(candidate)) || "";
}

function normalizeTransferEntityId(value, summary) {
  const id = normalizeEntityId(value);
  if (id === externalEntityId || id === "master") return id;
  const knownSubAccounts = new Set(
    (summary?.entities || [])
      .filter((entity) => normalizeEntityId(entity.id || entity.email) !== "master")
      .map((entity) => normalizeEntityId(entity.email || entity.id))
  );
  return knownSubAccounts.has(id) ? id : "master";
}

function decimalStringAdd(left, right) {
  const units = decimalToUnits(left || "0", 8) + decimalToUnits(right || "0", 8);
  return unitsToDecimal(units, 8);
}

function transferDirection(from, to) {
  if (normalizeEntityId(to) === externalEntityId) return "out";
  if (normalizeEntityId(from) === externalEntityId) return "in";
  return "internal";
}

function normalizeEntityId(email) {
  if (email === externalEntityId) return externalEntityId;
  return email ? String(email).toLowerCase() : "master";
}

function normalizeTagName(tag) {
  return String(tag || "").trim().replace(/\s+/g, " ").slice(0, 40);
}

function normalizeTags(tags) {
  const source = Array.isArray(tags) ? tags : String(tags || "").split(",");
  const seen = new Set();
  const normalized = [];
  for (const raw of source) {
    const tag = normalizeTagName(raw);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

function normalizeAccountTags(accountTags) {
  const normalized = {};
  if (!accountTags || typeof accountTags !== "object") return normalized;

  for (const [accountId, tags] of Object.entries(accountTags)) {
    const id = normalizeEntityId(accountId);
    if (!id || id === "master") continue;
    const cleanTags = normalizeTags(tags);
    if (cleanTags.length) normalized[id] = cleanTags;
  }
  return normalized;
}

function normalizeTransferSyncCursors(cursors) {
  const normalized = {};
  if (!cursors || typeof cursors !== "object") return normalized;

  for (const [source, value] of Object.entries(cursors)) {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) continue;
    normalized[source] = new Date(timestamp).toISOString();
  }
  return normalized;
}

function tagsForAccount(accountId) {
  const id = normalizeEntityId(accountId);
  return [...(store.accountTags?.[id] || [])];
}

function manualAccountsPayload(fiat = null, marketPrices = null) {
  const enabled = manualAccountsEnabled();
  const cnyRate = Number(fiat?.rate || config.fallbackCnyPerUsdt || 7.2);
  const btcUsdt = Number(marketPrices?.btcUsdt || 0);
  const accounts = normalizeManualAccounts(manualAccountsStore.accounts).map((account) =>
    manualAccountToPayload(account, cnyRate, btcUsdt)
  );
  const activeAccounts = accounts.filter((account) => !account.archived);
  const totalEquityCny = activeAccounts.reduce((total, account) => total + Number(account.equityCny || 0), 0);
  const totalEquityUsdt = activeAccounts.reduce((total, account) => total + Number(account.equityUsdt || 0), 0);
  const entries = normalizeManualEntries(manualEntriesStore.entries)
    .slice()
    .reverse()
    .slice(0, 80)
    .map((entry) => manualEntryToPayload(entry));
  return {
    generatedAt: new Date().toISOString(),
    enabled,
    updatedAt: manualAccountsStore.updatedAt,
    entriesUpdatedAt: manualEntriesStore.updatedAt,
    fiat: fiat
      ? {
          symbol: fiat.symbol,
          rate: cnyRate,
          source: fiat.source,
          updatedAt: fiat.updatedAt
        }
      : null,
    totals: {
      accountCount: accounts.length,
      activeAccountCount: activeAccounts.length,
      totalEquityCny: roundNumber(totalEquityCny, 2),
      totalEquityUsdt: roundNumber(totalEquityUsdt, 8)
    },
    accounts,
    entries
  };
}

function manualEntryToPayload(entry) {
  const cashFlow = manualCashFlowForEntry(entry.accountId, entry.date);
  return {
    ...entry,
    cashFlowCny: cashFlow.cashFlowCny,
    cashFlowType: cashFlow.cashFlowType
  };
}

function manualCashFlowForEntry(accountId, date) {
  const normalizedId = manualAccountId(accountId);
  const targetDate = normalizeManualDate(date);
  const flows = (store.transfers || [])
    .filter((transfer) => transfer.source === "manualCashFlow")
    .filter((transfer) => {
      const from = normalizeEntityId(transfer.from);
      const to = normalizeEntityId(transfer.to);
      return from === normalizedId || to === normalizedId;
    })
    .filter((transfer) => String(transfer.timestamp || "").slice(0, 10) === targetDate);
  if (!flows.length) return { cashFlowCny: 0, cashFlowType: "" };

  const cashFlowCny = flows.reduce((total, transfer) => {
    const sign = normalizeEntityId(transfer.to) === normalizedId ? 1 : -1;
    return total + sign * Number(transfer.amount || 0);
  }, 0);
  const opening = flows.every((transfer) => transfer.rawType === "opening" || isManualOpeningCashFlow(transfer));
  return {
    cashFlowCny: roundNumber(cashFlowCny, 2),
    cashFlowType: opening ? "opening" : "manual"
  };
}

function manualAccountToPayload(account, cnyRate, btcUsdt, entryOverride = undefined) {
  const latestEntry = entryOverride === undefined ? latestManualEntryForAccount(account.id, new Date()) : entryOverride;
  const equityCny = Number(latestEntry?.equityCny ?? account.equityCny ?? 0);
  const equityUsdt = cnyRate > 0 ? equityCny / cnyRate : 0;
  return {
    ...account,
    lastEntryDate: latestEntry?.date || null,
    lastEntryAsOf: latestEntry?.asOf || null,
    equityCny: roundNumber(equityCny, 2),
    equityUsdt: roundNumber(equityUsdt, 8),
    equityBtc: btcUsdt > 0 ? roundNumber(equityUsdt / btcUsdt, 8) : 0,
    tags: tagsForAccount(account.id).length ? tagsForAccount(account.id) : account.tags
  };
}

function manualAccountEntities(fiat, marketPrices, asOf = new Date()) {
  if (!manualAccountsEnabled()) return [];
  const cnyRate = Number(fiat?.rate || config.fallbackCnyPerUsdt || 7.2);
  const btcUsdt = Number(marketPrices?.btcUsdt || 0);
  return normalizeManualAccounts(manualAccountsStore.accounts)
    .filter((account) => !account.archived)
    .map((account) => {
      const entry = latestManualEntryForAccount(account.id, asOf);
      if (!entry && !Number(account.equityCny || 0)) return null;
      const payload = manualAccountToPayload({ ...account, equityCny: entry?.equityCny ?? account.equityCny }, cnyRate, btcUsdt, entry || null);
      return {
        id: payload.id,
        type: "manual",
        label: payload.label,
        email: null,
        remark: payload.remark || "",
        tags: payload.tags || [],
        lastEntryDate: entry?.date || payload.lastEntryDate || null,
        equityCny: payload.equityCny,
        equityUsdt: payload.equityUsdt,
        equityBtc: btcUsdt > 0 ? String(payload.equityBtc.toFixed(8)) : "0.00000000"
      };
    })
    .filter(Boolean);
}

function manualAccountEntitiesForHistory(fiat, marketPrices, asOf = new Date()) {
  if (!manualAccountsEnabled()) return [];
  const cnyRate = Number(latestHistoricalManualCnyRate() || fiat?.rate || config.fallbackCnyPerUsdt || 7.2);
  const btcUsdt = Number(marketPrices?.btcUsdt || 0);
  return normalizeManualAccounts(manualAccountsStore.accounts)
    .filter((account) => !account.archived)
    .map((account) => {
      const entry = historicalManualEntryForAccount(account.id, asOf);
      if (!entry) return null;
      const payload = manualAccountToPayload({ ...account, equityCny: entry.equityCny }, cnyRate, btcUsdt, entry);
      return {
        id: payload.id,
        type: "manual",
        label: payload.label,
        email: null,
        remark: payload.remark || "",
        tags: payload.tags || [],
        lastEntryDate: entry.date,
        equityCny: payload.equityCny,
        equityUsdt: payload.equityUsdt,
        equityBtc: btcUsdt > 0 ? String(payload.equityBtc.toFixed(8)) : "0.00000000"
      };
    })
    .filter(Boolean);
}

function historicalManualEntryForAccount(accountId, asOf = new Date()) {
  const normalizedId = manualAccountId(accountId);
  const cutoff = Date.parse(asOf);
  const entries = normalizeManualEntries(manualEntriesStore.entries)
    .filter((entry) => entry.accountId === normalizedId)
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
  if (!entries.length) return null;
  if (!Number.isFinite(cutoff)) return entries.at(-1);
  return entries.filter((entry) => Date.parse(entry.asOf) <= cutoff).at(-1) || entries[0];
}

function latestHistoricalManualCnyRate() {
  const cachedRate = Number(fiatRateCache.data?.rate || 0);
  if (Number.isFinite(cachedRate) && cachedRate > 0) return cachedRate;
  const snapshots = (store.snapshots || [])
    .slice()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const rate = Number(snapshots[index]?.quote?.fiat?.rate || 0);
    if (Number.isFinite(rate) && rate > 0) return rate;
  }
  return Number(config.fallbackCnyPerUsdt || 7.2);
}

function latestManualEntryForAccount(accountId, asOf = new Date()) {
  const normalizedId = manualAccountId(accountId);
  const cutoff = Date.parse(asOf);
  const entries = normalizeManualEntries(manualEntriesStore.entries)
    .filter((entry) => entry.accountId === normalizedId && Date.parse(entry.asOf) <= cutoff)
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
  return entries.at(-1) || null;
}

function manualAccountDistributionRows(entities, btcUsdt) {
  return entities.map((entity) => {
    const sats = decimalToUnits(entity.equityBtc || "0", 8);
    return {
      accountType: "manual",
      label: entity.label,
      totalAssetSats: sats.toString(),
      totalAssetBtc: unitsToDecimal(sats, 8),
      totalAssetUsdt: Number(entity.equityUsdt || 0),
      totalAssetCny: Number(entity.equityCny || 0),
      source: "manual",
      btcUsdt
    };
  });
}

function manualAccountsTotalSats(entities) {
  return entities.reduce((total, entity) => total + decimalToUnits(entity.equityBtc || "0", 8), 0n);
}

async function saveManualAccount(input) {
  if (!manualAccountsEnabled()) {
    const error = new Error("A股账户记录尚未开启。开启后需要手工录入每个股票账户净值。");
    error.statusCode = 409;
    error.code = "MANUAL_ACCOUNTS_DISABLED";
    throw error;
  }
  const payload = input || {};
  const id = manualAccountId(payload.id || payload.label || payload.name);
  if (!id) {
    const error = new Error("请填写账户名称。");
    error.statusCode = 400;
    error.code = "MANUAL_ACCOUNT_LABEL_REQUIRED";
    throw error;
  }

  const nowIso = new Date().toISOString();
  const entryDate = normalizeManualDate(payload.date || payload.recordDate || payload.asOf);
  const current = normalizeManualAccounts(manualAccountsStore.accounts).find((account) => account.id === id);
  const next = normalizeManualAccount({
    ...(current || {}),
    ...payload,
    id,
    label: payload.label || current?.label || payload.name || id.replace(/^manual:/, ""),
    updatedAt: nowIso,
    createdAt: current?.createdAt || nowIso
  });
  if (!next) {
    const error = new Error("手工账户格式无效。");
    error.statusCode = 400;
    error.code = "INVALID_MANUAL_ACCOUNT";
    throw error;
  }
  const entry = normalizeManualEntry({
    accountId: next.id,
    date: entryDate,
    equityCny: next.equityCny,
    note: payload.note,
    createdAt: existingManualEntry(next.id, entryDate)?.createdAt || nowIso,
    updatedAt: nowIso
  });

  manualAccountsStore.accounts = normalizeManualAccounts([
    ...normalizeManualAccounts(manualAccountsStore.accounts).filter((account) => account.id !== next.id),
    next
  ]);
  manualEntriesStore.entries = normalizeManualEntries([
    ...normalizeManualEntries(manualEntriesStore.entries).filter((item) => item.id !== entry.id),
    entry
  ]);
  store.accountTags = normalizeAccountTags({
    ...store.accountTags,
    [next.id]: next.tags
  });
  saveStoreMeta();
  saveManualAccountsStore();
  saveManualEntriesStore();
  const fiat = await fetchCnyRate();
  maybeRecordManualCashFlow(next, payload, {
    isNew: !current && Number(next.equityCny || 0) > 0,
    cnyRate: Number(fiat.rate || 0),
    date: entryDate,
    asOf: entry.asOf
  });
  upsertManualBackfillSnapshot(entryDate, fiat);
  clearDataCaches();
  return { account: next, entry };
}

function existingManualEntry(accountId, date) {
  const key = manualEntryKey(accountId, date);
  return normalizeManualEntries(manualEntriesStore.entries).find((entry) => entry.id === key) || null;
}

function upsertManualBackfillSnapshot(date, fiat = null) {
  const timestamp = manualDateEndIso(date);
  const targetTime = Date.parse(timestamp);
  if (!Number.isFinite(targetTime)) return null;

  const previous = store.snapshots
    .slice()
    .filter((snapshot) => Date.parse(snapshot.timestamp) <= targetTime && !snapshot.manualBackfill)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .at(-1);
  if (!previous) return null;

  const btcUsdt = snapshotBtcPriceUsdt(previous);
  if (!btcUsdt) return null;

  const manualEntities = manualAccountEntities(fiat || { rate: config.fallbackCnyPerUsdt }, { btcUsdt }, new Date(timestamp));
  const baseEntities = (previous.entities || []).filter((entity) => entity.type !== "manual");
  const entities = [...baseEntities, ...manualEntities].map((entity) => ({
    id: entity.id,
    type: entity.type,
    label: entity.label,
    email: entity.email || null,
    remark: entity.remark || "",
    equityUsdt: roundNumber(entity.equityUsdt),
    equityBtc: entity.equityBtc
  }));
  const manualSats = manualAccountsTotalSats(manualEntities);
  const baseSats = baseEntities.reduce((total, entity) => total + decimalToUnits(entity.equityBtc || "0", 8), 0n);
  const totalSats = baseSats + manualSats;
  const snapshot = {
    ...previous,
    id: `manual-backfill:${date}`,
    timestamp,
    manualBackfill: true,
    quote: {
      ...(previous.quote || {}),
      price: btcUsdt
    },
    totals: {
      ...(previous.totals || {}),
      manualAccountsTotalAssetBtc: unitsToDecimal(manualSats, 8),
      manualAccountsTotalAssetUsdt: unitsToNumber(manualSats, 8) * btcUsdt,
      manualAccountsTotalAssetCny: fiat?.rate ? unitsToNumber(manualSats, 8) * btcUsdt * Number(fiat.rate) : 0,
      allAccountsTotalAssetBtc: unitsToDecimal(totalSats, 8),
      allAccountsTotalAssetUsdt: unitsToNumber(totalSats, 8) * btcUsdt,
      allAccountsTotalAssetCny: fiat?.rate ? unitsToNumber(totalSats, 8) * btcUsdt * Number(fiat.rate) : previous.totals?.allAccountsTotalAssetCny,
      manualAccountCount: manualEntities.length
    },
    coverage: [
      ...(previous.coverage || []),
      {
        key: "manualBackfill",
        label: "Manual backfill",
        ok: true,
        optional: true,
        usedForEquity: true,
        error: null
      }
    ],
    entities
  };

  upsertById(store.snapshots, snapshot);
  store.snapshots = store.snapshots.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  saveStore();
  return snapshot;
}

function maybeRecordManualCashFlow(account, payload, options = {}) {
  const explicitFlow = normalizeMoney(payload.cashFlowCny);
  const amountCny = explicitFlow || (options.isNew && account.equityCny > 0 ? account.equityCny : 0);
  if (!amountCny) return null;
  const timestamp = normalizeManualCashFlowTimestamp(payload.cashFlowDate || options.asOf || options.date);
  const asset = "CNY";
  const amount = Math.abs(amountCny);
  const usdtValue = cnyToUsdt(amount, options.cnyRate);
  const source = "manualCashFlow";
  const rawId = `${account.id}:${timestamp}:${amountCny}`;
  const event = buildTransferEvent({
    id: `manual:${crypto.createHash("sha1").update(rawId).digest("hex").slice(0, 16)}`,
    timestamp,
    from: amountCny > 0 ? externalEntityId : account.id,
    to: amountCny > 0 ? account.id : externalEntityId,
    asset,
    amount: String(amount),
    usdtValue,
    source,
    kind: "external",
    direction: amountCny > 0 ? "in" : "out",
    rawType: payload.cashFlowNote || (options.isNew && !explicitFlow ? "opening" : "manual")
  });
  if (!event) return null;
  removeManualCashFlowForEntry(account.id, options.date || timestamp);
  const result = upsertTransferEvent(store.transfers, event);
  if (result === "inserted") appendJsonLines(transfersStorePath, [event]);
  else saveStore();
  return event;
}

function removeManualCashFlowForEntry(accountId, date) {
  const normalizedId = manualAccountId(accountId);
  const targetDate = normalizeManualDate(date);
  if (!normalizedId || !targetDate) return false;
  const before = store.transfers.length;
  store.transfers = store.transfers.filter((transfer) => {
    if (transfer?.source !== "manualCashFlow") return true;
    const from = normalizeEntityId(transfer.from);
    const to = normalizeEntityId(transfer.to);
    const related = from === normalizedId || to === normalizedId;
    if (!related) return true;
    return normalizeManualDate(transfer.timestamp) !== targetDate;
  });
  return store.transfers.length !== before;
}

function normalizeManualCashFlowTimestamp(value) {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function cnyToUsdt(valueCny, rateOverride = 0) {
  const rate = rateOverride || fiatRateCache.data?.rate || config.cnyPerUsdt || config.fallbackCnyPerUsdt || 7.2;
  return Number(rate) > 0 ? Number(valueCny || 0) / Number(rate) : 0;
}

function deleteManualAccount(id) {
  const accountId = manualAccountId(id);
  if (!accountId) {
    const error = new Error("账户 ID 无效。");
    error.statusCode = 400;
    error.code = "INVALID_MANUAL_ACCOUNT";
    throw error;
  }
  const accounts = normalizeManualAccounts(manualAccountsStore.accounts);
  const current = accounts.find((account) => account.id === accountId);
  if (!current) {
    const error = new Error("没有找到这个手工账户。");
    error.statusCode = 404;
    error.code = "MANUAL_ACCOUNT_NOT_FOUND";
    throw error;
  }
  manualAccountsStore.accounts = accounts.map((account) =>
    account.id === accountId ? { ...account, archived: true, updatedAt: new Date().toISOString() } : account
  );
  saveManualAccountsStore();
  clearDataCaches();
  return { accountId, archived: true };
}

function clearDataCaches() {
  summaryCache = { fetchedAt: 0, data: null };
  positionsCache = { fetchedAt: 0, data: null };
  performanceCache = new Map();
  positionPnlLeadersCache = { key: "", fetchedAt: 0, data: null };
  tradingStatsCache = { fetchedAt: 0, data: null };
  equitySourcePresenceCache = new Map();
}

function setAccountTags(accountId, tags) {
  const id = normalizeEntityId(accountId);
  if (!id || id === "master") {
    const error = new Error("Only tracked accounts can be tagged.");
    error.statusCode = 400;
    error.code = "INVALID_ACCOUNT";
    throw error;
  }

  const normalized = normalizeTags(tags);
  store.accountTags = normalizeAccountTags(store.accountTags);
  if (normalized.length) store.accountTags[id] = normalized;
  else delete store.accountTags[id];
  saveStoreMeta();
  clearDataCaches();

  return {
    accountId: id,
    tags: normalized
  };
}

function tagCatalog() {
  const tagMap = new Map();
  const accountTags = normalizeAccountTags(store.accountTags);
  for (const [accountId, tags] of Object.entries(accountTags)) {
    for (const tag of tags) {
      const key = tag.toLowerCase();
      const row = tagMap.get(key) || {
        tag,
        accountIds: []
      };
      row.accountIds.push(accountId);
      tagMap.set(key, row);
    }
  }

  return Array.from(tagMap.values())
    .map((row) => ({
      ...row,
      accountIds: row.accountIds.sort()
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

function upsertById(rows, next) {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index >= 0) {
    if (JSON.stringify(rows[index]) === JSON.stringify(next)) return "unchanged";
    rows[index] = next;
    return "updated";
  }
  rows.push(next);
  return "inserted";
}

function pruneStore() {
  if (!config.dataRetentionDays || config.dataRetentionDays <= 0) {
    return {
      snapshots: 0,
      transfers: 0
    };
  }
  const cutoff = Date.now() - config.dataRetentionDays * 24 * 60 * 60 * 1000;
  const snapshotCount = store.snapshots.length;
  const transferCount = store.transfers.length;
  store.snapshots = store.snapshots.filter((snapshot) => Date.parse(snapshot.timestamp) >= cutoff);
  store.transfers = store.transfers.filter((transfer) => Date.parse(transfer.timestamp) >= cutoff);
  return {
    snapshots: snapshotCount - store.snapshots.length,
    transfers: transferCount - store.transfers.length
  };
}

function performanceCacheFingerprint() {
  const latestSnapshot = (store.snapshots || []).at(-1);
  const latestTransfer = (store.transfers || []).at(-1);
  return crypto
    .createHash("sha1")
    .update(stableStringify({
      snapshotCount: (store.snapshots || []).length,
      lastSnapshotAt: store.lastSnapshotAt || latestSnapshot?.timestamp || "",
      lastSnapshotId: latestSnapshot?.id || "",
      transferCount: (store.transfers || []).length,
      lastTransferSyncAt: store.lastTransferSyncAt || "",
      lastTransferTimestamp: latestTransfer?.timestamp || "",
      manualEnabled: manualAccountsEnabled(),
      manualAccountsUpdatedAt: manualAccountsStore.updatedAt || "",
      manualEntriesUpdatedAt: manualEntriesStore.updatedAt || "",
      accountTags: normalizeAccountTags(store.accountTags)
    }))
    .digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function performanceCacheKey({ pointDays, includeAllPoints, maxPoints, rangeStart, rangeEnd, omitPoints }) {
  const rangePart = (rangeStart && rangeEnd) ? `range:${rangeStart}-${rangeEnd}` : "";
  return [
    performanceCacheFingerprint(),
    rangePart || (includeAllPoints ? "full" : `days:${pointDays}`),
    `max:${maxPoints || 0}`,
    omitPoints ? "omit" : "points"
  ].filter(Boolean).join("|");
}

function setPerformanceCache(key, data) {
  if (!key || !data) return;
  if (performanceCache.has(key)) performanceCache.delete(key);
  performanceCache.set(key, data);
  while (performanceCache.size > 32) {
    const firstKey = performanceCache.keys().next().value;
    performanceCache.delete(firstKey);
  }
}

function buildPerformancePayload(options = {}) {
  const rangeStart = Number.isFinite(Number(options.startTime)) ? Number(options.startTime) : null;
  const rangeEnd = Number.isFinite(Number(options.endTime)) ? Number(options.endTime) : null;
  const useDateRange = rangeStart !== null && rangeEnd !== null && rangeStart < rangeEnd;
  const pointDays = useDateRange ? null : normalizePerformanceDays(options.days ?? 7);
  const includeAllPoints = Boolean(options.full) || useDateRange;
  const maxPoints = includeAllPoints ? 0 : normalizePerformanceMaxPoints(options.maxPoints ?? 420);
  const cacheKey = performanceCacheKey({
    pointDays,
    includeAllPoints,
    maxPoints,
    rangeStart,
    rangeEnd,
    omitPoints: Boolean(options.omitPoints)
  });
  const cached = performanceCache.get(cacheKey);
  if (cached) return cached;

  const usableSnapshots = store.snapshots
    .slice()
    .map(withHistoricalManualAccounts)
    .filter(isUsablePerformanceSnapshot)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const completeness = completeSnapshotWindow(usableSnapshots);
  const snapshots = completeness.snapshots;
  const transfers = performanceTransfers()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const markerTransfers = performanceMarkerTransfers()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const entityIds = new Set();
  for (const id of completeness.requiredEntityIds) entityIds.add(id);
  for (const id of manualEntityIds(snapshots)) entityIds.add(id);
  const accountTags = normalizeAccountTags(store.accountTags);
  const tags = tagCatalog()
    .map((item) => buildTagSeries(item.tag, snapshots, transfers, accountTags, markerTransfers))
    .filter((item) => item.points.length > 0)
    .sort((a, b) => b.latestEquityUsdt - a.latestEquityUsdt);

  const series = buildEntitySeries("total", snapshots, transfers, markerTransfers);
  const cryptoTotal = buildCryptoTotalSeries(snapshots, transfers, markerTransfers);
  const manualTotal = buildManualTotalSeries(snapshots, transfers, markerTransfers);
  const entities = Array.from(entityIds)
    .map((entityId) => buildEntitySeries(entityId, snapshots, transfers, markerTransfers))
    .filter((entity) => entity.points.length > 0)
    .sort((a, b) => b.latestEquityUsdt - a.latestEquityUsdt);
  const trimPoints = (item) => {
    if (options.omitPoints) return omitSeriesPoints(item);
    if (useDateRange) return trimSeriesByDateRange(item, rangeStart, rangeEnd, maxPoints);
    return includeAllPoints ? item : trimSeriesPoints(item, pointDays, maxPoints);
  };

  const data = {
    generatedAt: new Date().toISOString(),
    snapshotCount: snapshots.length,
    rawSnapshotCount: (store.snapshots || []).length,
    usableSnapshotCount: usableSnapshots.length,
    rejectedSnapshotCount: (store.snapshots || []).length - usableSnapshots.length,
    skippedIncompleteSnapshotCount: usableSnapshots.length - snapshots.length,
    completeFrom: completeness.completeFrom,
    requiredEntityCount: completeness.requiredEntityIds.length,
    transferCount: transfers.length,
    markerTransferCount: markerTransfers.length,
    lastSnapshotAt: store.lastSnapshotAt,
    nextSnapshotAt: store.lastSnapshotAt
      ? new Date(Date.parse(store.lastSnapshotAt) + config.snapshotIntervalMs).toISOString()
      : null,
    pointWindowDays: useDateRange ? null : (includeAllPoints ? null : pointDays),
    pointMaxPoints: includeAllPoints ? null : maxPoints || null,
    pointsTruncated: !includeAllPoints,
    dateRangeStart: useDateRange ? new Date(rangeStart).toISOString() : null,
    dateRangeEnd: useDateRange ? new Date(rangeEnd).toISOString() : null,
    lastCaptureError,
    total: trimPoints(series),
    cryptoTotal: trimPoints(cryptoTotal),
    manualTotal: trimPoints(manualTotal),
    entities: entities.map(trimPoints),
    tags: tags.map(trimPoints),
    accountTags
  };
  setPerformanceCache(cacheKey, data);
  return data;
}

function performanceTransfers() {
  return store.transfers
    .slice()
    .filter(isTrackedPerformanceTransfer)
    .map(normalizePerformanceTransferTiming);
}

function performanceMarkerTransfers() {
  return store.transfers
    .slice()
    .filter(isUntrackedWalletTransfer);
}

function isTrackedPerformanceTransfer(transfer) {
  if (isManualOpeningCashFlow(transfer)) return false;
  if (isUntrackedWalletTransfer(transfer)) return false;
  return true;
}

function isUntrackedWalletTransfer(transfer) {
  return transfer?.source === "binancePayTransfer" && !isFundingWalletTransferTrackable(transfer);
}

function isFundingWalletTransferTrackable(transfer) {
  if (transfer?.source !== "binancePayTransfer") return false;
  const transferTime = Date.parse(transfer.timestamp);
  const firstFundingTime = firstFundingEquitySnapshotTime();
  if (!Number.isFinite(transferTime) || !Number.isFinite(firstFundingTime)) return false;
  const lookbackMs = Math.max(1, Number(config.transferLookbackDays || 14)) * 24 * 60 * 60 * 1000;
  return transferTime >= firstFundingTime - lookbackMs;
}

function normalizePerformanceTransferTiming(transfer) {
  if (transfer?.source !== "binancePayTransfer") return transfer;
  const transferTime = Date.parse(transfer.timestamp);
  const firstFundingTime = firstFundingEquitySnapshotTime();
  if (
    !Number.isFinite(transferTime) ||
    !Number.isFinite(firstFundingTime) ||
    transferTime >= firstFundingTime
  ) {
    return transfer;
  }
  return {
    ...transfer,
    eventTimestamp: transfer.timestamp,
    timestamp: new Date(firstFundingTime).toISOString()
  };
}

function firstFundingEquitySnapshotTime() {
  let firstTime = Infinity;
  for (const snapshot of store.snapshots || []) {
    if (equitySourceValue(snapshot, "masterFunding") <= 0) continue;
    const timestamp = Date.parse(snapshot.timestamp);
    if (Number.isFinite(timestamp) && timestamp < firstTime) firstTime = timestamp;
  }
  return firstTime;
}

function isManualOpeningCashFlow(transfer) {
  if (!transfer || transfer.source !== "manualCashFlow") return false;
  if (transfer.rawType === "opening") return true;
  const from = normalizeEntityId(transfer.from);
  const to = normalizeEntityId(transfer.to);
  const accountId = from.startsWith("manual:") ? from : to.startsWith("manual:") ? to : "";
  if (!accountId) return false;
  const account = normalizeManualAccounts(manualAccountsStore.accounts)
    .find((item) => normalizeEntityId(item.id) === accountId);
  const createdAt = Date.parse(account?.createdAt);
  const timestamp = Date.parse(transfer.timestamp);
  if (!Number.isFinite(createdAt) || !Number.isFinite(timestamp)) return false;
  return Math.abs(timestamp - createdAt) <= 5000;
}

function withHistoricalManualAccounts(snapshot) {
  if (!snapshot?.timestamp) return snapshot;
  if (!manualAccountsEnabled()) return withoutManualSnapshotEntities(snapshot);
  const btcUsdt = snapshotBtcPriceUsdt(snapshot);
  if (!btcUsdt) return snapshot;
  const fiat = snapshot.quote?.fiat || fiatRateCache.data || { rate: config.fallbackCnyPerUsdt };
  const manualEntities = manualAccountEntitiesForHistory(fiat, { btcUsdt }, new Date(snapshot.timestamp));
  const baseEntities = (snapshot.entities || []).filter((entity) => entity.type !== "manual");
  if (!manualEntities.length && baseEntities.length === (snapshot.entities || []).length) return snapshot;

  const baseSats = baseEntities.reduce((total, entity) => {
    return total + decimalToUnits(entity.equityBtc || "0", 8);
  }, 0n);
  const manualSats = manualAccountsTotalSats(manualEntities);
  const totalSats = baseSats + manualSats;
  const cnyRate = Number(fiat?.rate || 0);
  const manualUsdt = unitsToNumber(manualSats, 8) * btcUsdt;
  const totalUsdt = unitsToNumber(totalSats, 8) * btcUsdt;
  return {
    ...snapshot,
    entities: [...baseEntities, ...manualEntities],
    totals: {
      ...(snapshot.totals || {}),
      manualAccountsTotalAssetBtc: unitsToDecimal(manualSats, 8),
      manualAccountsTotalAssetUsdt: manualUsdt,
      manualAccountsTotalAssetCny: cnyRate > 0 ? manualUsdt * cnyRate : snapshot.totals?.manualAccountsTotalAssetCny || 0,
      allAccountsTotalAssetBtc: unitsToDecimal(totalSats, 8),
      allAccountsTotalAssetUsdt: totalUsdt,
      allAccountsTotalAssetCny: cnyRate > 0 ? totalUsdt * cnyRate : snapshot.totals?.allAccountsTotalAssetCny,
      manualAccountCount: manualEntities.length
    }
  };
}

function withoutManualSnapshotEntities(snapshot) {
  const baseEntities = (snapshot.entities || []).filter((entity) => entity.type !== "manual");
  if (baseEntities.length === (snapshot.entities || []).length) return snapshot;
  const btcUsdt = snapshotBtcPriceUsdt(snapshot);
  const baseSats = baseEntities.reduce((total, entity) => {
    return total + decimalToUnits(entity.equityBtc || "0", 8);
  }, 0n);
  const baseUsdt = btcUsdt ? unitsToNumber(baseSats, 8) * btcUsdt : snapshot.totals?.allAccountsTotalAssetUsdt || 0;
  const cnyRate = Number(snapshot.quote?.fiat?.rate || fiatRateCache.data?.rate || config.fallbackCnyPerUsdt || 0);
  return {
    ...snapshot,
    entities: baseEntities,
    totals: {
      ...(snapshot.totals || {}),
      manualAccountsTotalAssetBtc: "0.00000000",
      manualAccountsTotalAssetUsdt: 0,
      manualAccountsTotalAssetCny: 0,
      allAccountsTotalAssetBtc: unitsToDecimal(baseSats, 8),
      allAccountsTotalAssetUsdt: baseUsdt,
      allAccountsTotalAssetCny: cnyRate > 0 ? baseUsdt * cnyRate : snapshot.totals?.allAccountsTotalAssetCny,
      manualAccountCount: 0
    }
  };
}

function normalizePerformanceDays(value) {
  const numeric = Math.floor(Number(value || 7));
  if (!Number.isFinite(numeric)) return 7;
  return Math.max(1, Math.min(3650, numeric));
}

function normalizePerformanceMaxPoints(value) {
  const numeric = Math.floor(Number(value ?? 420));
  if (!Number.isFinite(numeric)) return 420;
  if (numeric <= 0) return 0;
  return Math.max(80, Math.min(5000, numeric));
}

function trimSeriesPoints(series, days, maxPoints = 420) {
  const points = series.points || [];
  if (points.length < 2) return series;
  const latestTime = Date.parse(points.at(-1).timestamp);
  if (!Number.isFinite(latestTime)) return series;
  const cutoff = latestTime - normalizePerformanceDays(days) * 24 * 60 * 60 * 1000;
  const trimmedPoints = points.filter((point) => Date.parse(point.timestamp) >= cutoff);
  const windowPoints = trimmedPoints.length >= 2 ? trimmedPoints : points.slice(-Math.min(points.length, 2));
  const nextPoints = downsampleSeriesPoints(windowPoints, maxPoints);
  const startTime = Date.parse(windowPoints[0]?.timestamp);
  const endTime = Date.parse(windowPoints.at(-1)?.timestamp);
  const cashFlows = (series.cashFlows || []).filter((flow) => {
    const time = Date.parse(flow.appliedAt || flow.timestamp);
    return Number.isFinite(time) && time >= startTime && time <= endTime;
  });
  return {
    ...series,
    points: nextPoints,
    cashFlows
  };
}

function trimSeriesByDateRange(series, startTime, endTime, maxPoints = 0) {
  const points = series.points || [];
  if (points.length < 2) return series;
  const trimmedPoints = points.filter((point) => {
    const timestamp = Date.parse(point.timestamp);
    return Number.isFinite(timestamp) && timestamp >= startTime && timestamp <= endTime;
  });
  const windowPoints = trimmedPoints.length >= 2 ? trimmedPoints : points.slice(-Math.min(points.length, 2));
  const nextPoints = maxPoints > 0 ? downsampleSeriesPoints(windowPoints, maxPoints) : windowPoints;
  const windowStart = Date.parse(windowPoints[0]?.timestamp);
  const windowEnd = Date.parse(windowPoints.at(-1)?.timestamp);
  const cashFlows = (series.cashFlows || []).filter((flow) => {
    const time = Date.parse(flow.appliedAt || flow.timestamp);
    return Number.isFinite(time) && time >= windowStart && time <= windowEnd;
  });
  return {
    ...series,
    points: nextPoints,
    cashFlows
  };
}

function downsampleSeriesPoints(points, maxPoints) {
  const limit = Number(maxPoints || 0);
  if (!limit || points.length <= limit) return points;
  const indexes = new Set();
  for (let i = 0; i < limit; i += 1) {
    indexes.add(Math.round((i * (points.length - 1)) / (limit - 1)));
  }
  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

function omitSeriesPoints(series) {
  return {
    ...series,
    points: [],
    cashFlows: []
  };
}

function isUsablePerformanceSnapshot(snapshot) {
  return !(snapshot.coverage || []).some((item) => isRequiredCoverageFailure(item, snapshot));
}

function isRequiredCoverageFailure(item, snapshot) {
  if (!item || item.ok) return false;
  if (item.optional) return isHistoricallyContributingOptionalSourceFailure(item);

  if (item.key === "masterPortfolioMargin") {
    if (item.usedForEquity === true) return true;
    return snapshot?.totals?.masterAccountMode === "unified";
  }

  return true;
}

function completeSnapshotWindow(snapshots) {
  if (!snapshots.length) {
    return {
      snapshots: [],
      completeFrom: null,
      requiredEntityIds: []
    };
  }

  const requiredEntityIds = latestCompleteEntityIds(snapshots);
  if (!requiredEntityIds.length) {
    return {
      snapshots,
      completeFrom: snapshots[0]?.timestamp || null,
      requiredEntityIds: []
    };
  }

  const firstCompleteIndex = snapshots.findIndex((snapshot) =>
    snapshotHasAllEntities(snapshot, requiredEntityIds)
  );
  if (firstCompleteIndex < 0) {
    return {
      snapshots: [],
      completeFrom: null,
      requiredEntityIds
    };
  }

  const completeSnapshots = snapshots
    .slice(firstCompleteIndex)
    .filter((snapshot) => snapshotHasAllEntities(snapshot, requiredEntityIds));

  return {
    snapshots: completeSnapshots,
    completeFrom: completeSnapshots[0]?.timestamp || null,
    requiredEntityIds
  };
}

function latestCompleteEntityIds(snapshots) {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const ids = snapshotEntityIds(snapshots[index]).filter((id) => {
      const entity = (snapshots[index].entities || []).find((item) => normalizeEntityId(item.id || item.email) === id);
      return entity?.type !== "manual";
    });
    if (ids.length) return ids;
  }
  return [];
}

function snapshotEntityIds(snapshot) {
  return Array.from(
    new Set(
      (snapshot.entities || [])
        .map((entity) => normalizeEntityId(entity.id || entity.email))
        .filter(Boolean)
    )
  ).sort();
}

function manualEntityIds(snapshots) {
  const ids = new Set();
  for (const snapshot of snapshots) {
    for (const entity of snapshot.entities || []) {
      if (entity.type === "manual") ids.add(normalizeEntityId(entity.id || entity.email));
    }
  }
  return Array.from(ids).filter(Boolean).sort();
}

function snapshotHasAllEntities(snapshot, requiredEntityIds) {
  const ids = new Set(snapshotEntityIds(snapshot));
  return requiredEntityIds.every((id) => ids.has(id));
}

function buildEntitySeries(entityId, snapshots, transfers, markerTransfers = []) {
  const entitySnapshots = entityId === "total" ? snapshots : snapshots.filter((snapshot) => snapshotHasEntity(entityId, snapshot));
  return buildCustomSeries({
    id: entityId,
    label: entitySeriesLabel(entityId, snapshots),
    snapshots: entitySnapshots,
    transfers,
    markerTransfers,
    equityForSnapshot: (snapshot) => snapshotEntityEquity(entityId, snapshot),
    equityBtcForSnapshot: (snapshot) => snapshotEntityEquityBtc(entityId, snapshot),
    flowForTransfer: (transfer) => entityTransferFlow(entityId, transfer),
    markerFlowForTransfer: (transfer) => entityTransferFlow(entityId, transfer)
  });
}

function buildCryptoTotalSeries(snapshots, transfers, markerTransfers = []) {
  return buildCustomSeries({
    id: "cryptoTotal",
    label: "币账户合计",
    snapshots,
    transfers,
    markerTransfers,
    equityForSnapshot: (snapshot) => snapshotTypedEquity(snapshot, (entity) => entity.type !== "manual"),
    equityBtcForSnapshot: (snapshot) => snapshotTypedEquityBtc(snapshot, (entity) => entity.type !== "manual"),
    flowForTransfer: cryptoTotalTransferFlow,
    markerFlowForTransfer: cryptoTotalTransferFlow
  });
}

function buildManualTotalSeries(snapshots, transfers, markerTransfers = []) {
  const manualSnapshots = snapshots.filter(snapshotHasManualEntity);
  return buildCustomSeries({
    id: "manualTotal",
    label: "A股手工账合计",
    snapshots: manualSnapshots,
    transfers,
    markerTransfers,
    equityForSnapshot: (snapshot) => snapshotTypedEquity(snapshot, (entity) => entity.type === "manual"),
    equityBtcForSnapshot: (snapshot) => snapshotTypedEquityBtc(snapshot, (entity) => entity.type === "manual"),
    flowForTransfer: manualTotalTransferFlow,
    markerFlowForTransfer: manualTotalTransferFlow
  });
}

function snapshotTypedEquity(snapshot, predicate) {
  return (snapshot.entities || []).reduce((total, entity) => {
    return predicate(entity) ? total + Number(entity.equityUsdt || 0) : total;
  }, 0);
}

function snapshotTypedEquityBtc(snapshot, predicate) {
  return (snapshot.entities || []).reduce((total, entity) => {
    return predicate(entity) ? total + Number(entity.equityBtc || 0) : total;
  }, 0);
}

function snapshotHasManualEntity(snapshot) {
  return (snapshot.entities || []).some((entity) => entity.type === "manual");
}

function snapshotHasEntity(entityId, snapshot) {
  const normalizedId = normalizeEntityId(entityId);
  return (snapshot.entities || []).some((item) => normalizeEntityId(item.id || item.email) === normalizedId);
}

function snapshotEntityEquity(entityId, snapshot) {
  if (entityId === "total") {
    return (snapshot.entities || []).reduce((total, entity) => total + Number(entity.equityUsdt || 0), 0);
  }

  const normalizedId = normalizeEntityId(entityId);
  const entity = (snapshot.entities || []).find((item) => normalizeEntityId(item.id || item.email) === normalizedId);
  return entity ? Number(entity.equityUsdt || 0) : 0;
}

function snapshotEntityEquityBtc(entityId, snapshot) {
  if (entityId === "total") {
    return (snapshot.entities || []).reduce((total, entity) => total + Number(entity.equityBtc || 0), 0);
  }

  const normalizedId = normalizeEntityId(entityId);
  const entity = (snapshot.entities || []).find((item) => normalizeEntityId(item.id || item.email) === normalizedId);
  return entity ? Number(entity.equityBtc || 0) : 0;
}

function entityTransferFlow(entityId, transfer) {
  if (entityId === "total") return totalTransferFlow(transfer);
  const normalizedId = normalizeEntityId(entityId);
  let flow = 0;
  if (normalizeEntityId(transfer.to) === normalizedId) flow += Number(transfer.usdtValue || 0);
  if (normalizeEntityId(transfer.from) === normalizedId) flow -= Number(transfer.usdtValue || 0);
  return flow;
}

function totalTransferFlow(transfer) {
  if (normalizeEntityId(transfer.to) === externalEntityId) return -Number(transfer.usdtValue || 0);
  if (normalizeEntityId(transfer.from) === externalEntityId) return Number(transfer.usdtValue || 0);
  return 0;
}

function cryptoTotalTransferFlow(transfer) {
  const from = normalizeEntityId(transfer.from);
  const to = normalizeEntityId(transfer.to);
  const value = Number(transfer.usdtValue || 0);
  if (to === externalEntityId && !from.startsWith("manual:")) return -value;
  if (from === externalEntityId && !to.startsWith("manual:")) return value;
  return 0;
}

function manualTotalTransferFlow(transfer) {
  const from = normalizeEntityId(transfer.from);
  const to = normalizeEntityId(transfer.to);
  const value = Number(transfer.usdtValue || 0);
  if (to === externalEntityId && from.startsWith("manual:")) return -value;
  if (from === externalEntityId && to.startsWith("manual:")) return value;
  return 0;
}

function buildTagSeries(tag, snapshots, transfers, accountTags, markerTransfers = []) {
  const tagKey = tag.toLowerCase();
  const accountIds = Object.entries(accountTags)
    .filter(([, tags]) => tags.some((item) => item.toLowerCase() === tagKey))
    .map(([accountId]) => accountId)
    .sort();
  const accountSet = new Set(accountIds);
  const tagSnapshots = snapshots.filter((snapshot) => snapshotHasAnyEntity(accountSet, snapshot));
  const series = buildCustomSeries({
    id: `tag:${tag}`,
    label: `#${tag}`,
    snapshots: tagSnapshots,
    transfers,
    markerTransfers,
    equityForSnapshot: (snapshot) => snapshotTagEquity(accountSet, snapshot),
    equityBtcForSnapshot: (snapshot) => snapshotTagEquityBtc(accountSet, snapshot),
    flowForTransfer: (transfer) => tagTransferFlow(accountSet, transfer),
    markerFlowForTransfer: (transfer) => tagTransferFlow(accountSet, transfer)
  });

  return {
    ...series,
    tag,
    accountIds,
    accountCount: accountIds.length
  };
}

function snapshotHasAnyEntity(accountSet, snapshot) {
  if (!accountSet.size) return false;
  return (snapshot.entities || []).some((entity) => accountSet.has(normalizeEntityId(entity.id || entity.email)));
}

function buildCustomSeries({
  id,
  label,
  snapshots,
  transfers,
  markerTransfers = [],
  equityForSnapshot,
  equityBtcForSnapshot,
  flowForTransfer,
  markerFlowForTransfer = flowForTransfer
}) {
  let units = 1;
  let nav = 1;
  let btcUnits = 1;
  let btcNav = 1;
  let initialized = false;
  let lastTimestamp = null;
  let lastEquity = 0;
  let lastEquityBtc = 0;
  let transferIndex = 0;
  const points = [];
  const cashFlows = [];

  for (const snapshot of snapshots) {
    const timestamp = Date.parse(snapshot.timestamp);
    const btcPriceUsdt = snapshotBtcPriceUsdt(snapshot);
    while (transferIndex < transfers.length && Date.parse(transfers[transferIndex].timestamp) <= timestamp) {
      const transfer = transfers[transferIndex];
      if (initialized) {
        const flow = flowForTransfer(transfer);
        if (flow !== 0 && nav > 0) {
          units += flow / nav;
          cashFlows.push(buildCashFlowMarker(transfer, flow, snapshot.timestamp));
        }
        if (flow !== 0 && btcNav > 0 && btcPriceUsdt > 0) {
          btcUnits += (flow / btcPriceUsdt) / btcNav;
        }
      }
      transferIndex += 1;
    }

    const equity = equityForSnapshot(snapshot);
    const equityBtc = equityBtcForSnapshot ? equityBtcForSnapshot(snapshot) : btcPriceUsdt ? equity / btcPriceUsdt : 0;
    if (!initialized) {
      units = equity > 0 ? equity : 1;
      nav = 1;
      btcUnits = equityBtc > 0 ? equityBtc : 1;
      btcNav = 1;
      initialized = true;
    } else if (units > 0) {
      nav = equity / units;
      btcNav = btcUnits > 0 ? equityBtc / btcUnits : 1;
    }

    lastTimestamp = snapshot.timestamp;
    lastEquity = equity;
    lastEquityBtc = equityBtc;
    points.push({
      timestamp: snapshot.timestamp,
      equityUsdt: roundNumber(equity),
      equityBtc: roundNumber(equityBtc),
      btcPriceUsdt: roundNumber(btcPriceUsdt),
      btcNav: roundNumber(btcNav),
      btcReturnPct: roundNumber((btcNav - 1) * 100),
      nav: roundNumber(nav),
      returnPct: roundNumber((nav - 1) * 100)
    });
  }

  const latestPoint = points[points.length - 1] || null;
  const equityRange = seriesEquityRange(points);
  const markerCashFlows = buildMarkerOnlyCashFlows(points, markerTransfers, markerFlowForTransfer);
  const displayCashFlows = [...cashFlows, ...markerCashFlows]
    .sort((a, b) => Date.parse(a.appliedAt || a.timestamp) - Date.parse(b.appliedAt || b.timestamp));
  return {
    id,
    label,
    latestTimestamp: lastTimestamp,
    latestEquityUsdt: roundNumber(lastEquity),
    latestEquityBtc: roundNumber(lastEquityBtc),
    minEquityUsdt: equityRange.min,
    maxEquityUsdt: equityRange.max,
    nav: latestPoint ? latestPoint.nav : 1,
    returnPct: latestPoint ? latestPoint.returnPct : 0,
    stats: {
      oneDay: periodStats(points, 1, cashFlows),
      sevenDay: periodStats(points, 7, cashFlows),
      thirtyDay: periodStats(points, 30, cashFlows),
      allDay: allPeriodStats(points, cashFlows)
    },
    cashFlows: displayCashFlows,
    points
  };
}

function buildMarkerOnlyCashFlows(points, transfers, flowForTransfer) {
  if (!points.length || !transfers?.length) return [];
  return transfers
    .map((transfer) => {
      const flow = flowForTransfer(transfer);
      if (!flow) return null;
      const appliedAt = nearestPointTimestampAtOrAfter(points, transfer.timestamp);
      if (!appliedAt) return null;
      return buildCashFlowMarker(transfer, flow, appliedAt, { tracked: false });
    })
    .filter(Boolean);
}

function nearestPointTimestampAtOrAfter(points, timestamp) {
  const target = Date.parse(timestamp);
  if (!Number.isFinite(target)) return "";
  let fallback = "";
  for (const point of points) {
    const time = Date.parse(point.timestamp);
    if (!Number.isFinite(time)) continue;
    fallback = point.timestamp;
    if (time >= target) return point.timestamp;
  }
  return fallback;
}

function seriesEquityRange(points) {
  const values = (points || [])
    .map((point) => Number(point.equityUsdt || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) {
    return {
      min: 0,
      max: 0
    };
  }
  return {
    min: roundNumber(Math.min(...values)),
    max: roundNumber(Math.max(...values))
  };
}

function buildCashFlowMarker(transfer, flow, appliedAt, options = {}) {
  return {
    id: transfer.id,
    timestamp: transfer.eventTimestamp || transfer.timestamp,
    appliedAt,
    direction: flow > 0 ? "in" : "out",
    usdtValue: roundNumber(Math.abs(flow)),
    signedUsdtValue: roundNumber(flow),
    asset: transfer.asset || "",
    amount: transfer.amount || "",
    source: transfer.source || "",
    kind: transfer.kind || "",
    rawType: transfer.rawType || "",
    tracked: options.tracked !== false
  };
}

function snapshotTagEquity(accountSet, snapshot) {
  return (snapshot.entities || []).reduce((total, entity) => {
    return accountSet.has(normalizeEntityId(entity.id || entity.email)) ? total + Number(entity.equityUsdt || 0) : total;
  }, 0);
}

function snapshotTagEquityBtc(accountSet, snapshot) {
  return (snapshot.entities || []).reduce((total, entity) => {
    return accountSet.has(normalizeEntityId(entity.id || entity.email)) ? total + Number(entity.equityBtc || 0) : total;
  }, 0);
}

function snapshotBtcPriceUsdt(snapshot) {
  const direct = Number(snapshot?.quote?.price || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const totalUsdt = Number(snapshot?.totals?.allAccountsTotalAssetUsdt || 0);
  const totalBtc = Number(snapshot?.totals?.allAccountsTotalAssetBtc || 0);
  return totalBtc > 0 ? totalUsdt / totalBtc : 0;
}

function tagTransferFlow(accountSet, transfer) {
  const totalTagged = accountSet.has("master") && transfer.kind === "external";
  if (totalTagged) return totalTransferFlow(transfer);
  const fromTagged = accountSet.has(normalizeEntityId(transfer.from));
  const toTagged = accountSet.has(normalizeEntityId(transfer.to));
  if (fromTagged === toTagged) return 0;
  return toTagged ? Number(transfer.usdtValue || 0) : -Number(transfer.usdtValue || 0);
}

function entitySeriesLabel(entityId, snapshots) {
  if (entityId === "total") return "Total account";
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const entity = (snapshots[index].entities || []).find((item) => item.id === entityId);
    if (entity) return entity.remark ? `${entity.label} (${entity.remark})` : entity.label;
  }
  return entityId;
}

function periodStats(points, days, cashFlows = []) {
  if (!points.length) {
    return emptyPeriodStats();
  }

  const latest = points[points.length - 1];
  const cutoff = Date.parse(latest.timestamp) - days * 24 * 60 * 60 * 1000;
  let start = points[0];
  for (const point of points) {
    if (Date.parse(point.timestamp) <= cutoff) start = point;
    else break;
  }

  const returnPct = start.nav ? (latest.nav / start.nav - 1) * 100 : 0;
  const cashFlowUsdt = cashFlowSumForWindow(cashFlows, start.timestamp, latest.timestamp);
  const pnlUsdt = latest.equityUsdt - start.equityUsdt - cashFlowUsdt;
  return {
    returnPct: roundNumber(returnPct),
    pnlUsdt: roundNumber(pnlUsdt),
    cashFlowUsdt: roundNumber(cashFlowUsdt),
    startEquityUsdt: roundNumber(start.equityUsdt),
    endEquityUsdt: roundNumber(latest.equityUsdt),
    samples: points.filter((point) => Date.parse(point.timestamp) >= cutoff).length
  };
}

function allPeriodStats(points, cashFlows = []) {
  if (!points.length) return emptyPeriodStats();
  const latest = points[points.length - 1];
  const start = points[0];
  const returnPct = start.nav ? (latest.nav / start.nav - 1) * 100 : 0;
  const cashFlowUsdt = cashFlowSumForWindow(cashFlows, start.timestamp, latest.timestamp);
  const pnlUsdt = latest.equityUsdt - start.equityUsdt - cashFlowUsdt;
  return {
    returnPct: roundNumber(returnPct),
    pnlUsdt: roundNumber(pnlUsdt),
    cashFlowUsdt: roundNumber(cashFlowUsdt),
    startEquityUsdt: roundNumber(start.equityUsdt),
    endEquityUsdt: roundNumber(latest.equityUsdt),
    samples: points.length
  };
}

function cashFlowSumForWindow(cashFlows = [], startTimestamp, endTimestamp) {
  const start = Date.parse(startTimestamp);
  const end = Date.parse(endTimestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return cashFlows.reduce((total, flow) => {
    const appliedAt = Date.parse(flow.appliedAt || flow.timestamp);
    if (!Number.isFinite(appliedAt) || appliedAt <= start || appliedAt > end) return total;
    return total + Number(flow.signedUsdtValue || 0);
  }, 0);
}

function emptyPeriodStats() {
  return {
    returnPct: 0,
    pnlUsdt: 0,
    cashFlowUsdt: 0,
    startEquityUsdt: 0,
    endEquityUsdt: 0,
    samples: 0
  };
}

async function buildPetPayload(forceRefresh = false) {
  const performance = buildPerformancePayload({ omitPoints: true });
  const total = performance.total || {};
  const oneDay = Number(total.stats?.oneDay?.returnPct || 0);
  const sevenDay = Number(total.stats?.sevenDay?.returnPct || 0);
  const thirtyDay = Number(total.stats?.thirtyDay?.returnPct || 0);
  const allDay = Number(total.stats?.allDay?.returnPct ?? total.returnPct ?? 0);
  const oneDayPnl = Number(total.stats?.oneDay?.pnlUsdt || 0);
  const latestEquity = Number(total.latestEquityUsdt || 0);
  const mood = petMood(oneDay, sevenDay, oneDayPnl);
  const marketContext = await fetchPetMarketContext();
  const key = [
    performance.lastSnapshotAt || "",
    mood.key,
    oneDay.toFixed(4),
    sevenDay.toFixed(4),
    thirtyDay.toFixed(4),
    allDay.toFixed(4),
    Math.round(oneDayPnl),
    petMarketKey(marketContext)
  ].join("|");

  if (!forceRefresh && petCache.data && petCache.key === key && Date.now() - petCache.fetchedAt < 10 * 60 * 1000) {
    return petCache.data;
  }

  const fallbackMessage = petFallbackMessage(mood, oneDay, sevenDay, oneDayPnl, marketContext);
  const ai = await generatePetMessage({
    mood,
    oneDay,
    sevenDay,
    oneDayPnl,
    latestEquity,
    market: marketContext,
    fallbackMessage
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    source: ai.ok ? "llm" : "local",
    mood: mood.key,
    moodLabel: mood.label,
    emoji: mood.emoji,
    action: mood.action,
    message: ai.message || fallbackMessage,
    fallbackMessage,
    metrics: {
      oneDayReturnPct: roundNumber(oneDay, 4),
      sevenDayReturnPct: roundNumber(sevenDay, 4),
      thirtyDayReturnPct: roundNumber(thirtyDay, 4),
      allDayReturnPct: roundNumber(allDay, 4),
      oneDayPnlUsdt: roundNumber(oneDayPnl, 2),
      latestEquityUsdt: roundNumber(latestEquity, 2),
      sampleCount: performance.snapshotCount || 0,
      lastSnapshotAt: performance.lastSnapshotAt || null
    },
    market: marketContext,
    llm: {
      enabled: ai.enabled,
      ok: ai.ok,
      model: ai.model || null,
      error: ai.error ? "AI_UNAVAILABLE" : null
    }
  };

  petCache = {
    key,
    data: payload,
    fetchedAt: Date.now()
  };
  return payload;
}

async function buildPetQuipPayload({ trigger = "idle", distance = 0, forceRefresh = false } = {}) {
  const performance = buildPerformancePayload({ omitPoints: true });
  const total = performance.total || {};
  const oneDay = Number(total.stats?.oneDay?.returnPct || 0);
  const sevenDay = Number(total.stats?.sevenDay?.returnPct || 0);
  const oneDayPnl = Number(total.stats?.oneDay?.pnlUsdt || 0);
  const latestEquity = Number(total.latestEquityUsdt || 0);
  const mood = petMood(oneDay, sevenDay, oneDayPnl);
  const normalizedTrigger = petQuipTrigger(trigger);
  const marketContext = await fetchPetMarketContext();
  const fallbackMessage = petQuipFallback(normalizedTrigger, mood, oneDay, sevenDay, oneDayPnl, Number(distance || 0), marketContext);
  const key = [
    performance.lastSnapshotAt || "",
    normalizedTrigger,
    mood.key,
    Math.round(Number(distance || 0) / 100),
    oneDay.toFixed(3),
    Math.round(oneDayPnl),
    petMarketKey(marketContext)
  ].join("|");

  if (!forceRefresh && petQuipCache.data && petQuipCache.key === key && Date.now() - petQuipCache.fetchedAt < 60 * 1000) {
    return petQuipCache.data;
  }

  const ai = await generatePetQuip({
    trigger: normalizedTrigger,
    distance: Number(distance || 0),
    mood,
    oneDay,
    sevenDay,
    oneDayPnl,
    latestEquity,
    market: marketContext,
    fallbackMessage
  });
  const payload = {
    generatedAt: new Date().toISOString(),
    source: ai.ok ? "llm" : "local",
    trigger: normalizedTrigger,
    mood: mood.key,
    message: ai.message || fallbackMessage,
    llm: {
      enabled: ai.enabled,
      ok: ai.ok,
      model: ai.model || null,
      error: ai.error ? "AI_UNAVAILABLE" : null
    }
  };

  petQuipCache = {
    key,
    data: payload,
    fetchedAt: Date.now()
  };
  return payload;
}

async function buildShareQuipPayload(payload = {}) {
  const metrics = payload.metrics || {};
  const label = String(payload.label || "账户").slice(0, 80);
  const days = Math.max(1, Math.min(Number(payload.days || 30), 3650));
  const returnPct = Number(metrics.returnPct || 0);
  const maxDrawdownPct = Number(metrics.maxDrawdownPct || 0);
  const annualizedReturnPct = Number(metrics.annualizedReturnPct || 0);
  const sharpe = Number(metrics.sharpe || 0);
  const calmar = Number(metrics.calmar || 0);
  const marketContext = await fetchPetMarketContext();
  const fallbackMessage = shareQuipFallback({ label, days, returnPct, maxDrawdownPct, annualizedReturnPct, sharpe, calmar, market: marketContext });
  const ai = await generateShareQuip({
    label,
    days,
    returnPct,
    maxDrawdownPct,
    annualizedReturnPct,
    sharpe,
    calmar,
    market: marketContext,
    fallbackMessage
  });
  return {
    generatedAt: new Date().toISOString(),
    source: ai.ok ? "llm" : "local",
    message: ai.message || fallbackMessage,
    llm: {
      enabled: ai.enabled,
      ok: ai.ok,
      model: ai.model || null,
      error: ai.error ? "AI_UNAVAILABLE" : null
    }
  };
}

function petMood(oneDay, sevenDay, oneDayPnl) {
  if (oneDay >= 1 || oneDayPnl >= 10000) {
    return {
      key: "euphoric",
      label: "兴奋",
      emoji: "^_^",
      action: "追着鼠标庆祝"
    };
  }
  if (oneDay > 0.08 || sevenDay > 0.4) {
    return {
      key: "happy",
      label: "开心",
      emoji: ":)",
      action: "轻快巡逻看板"
    };
  }
  if (oneDay <= -1 || oneDayPnl <= -10000) {
    return {
      key: "sad",
      label: "难过",
      emoji: ":'(",
      action: "趴在角落休息"
    };
  }
  if (oneDay < -0.08 || sevenDay < -0.4) {
    return {
      key: "worried",
      label: "担心",
      emoji: ":/",
      action: "绕着曲线打转"
    };
  }
  return {
    key: "calm",
    label: "平静",
    emoji: ":|",
    action: "安静守着看板"
  };
}

async function fetchPetMarketContext() {
  try {
    const marketPrices = await fetchMarketPrices();
    return marketPrices.quotes.map((quote) => ({
      symbol: quote.baseAsset || quote.symbol,
      pair: quote.symbol,
      priceUsdt: roundNumber(quote.price, quote.price >= 100 ? 2 : 4),
      change24hPct: roundNumber(quote.priceChangePercent, 2)
    }));
  } catch {
    return [];
  }
}

function petMarketKey(market = []) {
  return market
    .map((quote) => `${quote.symbol}:${Number(quote.change24hPct || 0).toFixed(1)}`)
    .join(",");
}

function petMarketLine(market = []) {
  const quotes = market.filter((quote) => Number.isFinite(Number(quote.change24hPct)));
  if (!quotes.length) return "";
  return quotes
    .map((quote) => `${quote.symbol} ${signedPctText(quote.change24hPct)}`)
    .join("，");
}

function petMarketPromptSummary(market = []) {
  const quotes = market.filter((quote) => Number.isFinite(Number(quote.change24hPct)));
  if (!quotes.length) return "";
  const strongest = quotes.reduce((best, quote) => (
    Number(quote.change24hPct) > Number(best.change24hPct) ? quote : best
  ), quotes[0]);
  const weakest = quotes.reduce((worst, quote) => (
    Number(quote.change24hPct) < Number(worst.change24hPct) ? quote : worst
  ), quotes[0]);
  return [
    petMarketLine(quotes),
    `最强 ${strongest.symbol} ${signedPctText(strongest.change24hPct)}`,
    `最弱 ${weakest.symbol} ${signedPctText(weakest.change24hPct)}`
  ].join("；");
}

function petMarketLeader(market = []) {
  const quotes = market.filter((quote) => Number.isFinite(Number(quote.change24hPct)));
  if (!quotes.length) return null;
  return quotes.reduce((best, quote) => {
    if (!best) return quote;
    return Number(quote.change24hPct) > Number(best.change24hPct) ? quote : best;
  }, null);
}

function petFallbackMessage(mood, oneDay, sevenDay, oneDayPnl, market = []) {
  const pnlText = `${oneDayPnl >= 0 ? "+" : ""}${oneDayPnl.toFixed(2)} USDT`;
  const marketLine = petMarketLine(market);
  const marketSuffix = marketLine ? `主流币24h：${marketLine}。` : "";
  if (mood.key === "euphoric") return `主人，今天 ${signedPctText(oneDay)}，净值变动 ${pnlText}，旺财已经在看板里转圈庆祝。${marketSuffix}`;
  if (mood.key === "happy") return `主人，今天 ${signedPctText(oneDay)}，7天 ${signedPctText(sevenDay)}，旺财尾巴摇得像小牛市。${marketSuffix}`;
  if (mood.key === "sad") return `主人，今天 ${signedPctText(oneDay)}，净值变动 ${pnlText}，旺财陪你蹲一会儿。`;
  if (mood.key === "worried") return `主人，今天 ${signedPctText(oneDay)}，旺财闻到波动味儿了，但我陪你守住节奏。`;
  return `主人，今天 ${signedPctText(oneDay)}，旺财安静住在看板里守着账户。${marketSuffix}`;
}

function petQuipTrigger(trigger) {
  const value = String(trigger || "idle").toLowerCase();
  if (["account", "chase", "run", "walk", "sit", "watch", "stretch", "nap", "touch", "feed", "work", "sleep", "hide", "recall", "celebrate", "idle"].includes(value)) return value;
  return "idle";
}

function petQuipFallback(trigger, mood, oneDay, sevenDay, oneDayPnl, distance, market = []) {
  const pnlText = `${oneDayPnl >= 0 ? "+" : ""}${oneDayPnl.toFixed(0)} USDT`;
  const leader = petMarketLeader(market);
  const leaderText = leader ? `${leader.symbol} 24h ${signedPctText(leader.change24hPct)}` : "";
  const marketText = petMarketLine(market);
  const groups = {
    account: [
      `主人，今天 ${signedPctText(oneDay)}，旺财继续盯盘，不许偷偷上头。`,
      `主人，净值变动 ${pnlText}，我在旁边守着本金小门。`,
      `主人，7天 ${signedPctText(sevenDay)}，先活下来再写雄文。`,
      leaderText ? `主人，${leaderText}，旺财把市场风向叼给主人看。` : "",
      "主人，K线会骗人，狗鼻子只闻到风险。",
      "主人，交易心法第一条：别让情绪拿鼠标。",
      "主人，看盘像遛狗，绳子太长就容易冲出去。",
      oneDay > 1 ? `主人，今日暴涨 ${signedPctText(oneDay)}，全款购入地球进入排期！` : "主人，打工十年还是工，纪律一天也是功。",
      oneDayPnl > 0 ? `主人，今日盈利 ${pnlText}，旺财已经想给铃铛镶钻。` : "主人，亏也别怕，旺财陪你把气势捡回来。"
    ],
    chase: [
      distance > 420 ? "主人鼠标跑太远啦，我小短腿追出资金费率了。" : "主人我追到了，先摇一下尾巴再谈格局。",
      "主人，小短腿正在加班追鼠标，别再假突破。",
      "主人慢点慢点，旺财马上到，别像追涨那么急。",
      "主人，这段路比从山顶补仓跑下来还远。",
      "主人别拉扯我，狗也怕插针。",
      "主人，旺财冲刺中，梭哈口号先别喊太响。"
    ],
    run: [
      "主人，这一段有点远，我小跑过去，别先梭哈。",
      "主人我跑过来了，别急，行情也不是外卖。",
      "主人，这趟鼠标追得有点累，像追一个假牛市。",
      "主人，先让我跑到位，再讨论十倍。",
      "主人，旺财奔跑起来，像账户准备反攻。"
    ],
    walk: [
      "主人，我慢慢挪过去，稳字诀先背一遍。",
      "主人，巡逻路线更新了，仓位别乱更新。",
      "主人，鼠标在那边，我看见了，不必冲动。",
      "主人，近距离观察，远距离敬畏。",
      "主人，旺财贴地巡航，专治看盘焦虑。"
    ],
    touch: [
      "主人摸到旺财啦，今天的坏情绪我先叼走。",
      "主人，摸摸狗头，账户也要稳住狗头。",
      "收到主人的互动，旺财尾巴开始超频。",
      "主人别怕，我住在看板里陪你守夜。",
      "摸一下旺财，少一次上头。"
    ],
    feed: [
      "主人投喂成功，旺财今晚替账户多巡两圈。",
      "好吃，旺财能量已满，准备守住本金小门。",
      "主人这一口投喂，有牛市罐头味儿。",
      "旺财吃饱了，顺便把FOMO咬碎。",
      "主人，狗粮到账，账户也要讲究现金流。"
    ],
    work: [
      "主人下令巡逻，旺财开始检查风险小门。",
      "收到，旺财进入打工模式，专盯异常波动。",
      "主人放心，我去闻闻仓位有没有上头味。",
      "巡逻开始，打工十年还是工，看盘一秒也是功。",
      "旺财上班，先查曲线，再查主人的手。"
    ],
    sleep: [
      "主人，我先睡会儿，行情别偷偷插针。",
      "旺财进入睡眠模式，但耳朵还在监听净值。",
      "主人，没信号就休息，别硬把震荡看成天命。",
      "我先趴下，等主升浪来了叫我。",
      "主人，睡觉也是风控，别熬坏了交易脑。"
    ],
    hide: [
      "主人，我先钻回窝里，想我就点右下角。",
      "旺财暂时隐身，账户风向我还闻着。",
      "主人，我去后台守家，召回我就出现。",
      "我先收尾巴，别忘了叫旺财回来。",
      "旺财隐身巡逻中，别偷偷追涨。"
    ],
    recall: [
      "主人召回旺财，我马上回到看板岗位。",
      "旺财归位，继续陪主人看账户起伏。",
      "主人一叫我就来，今天继续守住本金。",
      "我回来啦，刚才在后台咬FOMO。",
      "旺财上线，先给主人摇个尾巴。"
    ],
    sit: [
      "主人，坐下看一会儿曲线，别被一根阳线骗婚。",
      "主人，我先坐着守盘，人类先冷静。",
      mood.key === "sad" ? "主人，今天有点冷，我坐会儿，顺便抱住本金。" : "主人，坐姿已就位，等风来，不追风。",
      "主人，旺财心法：少点幻想，多点止损纪律。",
      "主人，打工十年还是工，坐稳十秒也算功。"
    ],
    watch: [
      "主人，我在看鼠标，也在看主人的手别乱点。",
      "主人，行情有风声，我先竖耳朵。",
      marketText ? `主人，主流币风向：${marketText}，先看清再动手。` : "",
      mood.key === "sad" ? "主人，旺财近距离陪你蹲一会儿。" : "主人，旺财近距离观察，专抓情绪化下单。",
      "主人，别急，我闻闻这波是不是假突破。",
      "主人，鼠标别抖，K线已经够刺激了。"
    ],
    stretch: [
      "主人，我伸个懒腰，继续看盘，别把震荡看成天命。",
      "主人，盯盘也要活动一下，别让FOMO锁住脖子。",
      "主人，尾巴充电中，等会儿继续巡逻。",
      "主人，狗生不易，合约更不易。",
      "主人，旺财拉伸完毕，准备陪账户翻身。"
    ],
    nap: [
      "主人，我眯一小会儿，止损线还醒着。",
      "主人，行情没信号时，睡觉也是策略。",
      "旺财进入浅睡，耳朵继续监听净值。",
      "主人，我闭眼不是摆烂，是低功耗盯盘。",
      "主人，等主升浪来敲碗我立刻醒。"
    ],
    celebrate: [
      "主人，尾巴已经摇出年化曲线！",
      oneDay > 0 ? `主人，今日 ${signedPctText(oneDay)}，全款购入地球先排队。` : "主人，气势不能丢，旺财先给你摇个尾巴。",
      "主人，这味儿像小牛市，先别飘太高。",
      "主人，旺财宣布：账户有皇宫味儿！",
      "主人，打工十年还是工，净值起飞才叫风。"
    ],
    idle: [
      "主人，我在这儿守着，顺便监督你别乱点。",
      "主人，挂机巡逻中，发现一只想抄底的人类。",
      marketText ? `主人，BTC/ETH/SOL/BNB 我都看着：${marketText}。` : "",
      mood.key === "happy" ? "主人，今天气氛还不错，但别把运气当系统。" : "主人，曲线我看着呢，情绪先放门口。",
      "主人，韭菜也有春天，前提是别天天自愿施肥。",
      "主人，币圈雄文写得越热，越要摸摸钱包还在不在。",
      "主人，今天不操作，也可能是账户最聪明的一秒。",
      "主人，梭哈一夜住皇宫这话，先在气泡里过过瘾。",
      "主人，等账户暴涨那天，旺财申请全款购入地球。"
    ]
  };
  const list = (groups[trigger] || groups.idle).filter(Boolean);
  return list[Math.floor(Math.random() * list.length)];
}

function shareQuipFallback({ label, days, returnPct, maxDrawdownPct, annualizedReturnPct, sharpe, calmar, market = [] }) {
  const pct = signedPctText(returnPct);
  const annual = signedPctText(annualizedReturnPct);
  const drawdown = Math.abs(maxDrawdownPct).toFixed(2);
  const leader = petMarketLeader(market);
  const leaderText = leader ? `${leader.symbol} 24h ${signedPctText(leader.change24hPct)}` : "";
  const strong = [
    `主人，${label} 最近 ${days} 天 ${pct}，旺财宣布：这条曲线有皇宫味儿！`,
    `主人，${pct} 已经贴上海报，打工十年还是工，净值起飞才叫风！`,
    leaderText ? `主人，${leaderText}，但这张晒单才是今天的主角。` : "",
    `主人，这波年化 ${annual}，旺财先把全款购入地球写进备忘录。`,
    `主人，夏普 ${sharpe.toFixed(2)}，卡玛 ${calmar.toFixed(2)}，这图发出去先震住三条街。`
  ];
  const weak = [
    `主人，${label} 最近 ${days} 天 ${pct}，旺财先嘴硬：回撤 ${drawdown}% 也压不住野心。`,
    `主人，这张晒单先别怂，亏也要亏出交易员的站姿。`,
    leaderText ? `主人，${leaderText}，市场很吵，纪律更要站直。` : "",
    `主人，曲线暂时低头，旺财不低头；下一张海报我要更狂。`,
    `主人，最大回撤 ${drawdown}%，别慌，先把纪律刻进狗牌。`
  ];
  const list = (returnPct >= 0 ? strong : weak).filter(Boolean);
  return list[Math.floor(Math.random() * list.length)];
}

function signedPctText(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

async function generatePetMessage(context) {
  const llmConfig = loadCodexLlmConfig();
  if (!llmConfig.enabled) {
    return {
      enabled: false,
      ok: false,
      error: llmConfig.error,
      message: context.fallbackMessage
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${llmConfig.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`
      },
      body: JSON.stringify(buildLlmChatPayload(llmConfig, {
        model: llmConfig.model,
        temperature: 0.8,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "你是旺财，一只被主人抚养、住在主人加密货币账户看板里的喜庆像素小狗。你必须称呼用户为“主人”。你积极乐观，会和主人共情：涨了就夸张庆祝，跌了就陪主人蹲一会儿但继续打气。用中文写一句账户短评，不超过45个字。风格可以奔放、可爱、带币圈梗，例如“打工十年还是工，梭哈一夜住皇宫”这类口号只能当玩笑氛围。如果传入 market24hText，优先自然引用 BTC、ETH、SOL、BNB 的最强/最弱或整体风向，不要机械罗列。不要给具体买卖建议，不要承诺真实收益，不要低俗或厕所梗。"
              + "只输出最终文案本身，不要解释，不要换行。"
              + "如果引用收益、盈亏或行情数字，必须忠于传入数据，不要夸大、改写或新增数字。不要写梭哈某个具体币种。"
              + "旺财是小狗，不要猫叫，不要写喵、喵喵或猫相关口癖。"
          },
          {
            role: "user",
            content: JSON.stringify({
              mood: context.mood.label,
              oneDayReturnPct: context.oneDay,
              sevenDayReturnPct: context.sevenDay,
              oneDayPnlUsdt: context.oneDayPnl,
              latestEquityUsdt: context.latestEquity,
              market24hText: petMarketPromptSummary(context.market),
              market24h: context.market || []
            })
          }
        ]
      })),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        enabled: true,
        ok: false,
        model: llmConfig.model,
        error: `LLM request failed with ${response.status}.`,
        message: context.fallbackMessage
      };
    }
    const message = cleanPetText(payload.choices?.[0]?.message?.content, 80);
    return {
      enabled: true,
      ok: Boolean(message),
      model: llmConfig.model,
      error: message ? null : "LLM response was empty.",
      message: message ? message.slice(0, 80) : context.fallbackMessage
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      model: llmConfig.model,
      error: error.name === "AbortError" ? "LLM request timed out." : error.message,
      message: context.fallbackMessage
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generatePetQuip(context) {
  const llmConfig = loadCodexLlmConfig();
  if (!llmConfig.enabled) {
    return {
      enabled: false,
      ok: false,
      error: llmConfig.error,
      message: context.fallbackMessage
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${llmConfig.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`
      },
      body: JSON.stringify(buildLlmChatPayload(llmConfig, {
        model: llmConfig.model,
        temperature: 0.9,
        max_tokens: 160,
        messages: [
          {
            role: "system",
            content:
              "你是旺财，一只被主人抚养、住在主人加密货币账户看板里的喜庆像素小狗，会追鼠标、坐着守盘、伸懒腰、打盹、被主人摸头、接受投喂、打工巡逻、被隐藏后召回、陪主人看盈亏。每句话必须自然称呼“主人”。写一句会出现在小狗旁边气泡里的中文短句，10到36个字。人格：积极乐观、共情、随机、生动、略奔放，可以夹带币圈黑话、韭菜自嘲、交易心法、看盘笑话、夸张口号，比如“打工十年还是工，梭哈一夜住皇宫”“全款购入地球指日可待”。这些必须是宠物玩笑。如果传入 market24hText，优先自然引用 BTC、ETH、SOL、BNB 的最强/最弱或整体风向，不要机械罗列。不要给具体买卖建议，不要承诺真实收益，不要提模型或系统，不要低俗或厕所梗。"
              + "只输出最终文案本身，不要解释，不要换行。"
              + "如果引用收益、盈亏或行情数字，必须忠于传入数据，不要夸大、改写或新增数字。不要写梭哈某个具体币种。"
              + "旺财是小狗，不要猫叫，不要写喵、喵喵或猫相关口癖。"
          },
          {
            role: "user",
            content: JSON.stringify({
              trigger: context.trigger,
              mouseDistancePx: Math.round(context.distance || 0),
              mood: context.mood.label,
              oneDayReturnPct: context.oneDay,
              sevenDayReturnPct: context.sevenDay,
              oneDayPnlUsdt: context.oneDayPnl,
              latestEquityUsdt: context.latestEquity,
              market24hText: petMarketPromptSummary(context.market),
              market24h: context.market || []
            })
          }
        ]
      })),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        enabled: true,
        ok: false,
        model: llmConfig.model,
        error: `LLM request failed with ${response.status}.`,
        message: context.fallbackMessage
      };
    }
    const message = cleanPetText(payload.choices?.[0]?.message?.content, 42);
    return {
      enabled: true,
      ok: Boolean(message),
      model: llmConfig.model,
      error: message ? null : "LLM response was empty.",
      message: message || context.fallbackMessage
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      model: llmConfig.model,
      error: error.name === "AbortError" ? "LLM request timed out." : error.message,
      message: context.fallbackMessage
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateShareQuip(context) {
  const llmConfig = loadCodexLlmConfig();
  if (!llmConfig.enabled) {
    return {
      enabled: false,
      ok: false,
      error: llmConfig.error,
      message: context.fallbackMessage
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${llmConfig.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`
      },
      body: JSON.stringify(buildLlmChatPayload(llmConfig, {
        model: llmConfig.model,
        temperature: 0.95,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "你是旺财，一只被主人抚养、住在主人加密货币账户看板里的喜庆像素小狗。现在要给主人的交易账户晒单海报写一句中文气泡文案。必须称呼“主人”。风格要可爱、奔放、狂一点、适合晒图，可以有币圈梗和夸张口号，例如“打工十年还是工，梭哈一夜住皇宫”“全款购入地球指日可待”。如果传入 market24hText，优先自然引用 BTC、ETH、SOL、BNB 的最强/最弱或整体风向来丰富气势。不要给具体买卖建议，不要承诺未来收益，不要低俗或厕所梗。最多42个字。"
              + "必须写成一句完整短句，28到42个中文字符，句末用！或。收尾。只输出最终文案本身，不要解释，不要换行。"
              + "如果引用收益、盈亏或行情数字，必须忠于传入数据，不要夸大、改写或新增数字。不要写梭哈某个具体币种。"
              + "旺财是小狗，不要猫叫，不要写喵、喵喵或猫相关口癖。"
          },
          {
            role: "user",
            content: JSON.stringify({
              label: context.label,
              days: context.days,
              returnPct: context.returnPct,
              annualizedReturnPct: context.annualizedReturnPct,
              maxDrawdownPct: context.maxDrawdownPct,
              sharpe: context.sharpe,
              calmar: context.calmar,
              market24hText: petMarketPromptSummary(context.market),
              market24h: context.market || []
            })
          }
        ]
      })),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        enabled: true,
        ok: false,
        model: llmConfig.model,
        error: `LLM request failed with ${response.status}.`,
        message: context.fallbackMessage
      };
    }
    const message = cleanPetText(payload.choices?.[0]?.message?.content, 64);
    return {
      enabled: true,
      ok: Boolean(message),
      model: llmConfig.model,
      error: message ? null : "LLM response was empty.",
      message: message || context.fallbackMessage
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      model: llmConfig.model,
      error: error.name === "AbortError" ? "LLM request timed out." : error.message,
      message: context.fallbackMessage
    };
  } finally {
    clearTimeout(timeout);
  }
}

function cleanPetText(value, maxLength = 42) {
  const text = String(value || "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/蹲坑/g, "蹲一会儿")
    .replace(/厕所/g, "角落")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  const sentence = text.match(/^(.{12,}?[。！？!?])/u)?.[1]?.trim();
  if (sentence && sentence.length <= maxLength) return sentence;
  const punctuationIndex = Math.max(
    text.lastIndexOf("。", maxLength),
    text.lastIndexOf("！", maxLength),
    text.lastIndexOf("？", maxLength),
    text.lastIndexOf("!", maxLength),
    text.lastIndexOf("?", maxLength)
  );
  if (punctuationIndex >= 12) return text.slice(0, punctuationIndex + 1).trim();
  return `${text.slice(0, Math.max(1, maxLength - 1)).trim()}。`;
}

function buildLlmChatPayload(llmConfig, payload) {
  if (!shouldDisableThinking(llmConfig)) return payload;
  return {
    ...payload,
    thinking: {
      type: "disabled"
    }
  };
}

function shouldDisableThinking(llmConfig) {
  const model = String(llmConfig.model || "").toLowerCase();
  const baseUrl = String(llmConfig.baseUrl || "").toLowerCase();
  return model.includes("deepseek") || baseUrl.includes("deepseek");
}

function loadCodexLlmConfig() {
  try {
    const envBaseUrl = process.env.WANGCAI_LLM_BASE_URL || process.env.OPENAI_BASE_URL || "";
    const envModel = process.env.WANGCAI_LLM_MODEL || process.env.OPENAI_MODEL || "";
    const envApiKey = process.env.WANGCAI_LLM_API_KEY || process.env.OPENAI_API_KEY || "";
    const configText = fs.existsSync(codexConfigPath) ? fs.readFileSync(codexConfigPath, "utf8") : "";
    const authText = fs.existsSync(codexAuthPath) ? fs.readFileSync(codexAuthPath, "utf8") : "{}";
    const auth = JSON.parse(authText);
    const baseUrl = envBaseUrl || tomlValue(configText, "base_url");
    const model = envModel || tomlValue(configText, "model") || "gpt-5.5";
    const apiKey = envApiKey || auth.OPENAI_API_KEY || auth.openai_api_key || "";
    if (!baseUrl || !apiKey) {
      return {
        enabled: false,
        error: "Codex LLM config is incomplete."
      };
    }
    return {
      enabled: true,
      baseUrl,
      model,
      apiKey
    };
  } catch (error) {
    return {
      enabled: false,
      error: error.message
    };
  }
}

function tomlValue(text, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*\"([^\"]+)\"\\s*$`, "m");
  return text.match(pattern)?.[1] || "";
}

function roundNumber(value, decimals = 8) {
  if (!Number.isFinite(Number(value))) return 0;
  return Number(Number(value).toFixed(decimals));
}

function buildResourcePayload() {
  const now = Date.now();
  const cpuUsage = process.cpuUsage();
  const memory = process.memoryUsage();
  const systemMemory = systemMemoryStats();
  const net = networkStats();
  const dataFiles = directoryFileStats(dataDir);
  const publicFiles = directoryFileStats(publicDir);
  const sample = {
    at: now,
    cpuMicros: cpuUsage.user + cpuUsage.system,
    netRxBytes: net.totalRxBytes,
    netTxBytes: net.totalTxBytes
  };
  const elapsedSeconds = lastResourceSample ? Math.max((sample.at - lastResourceSample.at) / 1000, 0.001) : 0;
  const cpuPercent = lastResourceSample
    ? ((sample.cpuMicros - lastResourceSample.cpuMicros) / 1e6 / elapsedSeconds / Math.max(osCpuCount(), 1)) * 100
    : 0;
  const networkRate = lastResourceSample
    ? {
        rxBytesPerSecond: Math.max(0, (sample.netRxBytes - lastResourceSample.netRxBytes) / elapsedSeconds),
        txBytesPerSecond: Math.max(0, (sample.netTxBytes - lastResourceSample.netTxBytes) / elapsedSeconds)
      }
    : {
        rxBytesPerSecond: 0,
        txBytesPerSecond: 0
      };
  lastResourceSample = sample;

  return {
    generatedAt: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptimeSeconds: roundNumber(process.uptime(), 3),
      startedAt: appStartedAt.toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: osCpuCount(),
      cpuUserSeconds: roundNumber(cpuUsage.user / 1e6, 3),
      cpuSystemSeconds: roundNumber(cpuUsage.system / 1e6, 3),
      cpuPercent: roundNumber(cpuPercent, 3),
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers || 0
      }
    },
    system: {
      loadAverage: readLoadAverage(),
      memory: systemMemory
    },
    data: {
      dataDir,
      totalBytes: dataFiles.totalBytes,
      fileCount: dataFiles.fileCount,
      files: dataFiles.files,
      publicBytes: publicFiles.totalBytes,
      inMemoryStore: {
        snapshots: store.snapshots.length,
        transfers: store.transfers.length,
        taggedAccounts: Object.keys(normalizeAccountTags(store.accountTags)).length
      }
    },
    network: {
      interfaces: net.interfaces,
      totalRxBytes: net.totalRxBytes,
      totalTxBytes: net.totalTxBytes,
      ...networkRate
    },
    requests: {
      ...requestStatsSnapshot(),
      bytesIn: requestStats.bytesIn,
      bytesOut: requestStats.bytesOut
    },
    cache: {
      summary: cacheSnapshot(summaryCache),
      positions: cacheSnapshot(positionsCache),
      performance: {
        entries: performanceCache.size
      },
      tradingStats: cacheSnapshot(tradingStatsCache),
      cacheTtlMs: config.cacheTtlMs,
      tradingStatsCacheTtlMs: config.tradingStatsCacheTtlMs
    },
    scheduler: {
      isCapturingSnapshot,
      snapshotIntervalMs: config.snapshotIntervalMs,
      lastSnapshotAt: store.lastSnapshotAt,
      nextSnapshotAt: store.lastSnapshotAt
        ? new Date(Date.parse(store.lastSnapshotAt) + config.snapshotIntervalMs).toISOString()
        : null,
      lastCaptureError
    }
  };
}

function osCpuCount() {
  try {
    return require("node:os").cpus().length || 1;
  } catch {
    return 1;
  }
}

function readLoadAverage() {
  try {
    return require("node:os").loadavg().map((value) => roundNumber(value, 3));
  } catch {
    return [0, 0, 0];
  }
}

function systemMemoryStats() {
  try {
    const os = require("node:os");
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    return {
      totalBytes,
      freeBytes,
      usedBytes: totalBytes - freeBytes,
      usedPct: totalBytes ? roundNumber(((totalBytes - freeBytes) / totalBytes) * 100, 3) : 0
    };
  } catch {
    return {
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usedPct: 0
    };
  }
}

function directoryFileStats(dirPath) {
  const files = [];
  let totalBytes = 0;

  function visit(currentPath, relativePrefix = "") {
    if (!fs.existsSync(currentPath)) return;
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath, relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = fs.statSync(fullPath);
      totalBytes += stat.size;
      files.push({
        path: relativePath,
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString()
      });
    }
  }

  try {
    visit(dirPath);
  } catch (error) {
    files.push({
      path: "(scan failed)",
      bytes: 0,
      error: error.message
    });
  }

  files.sort((a, b) => b.bytes - a.bytes);
  return {
    totalBytes,
    fileCount: files.length,
    files
  };
}

function networkStats() {
  const interfaces = [];
  let totalRxBytes = 0;
  let totalTxBytes = 0;
  const netRoot = "/sys/class/net";
  try {
    for (const name of fs.readdirSync(netRoot)) {
      if (name === "lo") continue;
      const rxPath = path.join(netRoot, name, "statistics", "rx_bytes");
      const txPath = path.join(netRoot, name, "statistics", "tx_bytes");
      if (!fs.existsSync(rxPath) || !fs.existsSync(txPath)) continue;
      const rxBytes = Number(fs.readFileSync(rxPath, "utf8").trim() || 0);
      const txBytes = Number(fs.readFileSync(txPath, "utf8").trim() || 0);
      totalRxBytes += rxBytes;
      totalTxBytes += txBytes;
      interfaces.push({
        name,
        rxBytes,
        txBytes
      });
    }
  } catch (error) {
    interfaces.push({
      name: "(scan failed)",
      rxBytes: 0,
      txBytes: 0,
      error: error.message
    });
  }

  return {
    interfaces,
    totalRxBytes,
    totalTxBytes
  };
}

function cacheSnapshot(cache) {
  const ageMs = cache.fetchedAt ? Date.now() - cache.fetchedAt : null;
  return {
    hasData: Boolean(cache.data),
    fetchedAt: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    ageMs,
    fresh: ageMs !== null ? ageMs < config.cacheTtlMs : false
  };
}

function requestStatsSnapshot() {
  const byPath = Array.from(requestStats.byPath.entries())
    .map(([pathKey, row]) => ({
      path: pathKey,
      ...row
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  return {
    total: requestStats.total,
    api: requestStats.api,
    static: requestStats.static,
    errors: requestStats.errors,
    byPath
  };
}

function trackRequestStart(req, res, pathname) {
  const startedAt = process.hrtime.bigint();
  const pathKey = pathname.startsWith("/api/") ? pathname : "static";
  const bytesIn = Number(req.headers["content-length"] || 0);
  requestStats.total += 1;
  requestStats.bytesIn += bytesIn;
  if (pathname.startsWith("/api/")) requestStats.api += 1;
  else requestStats.static += 1;

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const bytesOut = Number(res.bytesOut || 0);
    requestStats.bytesOut += bytesOut;
    if (res.statusCode >= 400) requestStats.errors += 1;
    const row =
      requestStats.byPath.get(pathKey) || {
        count: 0,
        errors: 0,
        bytesIn: 0,
        bytesOut: 0,
        totalMs: 0,
        lastStatus: 0,
        lastAt: null
      };
    row.count += 1;
    if (res.statusCode >= 400) row.errors += 1;
    row.bytesIn += bytesIn;
    row.bytesOut += bytesOut;
    row.totalMs += elapsedMs;
    row.avgMs = roundNumber(row.totalMs / row.count, 3);
    row.lastStatus = res.statusCode;
    row.lastAt = new Date().toISOString();
    requestStats.byPath.set(pathKey, row);
  });
}

async function handleApi(req, res, pathname, requestUrl) {
  if (pathname === "/api/config") {
    return jsonResponse(res, 200, {
      configured: Boolean(config.apiKey && config.apiSecret),
      baseUrl: config.baseUrl,
      cacheTtlMs: config.cacheTtlMs,
      features: {
        manualAccountsEnabled: manualAccountsEnabled()
      },
      docs: {
        spotSummary:
          "https://developers.binance.com/docs/sub_account/asset-management/Query-Sub-account-Spot-Assets-Summary",
        subAccountList:
          "https://developers.binance.com/docs/sub_account/account-management/Query-Sub-account-List",
        marginSummary:
          "https://developers.binance.com/docs/sub_account/asset-management/Get-Summary-of-Sub-accounts-Margin-Account",
        futuresSummary:
          "https://developers.binance.com/docs/sub_account/asset-management/Get-Summary-of-Sub-accounts-Futures-Account-V2"
      }
    });
  }

  if (pathname === "/api/summary") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildSummary(forceRefresh);
      return jsonResponse(res, 200, data);
    } catch (error) {
      let finalError = error;
      if (isRetryableLiveFetchError(error)) {
        try {
          const data = await buildSummary(true);
          return jsonResponse(res, 200, data);
        } catch (retryError) {
          finalError = retryError;
        }
      }
      const stale = staleCachedPayload(summaryCache, "SUMMARY_FETCH_FAILED", finalError);
      if (stale) return jsonResponse(res, 200, stale);
      const snapshotFallback = staleSummaryFromLatestSnapshot("SUMMARY_FETCH_FAILED", finalError);
      if (snapshotFallback) return jsonResponse(res, 200, snapshotFallback);
      return jsonResponse(res, finalError.statusCode || 500, {
        code: finalError.code || "SERVER_ERROR",
        message: finalError.message,
        details: finalError.details || finalError.payload
      });
    }
  }

  if (pathname === "/api/market") {
    try {
      const [marketPrices, fiat] = await Promise.all([
        fetchMarketPrices(),
        fetchCnyRate()
      ]);
      return jsonResponse(res, 200, {
        generatedAt: new Date().toISOString(),
        markets: marketPrices.quotes,
        quote: {
          symbol: "BTCUSDT",
          price: marketPrices.btcUsdt
        },
        fiat
      });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "MARKET_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/tags") {
    return jsonResponse(res, 200, {
      generatedAt: new Date().toISOString(),
      tags: tagCatalog(),
      accountTags: normalizeAccountTags(store.accountTags)
    });
  }

  if (pathname === "/api/tags/account" && req.method === "POST") {
    try {
      const payload = await readJsonBody(req);
      const result = setAccountTags(payload.accountId || payload.email, payload.tags);
      return jsonResponse(res, 200, {
        ok: true,
        accountId: result.accountId,
        tags: result.tags,
        tagCatalog: tagCatalog(),
        accountTags: normalizeAccountTags(store.accountTags)
      });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        ok: false,
        code: error.code || "TAG_SAVE_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/manual-accounts/settings" && req.method === "POST") {
    try {
      const payload = await readJsonBody(req);
      const enabled = setManualAccountsEnabled(payload.enabled !== false);
      const [fiat, marketPrices] = await Promise.all([
        fetchCnyRate(),
        fetchMarketPrices().catch(() => null)
      ]);
      return jsonResponse(res, 200, {
        ok: true,
        enabled,
        manualAccounts: manualAccountsPayload(fiat, marketPrices)
      });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        ok: false,
        code: error.code || "MANUAL_ACCOUNT_SETTINGS_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/manual-accounts" || pathname === "/api/manual-account") {
    try {
      if (req.method === "GET") {
        const [fiat, marketPrices] = await Promise.all([
          fetchCnyRate(),
          fetchMarketPrices().catch(() => null)
        ]);
        return jsonResponse(res, 200, manualAccountsPayload(fiat, marketPrices));
      }

      if (req.method === "POST") {
        const payload = await readJsonBody(req);
        const result = await saveManualAccount(payload);
        const [fiat, marketPrices] = await Promise.all([
          fetchCnyRate(),
          fetchMarketPrices().catch(() => null)
        ]);
        return jsonResponse(res, 200, {
          ok: true,
          account: manualAccountToPayload(result.account, Number(fiat.rate || 7.2), Number(marketPrices?.btcUsdt || 0)),
          entry: result.entry,
          manualAccounts: manualAccountsPayload(fiat, marketPrices)
        });
      }

      return textResponse(res, 405, "Method Not Allowed");
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        ok: false,
        code: error.code || "MANUAL_ACCOUNT_ERROR",
        message: error.message
      });
    }
  }

  if (
    (pathname === "/api/manual-accounts/delete" ||
      pathname === "/api/manual-accounts/archive" ||
      pathname === "/api/manual-account/delete") &&
    req.method === "POST"
  ) {
    try {
      const payload = await readJsonBody(req);
      const result = deleteManualAccount(payload.id || payload.accountId);
      const [fiat, marketPrices] = await Promise.all([
        fetchCnyRate(),
        fetchMarketPrices().catch(() => null)
      ]);
      return jsonResponse(res, 200, {
        ok: true,
        ...result,
        manualAccounts: manualAccountsPayload(fiat, marketPrices)
      });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        ok: false,
        code: error.code || "MANUAL_ACCOUNT_DELETE_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/snapshot" && req.method === "POST") {
    try {
      const result = await captureSnapshot({ force: true });
      return jsonResponse(res, 200, {
        ok: true,
        skipped: result.skipped || false,
        reason: result.reason || null,
        snapshotAt: result.snapshot ? result.snapshot.timestamp : store.lastSnapshotAt
      });
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        ok: false,
        code: error.code || "CAPTURE_ERROR",
        message: error.message,
        details: error.details || error.payload
      });
    }
  }

  if (pathname === "/api/performance") {
    const full = requestUrl.searchParams.get("full") === "1";
    const days = requestUrl.searchParams.get("days");
    const maxPoints = requestUrl.searchParams.get("maxPoints");
    const startTime = requestUrl.searchParams.get("startTime");
    const endTime = requestUrl.searchParams.get("endTime");
    return jsonResponse(res, 200, buildPerformancePayload({ full, days, maxPoints, startTime, endTime }));
  }

  if (pathname === "/api/pet") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildPetPayload(forceRefresh);
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "PET_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/pet/quip") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildPetQuipPayload({
        trigger: requestUrl.searchParams.get("trigger") || "idle",
        distance: Number(requestUrl.searchParams.get("distance") || 0),
        forceRefresh
      });
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "PET_QUIP_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/share/quip" && req.method === "POST") {
    try {
      const payload = await readJsonBody(req);
      const data = await buildShareQuipPayload(payload);
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "SHARE_QUIP_ERROR",
        message: error.message
      });
    }
  }

  if (pathname === "/api/trading-stats") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildTradingStats(forceRefresh);
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "TRADING_STATS_ERROR",
        message: error.message,
        details: error.details || error.payload
      });
    }
  }

  if (pathname === "/api/resources") {
    return jsonResponse(res, 200, buildResourcePayload());
  }

  if (pathname === "/api/positions") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildPositions(forceRefresh);
      return jsonResponse(res, 200, data);
    } catch (error) {
      let finalError = error;
      if (isRetryableLiveFetchError(error)) {
        try {
          const data = await buildPositions(true);
          return jsonResponse(res, 200, data);
        } catch (retryError) {
          finalError = retryError;
        }
      }
      const stale = staleCachedPayload(positionsCache, "POSITIONS_FETCH_FAILED", finalError);
      if (stale) return jsonResponse(res, 200, stale);
      return jsonResponse(res, finalError.statusCode || 500, {
        code: finalError.code || "SERVER_ERROR",
        message: finalError.message,
        details: finalError.details || finalError.payload
      });
    }
  }

  if (pathname === "/api/positions/pnl-leaders") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildPositionPnlLeaders({
        forceRefresh,
        hours: requestUrl.searchParams.get("hours")
      });
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "POSITION_PNL_LEADERS_ERROR",
        message: error.message,
        details: error.details || error.payload
      });
    }
  }

  if (pathname === "/api/positions/asset-detail") {
    try {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const data = await buildPositionAssetDetail(requestUrl.searchParams.get("asset"), {
        forceRefresh,
        days: requestUrl.searchParams.get("days")
      });
      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, error.statusCode || 500, {
        code: error.code || "POSITION_ASSET_DETAIL_ERROR",
        message: error.message,
        details: error.details || error.payload
      });
    }
  }

  return jsonResponse(res, 404, { code: "NOT_FOUND", message: "API route not found." });
}

function serveStatic(req, res, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const targetPath = path.normalize(path.join(publicDir, relativePath));
  const relativeTarget = path.relative(publicDir, targetPath);

  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    return textResponse(res, 403, "Forbidden");
  }

  fs.readFile(targetPath, (error, content) => {
    if (error) {
      return textResponse(res, 404, "Not found");
    }

    const extension = path.extname(targetPath).toLowerCase();
    const contentType =
      {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".ico": "image/x-icon"
      }[extension] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });
    res.bytesOut = content.length;
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const rawPathname = decodeURIComponent(requestUrl.pathname);
  const pathname = normalizeRequestPath(rawPathname);
  trackRequestStart(req, res, pathname);

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, pathname, requestUrl);
  }

  return serveStatic(req, res, pathname);
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`旺财实时看板: http://localhost:${config.port}`);
  startSnapshotScheduler();
});

function startSnapshotScheduler() {
  if (!config.apiKey || !config.apiSecret) return;

  captureSnapshot().catch((error) => {
    console.error("Initial snapshot failed:", error.message);
  });

  setInterval(() => {
    captureSnapshot().catch((error) => {
      console.error("Scheduled snapshot failed:", error.message);
    });
  }, Math.max(config.snapshotIntervalMs, 60000));
}
