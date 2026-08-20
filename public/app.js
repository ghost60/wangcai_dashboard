const state = {
  summary: null,
  market: null,
  performance: null,
  tradingStats: null,
  positions: null,
  manualAccounts: null,
  resources: null,
  shareImageUrl: "",
  filter: "",
  positionFilter: "",
  positionVenue: "all",
  positionKind: "all",
  positionMinValue: 0.01,
  positionSort: "valueDesc",
  positionDetail: null,
  positionDetailLoading: false,
  positionDetailError: "",
  selectedPositionAsset: "",
  positionKlineDays: 7,
  positionKlineRange: null,
  positionPnlLeaders: null,
  positionPnlLoading: false,
  positionPnlError: "",
  positionPnlHours: 24,
  chartDays: 7,
  chartDateFrom: "",
  chartDateTo: "",
  dashboardRefreshLoading: false,
  dashboardRefreshError: "",
  petLoading: false,
  petLastRefreshAt: 0,
  petNextRefreshAt: 0,
  petRefreshError: "",
  selectedTags: new Set(),
  manualEditingId: "",
  manualAccountsEnabled: false,
  manualAccountsLoading: false,
  manualAccountsError: "",
  activeView: "overview",
  quietPet: readStoredFlag("wangcaiDashboard.quietPet", false)
};

const reducedMotionQuery = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : null;

const els = {
  statusText: document.querySelector("#statusText"),
  refreshButton: document.querySelector("#refreshButton"),
  snapshotButton: document.querySelector("#snapshotButton"),
  shareButton: document.querySelector("#shareButton"),
  shareModal: document.querySelector("#shareModal"),
  shareCloseButton: document.querySelector("#shareCloseButton"),
  shareSeriesSelect: document.querySelector("#shareSeriesSelect"),
  shareDaysInput: document.querySelector("#shareDaysInput"),
  shareShowNameInput: document.querySelector("#shareShowNameInput"),
  shareShowAmountInput: document.querySelector("#shareShowAmountInput"),
  shareGenerateButton: document.querySelector("#shareGenerateButton"),
  shareDownloadLink: document.querySelector("#shareDownloadLink"),
  shareStatus: document.querySelector("#shareStatus"),
  shareCanvas: document.querySelector("#shareCanvas"),
  setupPanel: document.querySelector("#setupPanel"),
  totalBtc: document.querySelector("#totalBtc"),
  totalUsdt: document.querySelector("#totalUsdt"),
  masterBtc: document.querySelector("#masterBtc"),
  masterUsdt: document.querySelector("#masterUsdt"),
  subsBtc: document.querySelector("#subsBtc"),
  subsCount: document.querySelector("#subsCount"),
  marketQuotes: document.querySelector("#marketQuotes"),
  updatedAt: document.querySelector("#updatedAt"),
  petAvatar: document.querySelector("#petAvatar"),
  petFace: document.querySelector("#petFace"),
  petMoodBadge: document.querySelector("#petMoodBadge"),
  petMessage: document.querySelector("#petMessage"),
  petOneDay: document.querySelector("#petOneDay"),
  petSevenDay: document.querySelector("#petSevenDay"),
  petThirtyDay: document.querySelector("#petThirtyDay"),
  petAllDay: document.querySelector("#petAllDay"),
  petSource: document.querySelector("#petSource"),
  petPanel: document.querySelector(".petPanel"),
  petRefreshButton: document.querySelector("#petRefreshButton"),
  petRefreshStatus: document.querySelector("#petRefreshStatus"),
  petLastRefresh: document.querySelector("#petLastRefresh"),
  petNextRefresh: document.querySelector("#petNextRefresh"),
  wangcaiPet: document.querySelector("#wangcaiPet"),
  wangcaiPetImage: document.querySelector("#wangcaiPetImage"),
  wangcaiBubble: document.querySelector("#wangcaiBubble"),
  wangcaiMenu: document.querySelector("#wangcaiMenu"),
  wangcaiRecall: document.querySelector("#wangcaiRecall"),
  nonZeroStat: document.querySelector("#nonZeroStat"),
  summarySource: document.querySelector("#summarySource"),
  bars: document.querySelector("#bars"),
  accountSearch: document.querySelector("#accountSearch"),
  accountsTable: document.querySelector("#accountsTable"),
  coverageList: document.querySelector("#coverageList"),
  seriesSelect: document.querySelector("#seriesSelect"),
  metricSelect: document.querySelector("#metricSelect"),
  chartDaysInput: document.querySelector("#chartDaysInput"),
  chartDateFrom: document.querySelector("#chartDateFrom"),
  chartDateTo: document.querySelector("#chartDateTo"),
  tagSeriesControls: document.querySelector("#tagSeriesControls"),
  equityChart: document.querySelector("#equityChart"),
  overallEquityChart: document.querySelector("#overallEquityChart"),
  cryptoEquityChart: document.querySelector("#cryptoEquityChart"),
  manualEquityChart: document.querySelector("#manualEquityChart"),
  overallCurveScope: document.querySelector("#overallCurveScope"),
  tradingSeriesSelect: document.querySelector("#tradingSeriesSelect"),
  tradingVolumeChart: document.querySelector("#tradingVolumeChart"),
  tradingActivityTable: document.querySelector("#tradingActivityTable"),
  tradingVolumeStat: document.querySelector("#tradingVolumeStat"),
  tradingActiveStat: document.querySelector("#tradingActiveStat"),
  tradingCoverageStat: document.querySelector("#tradingCoverageStat"),
  performanceFreshness: document.querySelector("#performanceFreshness"),
  tradingFreshness: document.querySelector("#tradingFreshness"),
  performanceTable: document.querySelector("#performanceTable"),
  snapshotStat: document.querySelector("#snapshotStat"),
  transferStat: document.querySelector("#transferStat"),
  tabButtons: document.querySelectorAll(".tabButton"),
  overviewView: document.querySelector("#overviewView"),
  manualView: document.querySelector("#manualView"),
  positionsView: document.querySelector("#positionsView"),
  resourcesView: document.querySelector("#resourcesView"),
  manualDisabledState: document.querySelector("#manualDisabledState"),
  manualLedgerPanel: document.querySelector("#manualLedgerPanel"),
  manualEnableButton: document.querySelector("#manualEnableButton"),
  manualEnableModal: document.querySelector("#manualEnableModal"),
  manualEnableConfirm: document.querySelector("#manualEnableConfirm"),
  manualEnableCancel: document.querySelector("#manualEnableCancel"),
  manualEnableCancelTop: document.querySelector("#manualEnableCancelTop"),
  positionsTotalValue: document.querySelector("#positionsTotalValue"),
  positionsUpdatedAt: document.querySelector("#positionsUpdatedAt"),
  positionsAccountCount: document.querySelector("#positionsAccountCount"),
  positionsAccountHealth: document.querySelector("#positionsAccountHealth"),
  positionsAssetCount: document.querySelector("#positionsAssetCount"),
  positionsDustStat: document.querySelector("#positionsDustStat"),
  positionsContractCount: document.querySelector("#positionsContractCount"),
  positionsOpenNotional: document.querySelector("#positionsOpenNotional"),
  positionsSourceStat: document.querySelector("#positionsSourceStat"),
  positionsRowStat: document.querySelector("#positionsRowStat"),
  positionsAccountTable: document.querySelector("#positionsAccountTable"),
  positionsTable: document.querySelector("#positionsTable"),
  positionsSearch: document.querySelector("#positionsSearch"),
  positionsVenueFilter: document.querySelector("#positionsVenueFilter"),
  positionsKindFilter: document.querySelector("#positionsKindFilter"),
  positionsMinValueFilter: document.querySelector("#positionsMinValueFilter"),
  positionsSortSelect: document.querySelector("#positionsSortSelect"),
  positionsExposureChart: document.querySelector("#positionsExposureChart"),
  positionsExposureTooltip: document.querySelector("#positionsExposureTooltip"),
  positionsExposureStat: document.querySelector("#positionsExposureStat"),
  positionPnlPanel: document.querySelector("#positionPnlPanel"),
  positionPnlHoursInput: document.querySelector("#positionPnlHoursInput"),
  positionPnlRefresh: document.querySelector("#positionPnlRefresh"),
  positionPnlStatus: document.querySelector("#positionPnlStatus"),
  positionPnlWinnersStat: document.querySelector("#positionPnlWinnersStat"),
  positionPnlLosersStat: document.querySelector("#positionPnlLosersStat"),
  positionPnlWinners: document.querySelector("#positionPnlWinners"),
  positionPnlLosers: document.querySelector("#positionPnlLosers"),
  positionDetailPanel: document.querySelector("#positionDetailPanel"),
  positionDetailTitle: document.querySelector("#positionDetailTitle"),
  positionDetailSubtitle: document.querySelector("#positionDetailSubtitle"),
  positionDetailCoverage: document.querySelector("#positionDetailCoverage"),
  positionDetailClose: document.querySelector("#positionDetailClose"),
  positionDetailMetrics: document.querySelector("#positionDetailMetrics"),
  positionKlineChart: document.querySelector("#positionKlineChart"),
  positionKlineTooltip: document.querySelector("#positionKlineTooltip"),
  positionKlineDaysInput: document.querySelector("#positionKlineDaysInput"),
  positionKlineReload: document.querySelector("#positionKlineReload"),
  positionKlineResetRange: document.querySelector("#positionKlineResetRange"),
  positionTradeLegend: document.querySelector("#positionTradeLegend"),
  positionDetailAccountStat: document.querySelector("#positionDetailAccountStat"),
  positionDetailAccounts: document.querySelector("#positionDetailAccounts"),
  positionDetailRows: document.querySelector("#positionDetailRows"),
  positionsCoverageList: document.querySelector("#positionsCoverageList"),
  resourceRss: document.querySelector("#resourceRss"),
  resourceUptime: document.querySelector("#resourceUptime"),
  resourceCpu: document.querySelector("#resourceCpu"),
  resourceLoad: document.querySelector("#resourceLoad"),
  resourceDataSize: document.querySelector("#resourceDataSize"),
  resourceDataCount: document.querySelector("#resourceDataCount"),
  resourceNetworkRate: document.querySelector("#resourceNetworkRate"),
  resourceNetworkTotal: document.querySelector("#resourceNetworkTotal"),
  resourceGeneratedAt: document.querySelector("#resourceGeneratedAt"),
  resourcePid: document.querySelector("#resourcePid"),
  resourceStatusGrid: document.querySelector("#resourceStatusGrid"),
  resourceStoreStat: document.querySelector("#resourceStoreStat"),
  resourceFilesTable: document.querySelector("#resourceFilesTable"),
  resourceRequestStat: document.querySelector("#resourceRequestStat"),
  resourceByteStat: document.querySelector("#resourceByteStat"),
  resourceRequestsTable: document.querySelector("#resourceRequestsTable"),
  resourceNetworkTable: document.querySelector("#resourceNetworkTable"),
  manualToggleButton: document.querySelector("#manualToggleButton"),
  quietPetToggle: document.querySelector("#quietPetToggle"),
  pulseOneDay: document.querySelector("#pulseOneDay"),
  pulseSevenDay: document.querySelector("#pulseSevenDay"),
  pulseThirtyDay: document.querySelector("#pulseThirtyDay"),
  pulseAllDay: document.querySelector("#pulseAllDay"),
  pulseSample: document.querySelector("#pulseSample"),
  manualAccountForm: document.querySelector("#manualAccountForm"),
  manualAccountDate: document.querySelector("#manualAccountDate"),
  manualAccountLabel: document.querySelector("#manualAccountLabel"),
  manualAccountBroker: document.querySelector("#manualAccountBroker"),
  manualAccountEquity: document.querySelector("#manualAccountEquity"),
  manualAccountCashFlow: document.querySelector("#manualAccountCashFlow"),
  manualAccountTags: document.querySelector("#manualAccountTags"),
  manualAccountSaveButton: document.querySelector("#manualAccountSaveButton"),
  manualAccountResetButton: document.querySelector("#manualAccountResetButton"),
  manualDisableButton: document.querySelector("#manualDisableButton"),
  manualEditHint: document.querySelector("#manualEditHint"),
  manualAccountsTable: document.querySelector("#manualAccountsTable"),
  manualEntriesList: document.querySelector("#manualEntriesList"),
  manualAccountStat: document.querySelector("#manualAccountStat"),
  manualAccountUpdatedAt: document.querySelector("#manualAccountUpdatedAt")
};
const svgNs = "http://www.w3.org/2000/svg";
const totalTagId = "__total__";
let manualAccountRefreshTimer = 0;
let manualAccountRefreshRunning = false;
let manualAccountRefreshQueued = false;
const chartPalette = [
  "#1f6feb",
  "#f97316",
  "#14804a",
  "#c2413d",
  "#7c3aed",
  "#0f766e",
  "#be185d",
  "#b7791f",
  "#2563eb",
  "#65a30d",
  "#9333ea",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
  "#15803d",
  "#db2777",
  "#92400e",
  "#475569",
  "#ca8a04",
  "#0284c7",
  "#16a34a",
  "#e11d48",
  "#6d28d9",
  "#0d9488"
];

const btcFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8
});

const usdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const compactUsdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2
});

const cnyFormat = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2
});

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const wangcaiAssetVersion = "20260528-pet3-classic-direction";
const dashboardAutoRefreshMs = 5 * 60 * 1000;
let dashboardAutoRefreshTimer = 0;
let dashboardPulseTimer = 0;
const wangcaiAsset = (name) => `/assets/wangcai/${name}.png?v=${wangcaiAssetVersion}`;
const wangcaiMoodAssets = {
  calm: wangcaiAsset("idle"),
  euphoric: wangcaiAsset("happy"),
  happy: wangcaiAsset("happy"),
  worried: wangcaiAsset("worried"),
  sad: wangcaiAsset("sad")
};
const wangcaiMotionAssets = {
  blink: [wangcaiAsset("idle"), wangcaiAsset("sit"), wangcaiAsset("idle")],
  wag: [wangcaiAsset("sit"), wangcaiAsset("happy")],
  eat: [wangcaiAsset("stretch"), wangcaiAsset("happy")],
  pet: [wangcaiAsset("sit"), wangcaiAsset("happy")],
  runFlow: [
    wangcaiAsset("run-calm-1"),
    wangcaiAsset("run-calm-2"),
    wangcaiAsset("run-calm-1"),
    wangcaiAsset("run-calm-2")
  ],
  walk: {
    calm: [wangcaiAsset("run-calm-1"), wangcaiAsset("run-calm-2")],
    euphoric: [wangcaiAsset("run-happy-1"), wangcaiAsset("run-happy-2")],
    happy: [wangcaiAsset("run-happy-1"), wangcaiAsset("run-happy-2")],
    worried: [wangcaiAsset("run-worried-1"), wangcaiAsset("run-worried-2")],
    sad: [wangcaiAsset("run-sad-1"), wangcaiAsset("run-sad-2")]
  },
  run: {
    calm: [wangcaiAsset("run-calm-1"), wangcaiAsset("run-calm-2")],
    euphoric: [wangcaiAsset("run-happy-1"), wangcaiAsset("run-happy-2")],
    happy: [wangcaiAsset("run-happy-1"), wangcaiAsset("run-happy-2")],
    worried: [wangcaiAsset("run-worried-1"), wangcaiAsset("run-worried-2")],
    sad: [wangcaiAsset("run-sad-1"), wangcaiAsset("run-sad-2")]
  },
  sit: wangcaiAsset("sit"),
  stretch: wangcaiAsset("stretch"),
  nap: [wangcaiAsset("nap-1"), wangcaiAsset("nap-2")]
};
const wangcaiIdleActionsByMood = {
  calm: ["sit", "sit", "watch", "blink", "wag", "stretch", "nap"],
  euphoric: ["celebrate", "celebrate", "wag", "stand", "watch", "stretch", "blink"],
  happy: ["celebrate", "wag", "stand", "watch", "sit", "blink", "stretch"],
  worried: ["watch", "watch", "sit", "blink", "stand", "stretch", "nap"],
  sad: ["sit", "nap", "watch", "blink", "stand", "sit", "stretch"]
};
const wangcaiCommandConfig = {
  pet: {
    action: "pet",
    trigger: "touch",
    duration: 1800,
    fallback: "主人摸摸旺财，坏情绪我先叼走。"
  },
  feed: {
    action: "eat",
    trigger: "feed",
    duration: 2400,
    fallback: "主人投喂成功，旺财今晚替账户多巡两圈。"
  },
  work: {
    action: "work",
    trigger: "work",
    duration: 4600,
    fallback: "主人下令巡逻，旺财开始检查风险小门。"
  },
  sleep: {
    action: "nap",
    trigger: "sleep",
    duration: 5200,
    fallback: "主人，旺财先眯会儿，止损线还醒着。"
  }
};
const wangcaiFallbackQuips = {
  account: [
    "主人，我住在账户看板里，正在给净值站岗。",
    "主人别慌，K线乱跳，旺财尾巴不乱。",
    "主人，有波动我先汪两声，替你挡一挡。",
    "账户风向我闻着，今天味儿有点刺激。",
    "主人，打工十年还是工，纪律一天也是功。",
    "主人，先活下来，再全款购入地球。"
  ],
  chase: [
    "主人慢点，我小短腿都跑出资金费率了。",
    "主人我来了，喘口气再一起谈格局。",
    "鼠标别溜太快呀，旺财不是高频狗。",
    "我追到了，主人奖励我看一眼盈利曲线。",
    "这一趟追鼠标，比追涨杀跌还累。",
    "主人别拉扯我，狗也怕假突破。"
  ],
  walk: [
    "主人，我慢慢巡过去，仓位也要慢慢想。",
    "主人，旺财贴地巡航，专治看盘焦虑。",
    "鼠标我看见了，不用像追涨那么急。",
    "主人，近距离观察，远距离敬畏。",
    "我小步挪过去，顺便把风控绳叼上。"
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
  drag: [
    "主人把我拎起来了，旺财换个岗位继续守家。",
    "收到搬家指令，旺财在新位置盯盘。",
    "主人轻点拎，我的风控绳还没系好。",
    "好嘞，我趴这儿看账户更清楚。",
    "旺财已停靠，新窝也要有盈利曲线。"
  ],
  sit: [
    "主人，我先坐稳，等行情自己露出尾巴。",
    "坐着盯盘，不被一根阳线骗婚。",
    "主人，等风来，不追风。",
    "旺财坐镇，主人的本金先别乱跑。",
    "主人，坐稳十秒也是交易纪律。"
  ],
  watch: [
    "主人，我在看鼠标，也在看主人的手别乱点。",
    "距离刚刚好，我蹲这儿陪主人盯盘。",
    "主人，行情有风声，我先竖耳朵。",
    "旺财近距离观察，专抓情绪化下单。",
    "主人，别急，我闻闻这波是不是假突破。"
  ],
  stretch: [
    "主人，我伸个懒腰，继续守住主人的账户。",
    "尾巴充电中，等会儿继续巡逻。",
    "主人，盯盘也要活动一下，别被FOMO锁住脖子。",
    "旺财拉伸完毕，准备陪账户翻身。",
    "主人，狗生不易，合约更不易。"
  ],
  nap: [
    "主人，我眯一小会儿，止损线还醒着。",
    "旺财进入浅睡，耳朵继续监听净值。",
    "主人，行情没信号时，睡觉也是策略。",
    "我趴会儿，等主升浪来敲碗。",
    "主人别慌，我闭眼不是摆烂，是低功耗盯盘。"
  ],
  celebrate: [
    "主人，尾巴已经摇出年化曲线！",
    "今日气势不错，全款购入地球先排队。",
    "主人，这味儿像小牛市，先别飘太高。",
    "旺财宣布：账户有皇宫味儿！",
    "主人，打工十年还是工，净值起飞才叫风。"
  ],
  idle: [
    "主人，我先坐会儿，等主升浪自己来敲门。",
    "巡逻结束，进入看板小狗挂机模式。",
    "曲线我看着，主人别偷偷梭哈。",
    "旺财在线守家，顺便守住主人的本金。",
    "笑死，刚才那根线像庄家打喷嚏。",
    "主人别问，问就是长期主义，手却在发抖。",
    "韭菜也有春天，前提是别被割到根。",
    "主人，今天不操作，也是一种高级操作。",
    "梭哈一夜住皇宫这话，先放气泡里过过瘾。",
    "主人，暴涨梦可以做，风控绳不能松。"
  ]
};
const wangcaiState = {
  enabled: false,
  fallbackLoaded: false,
  x: 96,
  y: 96,
  targetX: 96,
  targetY: 96,
  pointerX: 96,
  pointerY: 96,
  velocityX: 0,
  velocityY: 0,
  mood: "calm",
  action: "stand",
  idleAction: "stand",
  commandAction: "",
  frameIndex: 0,
  lastFrameAt: 0,
  lastTickAt: 0,
  actionStartedAt: 0,
  holdAction: "",
  holdActionUntil: 0,
  menuOpen: false,
  hidden: false,
  lastPointerMoveAt: 0,
  nextIdleActionAt: 0,
  nextBubbleAt: 0,
  bubbleHideTimer: 0,
  quipLoading: false,
  lastQuipAt: 0,
  lastRunQuipAt: 0,
  lastWalkQuipAt: 0,
  lastNearQuipAt: 0,
  lastDistance: 0,
  lastAsset: "",
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  pointerDownAt: 0,
  pointerDownX: 0,
  pointerDownY: 0,
  animationFrameId: 0
};

els.refreshButton.addEventListener("click", () => {
  refreshDashboard({ force: true, source: "manual" });
});
els.snapshotButton.addEventListener("click", captureSnapshot);
els.shareButton.addEventListener("click", openShareModal);
els.shareCloseButton.addEventListener("click", closeShareModal);
els.shareModal.addEventListener("click", (event) => {
  if (event.target === els.shareModal) closeShareModal();
});
if (els.manualEnableButton) {
  els.manualEnableButton.addEventListener("click", openManualEnableModal);
}
if (els.manualEnableModal) {
  els.manualEnableModal.addEventListener("click", (event) => {
    if (event.target === els.manualEnableModal) closeManualEnableModal();
  });
}
els.manualEnableConfirm?.addEventListener("click", enableManualAccounts);
els.manualEnableCancel?.addEventListener("click", closeManualEnableModal);
els.manualEnableCancelTop?.addEventListener("click", closeManualEnableModal);
els.manualDisableButton?.addEventListener("click", disableManualAccounts);
els.manualToggleButton?.addEventListener("click", () => {
  if (currentManualAccountsEnabled()) disableManualAccounts();
  else openManualEnableModal();
});
els.shareGenerateButton.addEventListener("click", generateSharePoster);
els.seriesSelect.addEventListener("change", renderChart);
els.metricSelect.addEventListener("change", renderChart);
els.chartDaysInput.addEventListener("change", (event) => {
  state.chartDays = normalizeChartDays(event.target.value);
  event.target.value = chartDaysInputValue(state.chartDays);
  clearChartDateRange();
  loadPerformance({ days: state.chartDays });
});
if (els.chartDateFrom) {
  els.chartDateFrom.addEventListener("change", () => {
    state.chartDateFrom = els.chartDateFrom.value;
    if (state.chartDateFrom && state.chartDateTo) {
      els.chartDaysInput.value = "all";
      loadPerformance();
    }
  });
}
if (els.chartDateTo) {
  els.chartDateTo.addEventListener("change", () => {
    state.chartDateTo = els.chartDateTo.value;
    if (state.chartDateFrom && state.chartDateTo) {
      els.chartDaysInput.value = "all";
      loadPerformance();
    }
  });
}
els.tradingSeriesSelect.addEventListener("change", renderTradingStats);
els.tagSeriesControls.addEventListener("change", (event) => {
  if (!event.target.matches("[data-tag-series]")) return;
  const tag = event.target.value;
  if (event.target.checked) state.selectedTags.add(tag);
  else state.selectedTags.delete(tag);
  renderChart();
});
els.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});
if (els.quietPetToggle) {
  els.quietPetToggle.addEventListener("click", () => {
    state.quietPet = !state.quietPet;
    writeStoredFlag("wangcaiDashboard.quietPet", state.quietPet);
    applyDisplayPreferences();
  });
}
els.petRefreshButton?.addEventListener("click", () => refreshDashboard({ force: true, source: "pet" }));
if (els.manualAccountForm) {
  els.manualAccountForm.addEventListener("submit", saveManualAccount);
  els.manualAccountsTable.addEventListener("click", handleManualAccountAction);
  els.manualEntriesList?.addEventListener("click", handleManualAccountAction);
  els.manualAccountResetButton?.addEventListener("click", () => {
    resetManualAccountForm();
    els.manualAccountLabel?.focus();
  });
  resetManualAccountForm();
}
els.accountSearch.addEventListener("input", (event) => {
  state.filter = event.target.value.trim().toLowerCase();
  renderAccounts();
});
els.accountsTable.addEventListener("change", (event) => {
  if (!event.target.matches("[data-tag-input]")) return;
  saveAccountTags(event.target);
});
els.positionsSearch.addEventListener("input", (event) => {
  state.positionFilter = event.target.value.trim().toLowerCase();
  renderPositions();
});
els.positionsVenueFilter.addEventListener("change", (event) => {
  state.positionVenue = event.target.value;
  renderPositions();
});
els.positionsKindFilter.addEventListener("change", (event) => {
  state.positionKind = event.target.value;
  renderPositions();
});
els.positionsMinValueFilter.addEventListener("change", (event) => {
  state.positionMinValue = Number(event.target.value || 0);
  renderPositions();
});
els.positionsSortSelect.addEventListener("change", (event) => {
  state.positionSort = event.target.value;
  renderPositions();
});
els.positionsTable?.addEventListener("click", handlePositionAssetClick);
els.positionPnlPanel?.addEventListener("click", handlePositionAssetClick);
els.positionPnlHoursInput?.addEventListener("change", reloadPositionPnlLeaders);
els.positionPnlRefresh?.addEventListener("click", () => loadPositionPnlLeaders(true));
els.positionKlineDaysInput?.addEventListener("change", reloadPositionKlineWindow);
els.positionKlineReload?.addEventListener("click", reloadPositionKlineWindow);
els.positionKlineResetRange?.addEventListener("click", () => {
  state.positionKlineRange = null;
  renderPositionDetail();
});
els.positionDetailClose?.addEventListener("click", () => {
  state.selectedPositionAsset = "";
  state.positionDetail = null;
  state.positionDetailError = "";
  state.positionDetailLoading = false;
  state.positionKlineRange = null;
  renderPositionDetail();
});

applyDisplayPreferences();
loadSummary(false);
loadManualAccounts();
loadMarket();
loadPerformance();
loadPet(false);
updatePetRefreshMeta();
scheduleDashboardAutoRefresh();
setupWangcaiPet();
loadTradingStats(false);
setInterval(loadPerformance, 60000);
setInterval(loadMarket, 10000);
setInterval(updatePetRefreshMeta, 1000);
setInterval(() => loadTradingStats(false), 300000);
setInterval(() => {
  if (state.activeView === "positions") loadPositions(false);
}, 60000);
setInterval(() => {
  if (state.activeView === "resources") loadResources();
}, 5000);
window.addEventListener("resize", debounce(renderChart, 120));
window.addEventListener("resize", debounce(renderPositionDetail, 160));
window.addEventListener("resize", debounce(renderPositionPnlLeaders, 160));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.shareModal.classList.contains("hidden")) {
    closeShareModal();
  } else if (event.key === "Escape" && !els.manualEnableModal?.classList.contains("hidden")) {
    closeManualEnableModal();
  }
});

function switchView(view) {
  state.activeView = ["manual", "positions", "resources"].includes(view) ? view : "overview";
  els.overviewView.classList.toggle("hidden", state.activeView !== "overview");
  els.manualView.classList.toggle("hidden", state.activeView !== "manual");
  els.positionsView.classList.toggle("hidden", state.activeView !== "positions");
  els.resourcesView.classList.toggle("hidden", state.activeView !== "resources");
  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  });
  if (state.activeView === "manual") {
    renderManualAccounts();
    loadManualAccounts();
  }
  else if (state.activeView === "positions") loadPositions(true);
  else if (state.activeView === "resources") loadResources();
  else {
    renderChart();
    renderTradingStats();
  }
}

async function refreshDashboard(options = {}) {
  if (state.dashboardRefreshLoading) {
    if (options.source === "auto") scheduleDashboardAutoRefresh(30000);
    return;
  }

  const force = options.force !== false;
  state.dashboardRefreshLoading = true;
  state.dashboardRefreshError = "";
  window.clearTimeout(dashboardAutoRefreshTimer);
  updatePetRefreshMeta();
  els.statusText.textContent = options.source === "auto" ? "自动刷新中" : "正在刷新全部数据";

  try {
    const tasks = [
      loadSummary(force),
      loadManualAccounts(),
      loadMarket(),
      loadPerformance({ days: state.chartDays }),
      loadPet(force, { skipAutoSchedule: true }),
      loadTradingStats(force),
      loadResources(),
      loadPositions(force)
    ];
    if (state.selectedPositionAsset) {
      tasks.push(selectPositionAsset(state.selectedPositionAsset, {
        force: true,
        refresh: force,
        keepRange: true
      }));
    }
    await Promise.all(tasks);
    state.petLastRefreshAt = Date.now();
    flashDashboardUpdate();
    els.statusText.textContent = "全部数据已刷新";
  } catch (error) {
    state.dashboardRefreshError = error.message || "全量刷新失败";
    els.statusText.textContent = "全量刷新失败";
  } finally {
    state.dashboardRefreshLoading = false;
    setLoading(false);
    scheduleDashboardAutoRefresh();
    updatePetRefreshMeta();
  }
}

function scheduleDashboardAutoRefresh(delayMs = dashboardAutoRefreshMs) {
  window.clearTimeout(dashboardAutoRefreshTimer);
  const delay = Math.max(15000, Number(delayMs || dashboardAutoRefreshMs));
  state.petNextRefreshAt = Date.now() + delay;
  dashboardAutoRefreshTimer = window.setTimeout(() => {
    refreshDashboard({ force: true, source: "auto" });
  }, delay);
  updatePetRefreshMeta();
}

function flashDashboardUpdate() {
  if (prefersReducedMotion()) return;

  document.body.classList.remove("dashboardUpdated");
  window.clearTimeout(dashboardPulseTimer);
  window.requestAnimationFrame(() => {
    document.body.classList.add("dashboardUpdated");
    dashboardPulseTimer = window.setTimeout(() => {
      document.body.classList.remove("dashboardUpdated");
    }, 1100);
  });
}

async function loadSummary(forceRefresh) {
  setLoading(true);
  els.setupPanel.classList.add("hidden");

  try {
    const response = await fetch(`/api/summary${forceRefresh ? "?refresh=1" : ""}`, {
      cache: "no-store"
    });
    const payload = await response.json();

    if (!response.ok) {
      throw payload;
    }

    state.summary = payload;
    if (typeof payload.features?.manualAccountsEnabled === "boolean") {
      state.manualAccountsEnabled = payload.features.manualAccountsEnabled;
      if (state.manualAccounts) state.manualAccounts.enabled = state.manualAccountsEnabled;
    }
    updateManualToggleButton();
    renderSummary();
    els.statusText.textContent = payload.stale ? "接口异常，显示上次完整数据" : "已更新";
  } catch (error) {
    renderError(error);
  } finally {
    setLoading(false);
  }
}

async function loadPerformance(options = {}) {
  setFreshnessBadge(els.performanceFreshness, "loading", state.performance ? "收益更新中" : "收益加载中");
  if (!state.performance) {
    els.performanceTable.innerHTML = '<tr><td colspan="13" class="empty loadingState">正在加载收益数据</td></tr>';
    els.equityChart.innerHTML = '<div class="chartEmpty">正在加载资金曲线</div>';
  }
  try {
    const from = options.dateFrom ?? state.chartDateFrom;
    const to = options.dateTo ?? state.chartDateTo;
    const useDateRange = from && to;
    const params = new URLSearchParams();
    if (useDateRange) {
      params.set("startTime", String(new Date(from + "T00:00:00").getTime()));
      params.set("endTime", String(new Date(to + "T23:59:59").getTime()));
    } else if (isAllChartDays(options.days ?? state.chartDays) || options.full) {
      params.set("full", "1");
      params.set("maxPoints", "0");
    } else {
      const days = normalizeChartDays(options.days ?? state.chartDays ?? 7);
      params.set("days", String(days));
      if (options.maxPoints !== undefined) params.set("maxPoints", String(options.maxPoints));
    }
    const response = await fetch(`/api/performance?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.performance = payload;
    updateFreshnessBadge(els.performanceFreshness, "收益", performanceFreshnessTimestamp(payload), 10 * 60 * 1000);
    renderPerformance();
  } catch (error) {
    setFreshnessBadge(els.performanceFreshness, "danger", "收益加载失败");
    els.performanceTable.innerHTML = `
        <tr><td colspan="13" class="empty">${escapeHtml(error.message || "收益数据加载失败")}</td></tr>
    `;
  }
}

async function loadMarket() {
  try {
    const response = await fetch("/api/market", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.market = payload;
    renderMarketQuotes(payload.markets || []);
  } catch (_error) {
    if (state.summary?.quote?.markets) renderMarketQuotes(state.summary.quote.markets);
  }
}

async function loadManualAccounts() {
  if (!els.manualAccountsTable) return;
  state.manualAccountsLoading = true;
  state.manualAccountsError = "";
  renderManualAccounts();
  try {
    const response = await fetch("/api/manual-accounts", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.manualAccounts = payload;
    if (typeof payload.enabled === "boolean") state.manualAccountsEnabled = payload.enabled;
    updateManualToggleButton();
  } catch (error) {
    state.manualAccountsError = error.message || "手工账户加载失败";
  } finally {
    state.manualAccountsLoading = false;
    renderManualAccounts();
  }
}

function openManualEnableModal() {
  if (!els.manualEnableModal) return;
  els.manualEnableModal.classList.remove("hidden");
  els.manualEnableConfirm?.focus();
}

function closeManualEnableModal() {
  els.manualEnableModal?.classList.add("hidden");
}

async function enableManualAccounts() {
  if (!els.manualEnableConfirm) return;
  els.manualEnableConfirm.disabled = true;
  if (els.manualToggleButton) els.manualToggleButton.disabled = true;
  els.statusText.textContent = "正在开启 A 股记录";
  try {
    const response = await fetch("/api/manual-accounts/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ enabled: true })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.manualAccounts = payload.manualAccounts;
    state.manualAccountsEnabled = Boolean(payload.enabled);
    closeManualEnableModal();
    updateManualToggleButton();
    renderManualAccounts();
    await Promise.all([loadSummary(true), loadPerformance(), loadPet(true)]);
    els.statusText.textContent = "A 股记录已开启";
  } catch (error) {
    els.statusText.textContent = "A 股记录开启失败";
    alert(error.message || "A 股记录开启失败");
  } finally {
    els.manualEnableConfirm.disabled = false;
    if (els.manualToggleButton) els.manualToggleButton.disabled = false;
  }
}

async function disableManualAccounts() {
  if (!window.confirm("关闭后不会删除已有 A 股记录，但这些记录会从总账户和收益统计里剔除。确认关闭？")) {
    return;
  }
  if (els.manualDisableButton) els.manualDisableButton.disabled = true;
  if (els.manualToggleButton) els.manualToggleButton.disabled = true;
  els.statusText.textContent = "正在关闭 A 股记录";
  try {
    const response = await fetch("/api/manual-accounts/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ enabled: false })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.manualAccounts = payload.manualAccounts;
    state.manualAccountsEnabled = Boolean(payload.enabled);
    resetManualAccountForm();
    updateManualToggleButton();
    renderManualAccounts();
    await Promise.all([loadSummary(true), loadPerformance(), loadPet(true)]);
    els.statusText.textContent = "A 股记录已关闭";
  } catch (error) {
    els.statusText.textContent = "A 股记录关闭失败";
    alert(error.message || "A 股记录关闭失败");
  } finally {
    if (els.manualDisableButton) els.manualDisableButton.disabled = false;
    if (els.manualToggleButton) els.manualToggleButton.disabled = false;
  }
}

async function saveManualAccount(event) {
  event.preventDefault();
  if (!currentManualAccountsEnabled()) {
    openManualEnableModal();
    return;
  }
  const payload = {
    id: state.manualEditingId,
    date: els.manualAccountDate.value,
    label: els.manualAccountLabel.value.trim(),
    broker: els.manualAccountBroker.value.trim(),
    equityCny: els.manualAccountEquity.value,
    cashFlowCny: els.manualAccountCashFlow.value,
    tags: parseTags(els.manualAccountTags.value)
  };
  if (!payload.label || payload.equityCny === "" || !payload.date) return;

  els.manualAccountSaveButton.disabled = true;
  els.statusText.textContent = "正在保存手工净值";
  try {
    const response = await fetch("/api/manual-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw result;
    state.manualAccounts = result.manualAccounts;
    resetManualAccountForm();
    renderManualAccounts();
    els.statusText.textContent = "手工净值已保存";
    queueManualAccountRefresh();
  } catch (error) {
    els.statusText.textContent = "手工净值保存失败";
    alert(error.message || "手工净值保存失败");
  } finally {
    els.manualAccountSaveButton.disabled = false;
  }
}

function queueManualAccountRefresh() {
  manualAccountRefreshQueued = true;
  window.clearTimeout(manualAccountRefreshTimer);
  manualAccountRefreshTimer = window.setTimeout(runManualAccountRefresh, 1200);
}

async function runManualAccountRefresh() {
  if (manualAccountRefreshRunning) return;
  manualAccountRefreshRunning = true;
  try {
    while (manualAccountRefreshQueued) {
      manualAccountRefreshQueued = false;
      els.statusText.textContent = "正在后台刷新手工账统计";
      await Promise.all([loadSummary(true), loadPerformance(), loadPet(true)]);
      if (!manualAccountRefreshQueued) els.statusText.textContent = "手工账统计已刷新";
    }
  } catch (error) {
    els.statusText.textContent = "手工账统计后台刷新失败";
  } finally {
    manualAccountRefreshRunning = false;
  }
}

async function handleManualAccountAction(event) {
  const editButton = event.target.closest("[data-manual-edit]");
  const entryEditButton = event.target.closest("[data-manual-entry-edit]");
  const archiveButton = event.target.closest("[data-manual-archive]");
  if (editButton) {
    const account = (state.manualAccounts?.accounts || []).find((item) => item.id === editButton.dataset.manualEdit);
    if (!account) return;
    fillManualAccountForm(account, {
      date: todayInputDate(),
      equityCny: account.equityCny,
      hint: `正在编辑：${account.label || "手工账户"}`
    });
    els.manualAccountEquity.focus();
    return;
  }
  if (entryEditButton) {
    const entry = (state.manualAccounts?.entries || []).find((item) => item.id === entryEditButton.dataset.manualEntryEdit);
    if (!entry) return;
    const account = manualAccountById(entry.accountId) || { id: entry.accountId, label: entry.accountId.replace(/^manual:/, "") };
    fillManualAccountForm(account, {
      date: entry.date,
      equityCny: entry.equityCny,
      hint: `正在补录/修改：${account.label || "手工账户"} · ${entry.date}`
    });
    els.manualAccountEquity.focus();
    return;
  }
  if (!archiveButton) return;
  const accountId = archiveButton.dataset.manualArchive;
  if (!accountId || !window.confirm("归档后不会再参与后续净值采样，历史曲线仍保留。确认归档？")) return;
  archiveButton.disabled = true;
  try {
    const response = await fetch("/api/manual-accounts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ id: accountId })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.manualAccounts = payload.manualAccounts;
    if (state.manualEditingId === accountId) resetManualAccountForm();
    renderManualAccounts();
    await Promise.all([loadSummary(true), loadPerformance(), loadPet(true)]);
  } catch (error) {
    alert(error.message || "归档失败");
  } finally {
    archiveButton.disabled = false;
  }
}

async function loadPositions(forceRefresh) {
  try {
    const response = await fetch(`/api/positions${forceRefresh ? "?refresh=1" : ""}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.positions = payload;
    renderPositions();
    if (payload.stale) {
      els.statusText.textContent = "持仓接口异常，显示上次完整数据";
    }
    await loadPositionPnlLeaders(forceRefresh);
  } catch (error) {
    els.positionsTable.innerHTML = `
      <tr><td colspan="11" class="empty">${escapeHtml(error.message || "持仓数据加载失败")}</td></tr>
    `;
    els.positionsAccountTable.innerHTML = `
      <tr><td colspan="11" class="empty">${escapeHtml(error.message || "持仓数据加载失败")}</td></tr>
    `;
    state.positionPnlError = error.message || "持仓数据加载失败";
    renderPositionPnlLeaders();
  }
}

function reloadPositionPnlLeaders() {
  const hours = normalizePositionPnlHours(els.positionPnlHoursInput?.value || state.positionPnlHours);
  state.positionPnlHours = hours;
  if (els.positionPnlHoursInput) els.positionPnlHoursInput.value = String(hours);
  loadPositionPnlLeaders(true);
}

async function loadPositionPnlLeaders(forceRefresh = false) {
  if (!els.positionPnlPanel) return;
  const hours = normalizePositionPnlHours(els.positionPnlHoursInput?.value || state.positionPnlHours);
  state.positionPnlHours = hours;
  if (els.positionPnlHoursInput) els.positionPnlHoursInput.value = String(hours);
  state.positionPnlLoading = true;
  state.positionPnlError = "";
  renderPositionPnlLeaders();
  try {
    const params = new URLSearchParams({ hours: String(hours) });
    if (forceRefresh) params.set("refresh", "1");
    const response = await fetch(`/api/positions/pnl-leaders?${params.toString()}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.positionPnlLeaders = payload;
  } catch (error) {
    state.positionPnlError = error.message || "PnL 归因加载失败";
  } finally {
    state.positionPnlLoading = false;
    renderPositionPnlLeaders();
  }
}

function handlePositionAssetClick(event) {
  const button = event.target.closest("[data-position-asset]");
  if (!button) return;
  const asset = normalizeExposureAsset(button.dataset.positionAsset);
  if (!asset) return;
  selectPositionAsset(asset);
}

function reloadPositionKlineWindow() {
  const days = normalizePositionKlineDays(els.positionKlineDaysInput?.value || state.positionKlineDays);
  state.positionKlineDays = days;
  state.positionKlineRange = null;
  if (els.positionKlineDaysInput) els.positionKlineDaysInput.value = String(days);
  if (state.selectedPositionAsset) selectPositionAsset(state.selectedPositionAsset, { force: true });
}

async function selectPositionAsset(asset, options = {}) {
  const normalized = normalizeExposureAsset(asset);
  if (!normalized) return;
  if (!options.force && state.selectedPositionAsset === normalized && state.positionDetail && !state.positionDetailError) {
    els.positionDetailPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  state.selectedPositionAsset = normalized;
  state.positionDetail = null;
  state.positionDetailError = "";
  state.positionDetailLoading = true;
  if (!options.keepRange) state.positionKlineRange = null;
  renderPositionDetail();
  els.positionDetailPanel?.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const params = new URLSearchParams({
      asset: normalized,
      days: String(normalizePositionKlineDays(state.positionKlineDays))
    });
    if (options.refresh) params.set("refresh", "1");
    const response = await fetch(`/api/positions/asset-detail?${params.toString()}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.positionDetail = payload;
  } catch (error) {
    state.positionDetailError = error.message || "币种详情加载失败";
  } finally {
    state.positionDetailLoading = false;
    renderPositionDetail();
  }
}

async function loadResources() {
  try {
    const response = await fetch("/api/resources", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.resources = payload;
    renderResources();
  } catch (error) {
    els.resourceStatusGrid.innerHTML = `<div class="empty">${escapeHtml(error.message || "资源数据加载失败")}</div>`;
  }
}

async function captureSnapshot() {
  els.snapshotButton.disabled = true;
  els.statusText.textContent = "正在采样";

  try {
    const response = await fetch("/api/snapshot", {
      method: "POST",
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    els.statusText.textContent = "采样完成";
    await Promise.all([
      loadSummary(true),
      loadPerformance(),
      loadPet(true),
      loadTradingStats(true),
      state.activeView === "positions" ? loadPositions(true) : Promise.resolve()
    ]);
  } catch (error) {
    els.statusText.textContent = "采样失败";
    const detailText = error.details
      ? `\n\n调试信息:\n总资产USDT: ${error.details.totalUsdt ?? "?"}\nentity合计: ${error.details.entitySum ?? "?"}\n差值: ${error.details.difference ?? "?"}`
      : "";
    alert((error.message || "采样失败") + detailText);
  } finally {
    els.snapshotButton.disabled = false;
  }
}

function setLoading(isLoading) {
  els.refreshButton.disabled = isLoading || state.dashboardRefreshLoading;
  if (isLoading) els.statusText.textContent = "正在拉取";
}

function readStoredFlag(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch (_error) {
    return fallback;
  }
}

function writeStoredFlag(key, value) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch (_error) {
    // Display preferences are optional; blocked storage should not affect the dashboard.
  }
}

function removeStoredFlag(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // Display preferences are optional; blocked storage should not affect the dashboard.
  }
}

function applyDisplayPreferences() {
  document.body.classList.remove("compactMode");
  removeStoredFlag("wangcaiDashboard.compactMode");
  document.body.classList.toggle("quietPet", state.quietPet);
  if (els.quietPetToggle) {
    els.quietPetToggle.setAttribute("aria-pressed", String(state.quietPet));
  }
  if (state.quietPet) {
    window.cancelAnimationFrame(wangcaiState.animationFrameId);
    wangcaiState.animationFrameId = 0;
    closeWangcaiMenu();
  } else {
    startWangcaiLoop();
  }
}

function setFreshnessBadge(element, tone, text) {
  if (!element) return;
  element.className = `freshnessBadge ${tone || "fresh"}`;
  element.textContent = text;
}

function updateFreshnessBadge(element, label, timestamp, staleAfterMs) {
  if (!element) return;
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(parsed)) {
    setFreshnessBadge(element, "fresh", `${label}已更新`);
    return;
  }
  const ageMs = Math.max(0, Date.now() - parsed);
  const tone = ageMs > staleAfterMs ? "stale" : "fresh";
  setFreshnessBadge(element, tone, `${label}${freshnessAgeText(ageMs)}`);
}

function freshnessAgeText(ageMs) {
  if (ageMs < 60000) return "刚更新";
  if (ageMs < 3600000) return `${Math.round(ageMs / 60000)}分钟前`;
  if (ageMs < 86400000) return `${Math.round(ageMs / 3600000)}小时前`;
  return `${Math.round(ageMs / 86400000)}天前`;
}

function performanceFreshnessTimestamp(payload) {
  const candidates = [
    payload?.generatedAt,
    payload?.lastSnapshotAt,
    payload?.total?.lastSnapshotAt,
    payload?.total?.latestAt,
    payload?.total?.points?.at(-1)?.timestamp,
    payload?.entities?.[0]?.points?.at(-1)?.timestamp
  ];
  return candidates.find(Boolean) || "";
}

async function loadPet(forceRefresh, options = {}) {
  if (state.petLoading) {
    if (options.automatic) scheduleDashboardAutoRefresh(30000);
    return;
  }
  state.petLoading = true;
  state.petRefreshError = "";
  updatePetRefreshMeta();
  try {
    const response = await fetch(`/api/pet${forceRefresh ? "?refresh=1" : ""}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    renderPet(payload);
    state.petLastRefreshAt = Date.now();
  } catch (error) {
    state.petRefreshError = error.message || "刷新失败";
    renderPet({
      mood: "calm",
      moodLabel: "离线",
      emoji: ":|",
      message: error.message || "旺财暂时没读到账户心情。",
      source: "local",
      metrics: {}
    });
  } finally {
    state.petLoading = false;
    if (!options.skipAutoSchedule) scheduleDashboardAutoRefresh();
    updatePetRefreshMeta();
  }
}

function updatePetRefreshMeta() {
  const isLoading = Boolean(state.petLoading || state.dashboardRefreshLoading);
  const hasError = Boolean(state.petRefreshError || state.dashboardRefreshError);
  if (els.petPanel) {
    els.petPanel.classList.toggle("isRefreshing", isLoading);
    els.petPanel.classList.toggle("hasRefreshError", hasError && !isLoading);
    els.petPanel.setAttribute("aria-busy", isLoading ? "true" : "false");
    const remaining = state.petNextRefreshAt ? Math.max(0, state.petNextRefreshAt - Date.now()) : dashboardAutoRefreshMs;
    const progress = Math.max(0, Math.min(100, ((dashboardAutoRefreshMs - remaining) / dashboardAutoRefreshMs) * 100));
    els.petPanel.style.setProperty("--pet-refresh-progress", `${progress.toFixed(2)}%`);
  }
  if (els.petRefreshButton) {
    els.petRefreshButton.disabled = isLoading;
    els.petRefreshButton.classList.toggle("loading", isLoading);
  }
  if (els.petRefreshStatus) {
    const tone = isLoading ? "loading" : hasError ? "danger" : "fresh";
    els.petRefreshStatus.className = `petRefreshStatus ${tone}`;
    els.petRefreshStatus.textContent = isLoading ? "全页刷新中" : hasError ? "刷新失败" : "全页自动 5m";
  }
  if (els.petLastRefresh) {
    els.petLastRefresh.textContent = state.petLastRefreshAt
      ? `最近刷新 ${new Date(state.petLastRefreshAt).toLocaleTimeString()}`
      : "最近刷新 --";
    els.petLastRefresh.title = state.petLastRefreshAt
      ? new Date(state.petLastRefreshAt).toLocaleString()
      : "";
  }
  if (els.petNextRefresh) {
    const remaining = state.petNextRefreshAt ? state.petNextRefreshAt - Date.now() : 0;
    els.petNextRefresh.textContent = state.petNextRefreshAt
      ? `下次 ${formatCountdown(remaining)}`
      : "下次 --";
  }
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function loadTradingStats(forceRefresh) {
  setFreshnessBadge(els.tradingFreshness, "loading", state.tradingStats ? "交易额更新中" : "交易额加载中");
  if (!state.tradingStats && els.tradingVolumeChart) {
    els.tradingVolumeChart.innerHTML = '<div class="chartEmpty">正在加载交易额</div>';
  }
  try {
    const response = await fetch(`/api/trading-stats${forceRefresh ? "?refresh=1" : ""}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    state.tradingStats = payload;
    updateFreshnessBadge(els.tradingFreshness, "交易额", payload.generatedAt || payload.fetchedAt, 10 * 60 * 1000);
    renderTradingStats();
  } catch (error) {
    setFreshnessBadge(els.tradingFreshness, "danger", "交易额加载失败");
    if (els.tradingActivityTable) {
      els.tradingActivityTable.innerHTML = `
        <tr><td colspan="3" class="empty">${escapeHtml(error.message || "交易统计加载失败")}</td></tr>
      `;
    }
    if (els.tradingVolumeChart) {
      els.tradingVolumeChart.innerHTML = `<div class="chartEmpty">${escapeHtml(error.message || "交易统计加载失败")}</div>`;
    }
  }
}

function renderPet(pet) {
  if (!els.petAvatar) return;
  els.petAvatar.dataset.mood = pet.mood || "calm";
  updateWangcaiMood(pet.mood || "calm");
  if (els.petFace) els.petFace.textContent = petMouth(pet.mood);
  els.petMoodBadge.textContent = pet.moodLabel || "平静";
  els.petMoodBadge.className = `badge ${petMoodClass(pet.mood)}`;
  els.petMessage.textContent = pet.message || "正在观察今天的净值变化。";
  els.petOneDay.textContent = `1天 ${signedPercent(pet.metrics?.oneDayReturnPct || 0)}`;
  els.petSevenDay.textContent = `7天 ${signedPercent(pet.metrics?.sevenDayReturnPct || 0)}`;
  if (els.petThirtyDay) els.petThirtyDay.textContent = `30天 ${signedPercent(pet.metrics?.thirtyDayReturnPct || 0)}`;
  if (els.petAllDay) els.petAllDay.textContent = `全部 ${signedPercent(pet.metrics?.allDayReturnPct || 0)}`;
  els.petSource.textContent = pet.source === "llm" ? "AI短评" : "本地状态";
  renderPulseMetrics(pet.metrics || {});
  maybeShowWangcaiBubble("account", pet.message);
}

function currentManualAccountsEnabled() {
  if (typeof state.manualAccounts?.enabled === "boolean") return state.manualAccounts.enabled;
  if (typeof state.summary?.features?.manualAccountsEnabled === "boolean") {
    return state.summary.features.manualAccountsEnabled;
  }
  return Boolean(state.manualAccountsEnabled);
}

function updateManualToggleButton() {
  if (!els.manualToggleButton) return;
  const enabled = currentManualAccountsEnabled();
  els.manualToggleButton.textContent = enabled ? "A股记录：开启" : "A股记录：关闭";
  els.manualToggleButton.setAttribute("aria-pressed", enabled ? "true" : "false");
  els.manualToggleButton.title = enabled
    ? "关闭后保留已有手工记录，但从总资产和收益统计里剔除。"
    : "开启后需要手工录入 A 股账户净值。";
}

function renderManualAccounts() {
  if (!els.manualAccountsTable) return;
  const enabled = currentManualAccountsEnabled();
  const hasPayload = Boolean(state.manualAccounts);
  const isConfirmingState = state.manualAccountsLoading && !hasPayload;
  const hasBlockingError = Boolean(state.manualAccountsError && !hasPayload);
  state.manualAccountsEnabled = enabled;
  updateManualToggleButton();
  els.manualDisabledState?.classList.toggle("hidden", enabled || isConfirmingState || hasBlockingError);
  els.manualLedgerPanel?.classList.toggle("hidden", !enabled && !isConfirmingState && !hasBlockingError);
  els.manualDisableButton?.classList.toggle("hidden", !enabled);
  if (isConfirmingState) {
    if (els.manualAccountStat) els.manualAccountStat.textContent = "正在确认";
    if (els.manualAccountUpdatedAt) els.manualAccountUpdatedAt.textContent = "--";
    els.manualAccountsTable.innerHTML = '<div class="empty loadingState">正在确认 A 股记录状态</div>';
    if (els.manualEntriesList) {
      els.manualEntriesList.innerHTML = '<div class="empty loadingState">正在加载手工记录</div>';
    }
    return;
  }
  if (hasBlockingError) {
    if (els.manualAccountStat) els.manualAccountStat.textContent = "加载失败";
    if (els.manualAccountUpdatedAt) els.manualAccountUpdatedAt.textContent = "--";
    els.manualAccountsTable.innerHTML = `<div class="empty">${escapeHtml(state.manualAccountsError)}</div>`;
    if (els.manualEntriesList) {
      els.manualEntriesList.innerHTML = `<div class="empty">${escapeHtml(state.manualAccountsError)}</div>`;
    }
    return;
  }
  if (!enabled) {
    if (els.manualAccountStat) els.manualAccountStat.textContent = "未开启";
    if (els.manualAccountUpdatedAt) els.manualAccountUpdatedAt.textContent = "--";
    return;
  }
  const rows = state.manualAccounts?.accounts || [];
  const activeRows = rows.filter((account) => !account.archived);
  const totalCny = activeRows.reduce((total, account) => total + Number(account.equityCny || 0), 0);

  els.manualAccountStat.textContent = activeRows.length
    ? `${activeRows.length} 个账户 · ${cnyFormat.format(totalCny)}`
    : "暂无账户";
  els.manualAccountUpdatedAt.textContent = state.manualAccounts?.updatedAt
    ? new Date(state.manualAccounts.updatedAt).toLocaleString()
    : "--";

  if (!rows.length) {
    els.manualAccountsTable.innerHTML = '<div class="empty">暂无手工账户</div>';
    renderManualEntries();
    return;
  }

  els.manualAccountsTable.innerHTML = rows
    .map((account) => {
      const latestEntry = latestManualEntryForAccount(account.id, account.lastEntryDate);
      return `
      <div class="manualAccountRow ${account.archived ? "mutedRow" : ""}">
        <div class="manualAccountIdentity">
          <div class="email">${escapeHtml(account.label)}</div>
          <div class="subtle">${escapeHtml([account.broker, account.accountNo, account.archived ? "已归档" : ""].filter(Boolean).join(" · ") || "手工账户")}</div>
          ${tagBadges(account.tags || []) || ""}
        </div>
        <div class="manualAccountMetric">
          <span>最新净值</span>
          <strong>${cnyFormat.format(account.equityCny || 0)}</strong>
          <small>${usdFormat.format(account.equityUsdt || 0)}</small>
        </div>
        <div class="manualAccountMetric">
          <span>最近记录</span>
          <strong>${escapeHtml(account.lastEntryDate || "-")}</strong>
          <small>${manualCashFlowInline(latestEntry)}</small>
        </div>
        <div class="rowActions">
          <button class="miniButton" type="button" data-manual-edit="${escapeHtml(account.id)}">编辑</button>
          <button class="miniButton danger" type="button" data-manual-archive="${escapeHtml(account.id)}" ${account.archived ? "disabled" : ""}>归档</button>
        </div>
      </div>
    `;
    })
    .join("");
  renderManualEntries();
}

function renderManualEntries() {
  if (!els.manualEntriesList) return;
  const entries = state.manualAccounts?.entries || [];
  if (!entries.length) {
    els.manualEntriesList.innerHTML = '<div class="empty">暂无手工记录</div>';
    return;
  }
  els.manualEntriesList.innerHTML = entries
    .map((entry) => {
      const account = manualAccountById(entry.accountId);
      const label = account?.label || entry.accountId.replace(/^manual:/, "");
      return `
        <div class="manualEntryRow">
          <div class="manualEntryDate">${escapeHtml(entry.date || "-")}</div>
          <div class="manualEntryMain">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml([account?.broker, entry.note].filter(Boolean).join(" · ") || "净值记录")}</span>
          </div>
          <div class="manualEntryValue">
            <span>净值</span>
            <strong>${cnyFormat.format(entry.equityCny || 0)}</strong>
          </div>
          <div class="manualEntryFlow ${cashFlowClass(entry.cashFlowCny)}">
            <span>${entry.cashFlowType === "opening" ? "初始" : "出入金"}</span>
            <strong>${manualCashFlowText(entry.cashFlowCny)}</strong>
          </div>
          <button class="miniButton" type="button" data-manual-entry-edit="${escapeHtml(entry.id)}">补录/修改</button>
        </div>
      `;
    })
    .join("");
}

function renderPulseMetrics(metrics) {
  updatePulseMetric(els.pulseOneDay, metrics.oneDayReturnPct);
  updatePulseMetric(els.pulseSevenDay, metrics.sevenDayReturnPct);
  updatePulseMetric(els.pulseThirtyDay, metrics.thirtyDayReturnPct);
  updatePulseMetric(els.pulseAllDay, metrics.allDayReturnPct);
  if (els.pulseSample) {
    const samples = Number(metrics.sampleCount || 0);
    els.pulseSample.textContent = samples ? `${samples} 次` : "--";
    els.pulseSample.className = "";
  }
}

function updatePulseMetric(element, value) {
  if (!element) return;
  if (value === undefined || value === null || value === "") {
    element.textContent = "--";
    element.className = "";
    return;
  }
  const number = Number(value || 0);
  element.textContent = signedPercent(number);
  element.className = returnClass(number);
}

function setupWangcaiPet() {
  if (!els.wangcaiPet || !els.wangcaiPetImage) return;

  preloadWangcaiAssets();
  els.wangcaiPetImage.addEventListener("error", loadOnekoFallback, { once: true });
  els.wangcaiPetImage.addEventListener("load", activateWangcaiPet);
  if (els.wangcaiPetImage.complete) {
    if (els.wangcaiPetImage.naturalWidth > 0) activateWangcaiPet();
    else loadOnekoFallback();
  }

  const startX = Math.min(window.innerWidth - 90, Math.max(24, window.innerWidth * 0.2));
  const startY = Math.min(window.innerHeight - 90, Math.max(24, window.innerHeight * 0.28));
  wangcaiState.x = startX;
  wangcaiState.y = startY;
  wangcaiState.targetX = startX;
  wangcaiState.targetY = startY;
  wangcaiState.pointerX = startX + 54;
  wangcaiState.pointerY = startY + 54;
  moveWangcai(startX, startY);
  scheduleNextIdleAction();
  scheduleNextBubble();
  if (reducedMotionQuery) {
    const handleMotionPreference = () => {
      if (prefersReducedMotion()) {
        window.cancelAnimationFrame(wangcaiState.animationFrameId);
        wangcaiState.animationFrameId = 0;
        closeWangcaiMenu();
        return;
      }
      startWangcaiLoop();
    };
    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", handleMotionPreference);
    } else if (reducedMotionQuery.addListener) {
      reducedMotionQuery.addListener(handleMotionPreference);
    }
  }

  window.addEventListener("pointermove", (event) => {
    if (!wangcaiState.enabled || wangcaiState.hidden || state.quietPet || prefersReducedMotion()) return;
    wangcaiState.pointerX = event.clientX;
    wangcaiState.pointerY = event.clientY;
    if (wangcaiState.dragging) {
      const maxX = Math.max(12, window.innerWidth - 116);
      const maxY = Math.max(12, window.innerHeight - 116);
      wangcaiState.x = Math.min(maxX, Math.max(12, event.clientX - wangcaiState.dragOffsetX));
      wangcaiState.y = Math.min(maxY, Math.max(12, event.clientY - wangcaiState.dragOffsetY));
      wangcaiState.targetX = wangcaiState.x;
      wangcaiState.targetY = wangcaiState.y;
      wangcaiState.velocityX = 0;
      wangcaiState.velocityY = 0;
      moveWangcai(wangcaiState.x, wangcaiState.y);
      return;
    }
    wangcaiState.targetX = event.clientX + 18;
    wangcaiState.targetY = event.clientY + 20;
    wangcaiState.lastPointerMoveAt = performance.now();
  });
  window.addEventListener("pointerdown", (event) => {
    if (!wangcaiState.enabled || wangcaiState.hidden) return;
    if (event.target.closest("[data-wangcai-command]")) return;
    const petCenterX = wangcaiState.x + 54;
    const petCenterY = wangcaiState.y + 54;
    const distance = Math.hypot(event.clientX - petCenterX, event.clientY - petCenterY);
    if (distance <= 120) {
      event.preventDefault();
      wangcaiState.pointerDownAt = performance.now();
      wangcaiState.pointerDownX = event.clientX;
      wangcaiState.pointerDownY = event.clientY;
      wangcaiState.dragging = true;
      wangcaiState.dragOffsetX = event.clientX - wangcaiState.x;
      wangcaiState.dragOffsetY = event.clientY - wangcaiState.y;
      if (els.wangcaiPet) els.wangcaiPet.classList.add("dragging");
      holdWangcaiAction("pet", 900);
      return;
    }
    closeWangcaiMenu();
  });
  window.addEventListener("pointerup", (event) => {
    if (!wangcaiState.dragging) return;
    const moved = Math.hypot(event.clientX - wangcaiState.pointerDownX, event.clientY - wangcaiState.pointerDownY);
    const held = performance.now() - wangcaiState.pointerDownAt;
    wangcaiState.dragging = false;
    if (els.wangcaiPet) els.wangcaiPet.classList.remove("dragging");
    if (moved < 8 && held < 420) {
      toggleWangcaiMenu();
      holdWangcaiAction("pet", 1300);
      maybeShowWangcaiBubble("touch", wangcaiFallbackQuip("touch"), true);
    } else {
      holdWangcaiAction("wag", 1300);
      maybeShowWangcaiBubble("drag", wangcaiFallbackQuip("drag"), true);
    }
  });
  if (els.wangcaiMenu) {
    els.wangcaiMenu.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    els.wangcaiMenu.addEventListener("click", (event) => {
      const button = event.target.closest("[data-wangcai-command]");
      if (!button) return;
      event.preventDefault();
      handleWangcaiCommand(button.dataset.wangcaiCommand);
    });
  }
  if (els.wangcaiRecall) {
    els.wangcaiRecall.addEventListener("click", recallWangcai);
  }
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeWangcaiMenu();
  });
  window.addEventListener("resize", () => {
    wangcaiState.x = Math.min(wangcaiState.x, window.innerWidth - 92);
    wangcaiState.y = Math.min(wangcaiState.y, window.innerHeight - 92);
  });
  startWangcaiLoop();
}

function prefersReducedMotion() {
  return Boolean(reducedMotionQuery?.matches);
}

function startWangcaiLoop() {
  if (!wangcaiState.enabled || state.quietPet || prefersReducedMotion() || wangcaiState.animationFrameId) return;
  wangcaiState.lastTickAt = 0;
  wangcaiState.animationFrameId = requestAnimationFrame(tickWangcai);
}

function activateWangcaiPet() {
  wangcaiState.enabled = true;
  if (els.wangcaiPet) els.wangcaiPet.classList.add("ready");
  startWangcaiLoop();
}

function toggleWangcaiMenu() {
  setWangcaiMenuOpen(!wangcaiState.menuOpen);
}

function closeWangcaiMenu() {
  setWangcaiMenuOpen(false);
}

function setWangcaiMenuOpen(isOpen) {
  wangcaiState.menuOpen = Boolean(isOpen);
  if (els.wangcaiPet) els.wangcaiPet.classList.toggle("menuOpen", wangcaiState.menuOpen);
  if (els.wangcaiMenu) els.wangcaiMenu.classList.toggle("visible", wangcaiState.menuOpen);
}

function handleWangcaiCommand(command) {
  closeWangcaiMenu();
  if (command === "hide") {
    hideWangcai();
    return;
  }
  const config = wangcaiCommandConfig[command] || wangcaiCommandConfig.pet;
  holdWangcaiAction(config.action, config.duration, command === "work");
  maybeShowWangcaiBubble(config.trigger, config.fallback, true);
}

function holdWangcaiAction(action, duration = 1600, shouldWander = false) {
  const now = performance.now();
  wangcaiState.holdAction = action;
  wangcaiState.commandAction = action;
  wangcaiState.holdActionUntil = now + duration;
  wangcaiState.nextIdleActionAt = 0;
  if (shouldWander) {
    const maxX = Math.max(12, window.innerWidth - 116);
    const maxY = Math.max(12, window.innerHeight - 116);
    const offsetX = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180);
    const offsetY = (Math.random() - 0.5) * 160;
    wangcaiState.targetX = Math.min(maxX, Math.max(12, wangcaiState.x + offsetX));
    wangcaiState.targetY = Math.min(maxY, Math.max(12, wangcaiState.y + offsetY));
  }
}

function hideWangcai() {
  maybeShowWangcaiBubble("hide", wangcaiFallbackQuip("hide"), true);
  wangcaiState.hidden = true;
  closeWangcaiMenu();
  if (els.wangcaiPet) els.wangcaiPet.classList.add("hiddenByUser");
  if (els.wangcaiRecall) els.wangcaiRecall.classList.remove("hidden");
}

function recallWangcai() {
  wangcaiState.hidden = false;
  if (els.wangcaiPet) els.wangcaiPet.classList.remove("hiddenByUser");
  if (els.wangcaiRecall) els.wangcaiRecall.classList.add("hidden");
  holdWangcaiAction("celebrate", 1800);
  maybeShowWangcaiBubble("recall", wangcaiFallbackQuip("recall"), true);
}

function preloadWangcaiAssets() {
  const assets = new Set([
    ...Object.values(wangcaiMoodAssets),
    ...wangcaiMotionAssets.blink,
    ...wangcaiMotionAssets.wag,
    ...wangcaiMotionAssets.eat,
    ...wangcaiMotionAssets.pet,
    ...wangcaiMotionAssets.runFlow,
    wangcaiMotionAssets.sit,
    wangcaiMotionAssets.stretch,
    ...wangcaiMotionAssets.nap,
    ...Object.values(wangcaiMotionAssets.walk).flat(),
    ...Object.values(wangcaiMotionAssets.run).flat()
  ]);
  assets.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function updateWangcaiMood(mood) {
  wangcaiState.mood = wangcaiMoodAssets[mood] ? mood : "calm";
  if (!els.wangcaiPet || !els.wangcaiPetImage) return;
  els.wangcaiPet.dataset.mood = wangcaiState.mood;
  if (["celebrate", "nap"].includes(wangcaiState.idleAction)) scheduleNextIdleAction();
  if (wangcaiState.action === "stand") setWangcaiAsset(wangcaiCurrentMoodAsset());
}

function tickWangcai(now = 0) {
  wangcaiState.animationFrameId = 0;
  if (state.quietPet || prefersReducedMotion()) return;
  if (els.wangcaiPet && wangcaiState.enabled && !wangcaiState.hidden) {
    const dt = Math.min(0.08, Math.max(0.016, (now - (wangcaiState.lastTickAt || now)) / 1000 || 0.016));
    wangcaiState.lastTickAt = now;
    const maxX = Math.max(12, window.innerWidth - 116);
    const maxY = Math.max(12, window.innerHeight - 116);
    const targetX = Math.min(maxX, Math.max(12, wangcaiState.targetX));
    const targetY = Math.min(maxY, Math.max(12, wangcaiState.targetY));
    const dx = targetX - wangcaiState.x;
    const dy = targetY - wangcaiState.y;
    const distance = Math.hypot(dx, dy);
    const action = wangcaiActionForDistance(distance, now);
    wangcaiState.lastDistance = distance;
    moveWangcaiToward(dx, dy, distance, action, dt);
    updateWangcaiAction(action, now);
    updateWangcaiBubble(action, distance, now);
    if (Math.abs(dx) > 6) els.wangcaiPet.classList.toggle("flip", dx > 0);
    moveWangcai(wangcaiState.x, wangcaiState.y);
  }
  wangcaiState.animationFrameId = requestAnimationFrame(tickWangcai);
}

function wangcaiActionForDistance(distance, now) {
  if (wangcaiState.dragging) return "pet";
  if (wangcaiState.holdAction && now < wangcaiState.holdActionUntil) {
    if (wangcaiState.holdAction === "work") return distance > 120 ? "walk" : "watch";
    return wangcaiState.holdAction;
  }
  wangcaiState.holdAction = "";
  wangcaiState.commandAction = "";
  if (distance > 430) return "run";
  if (distance > 210) return "walk";
  if (distance > 132) return "watch";
  if (now >= wangcaiState.nextIdleActionAt) scheduleNextIdleAction(now);
  return wangcaiState.idleAction;
}

function scheduleNextIdleAction(now = performance.now()) {
  const actions = wangcaiIdleActionsByMood[wangcaiState.mood] || wangcaiIdleActionsByMood.calm;
  wangcaiState.idleAction = actions[Math.floor(Math.random() * actions.length)];
  wangcaiState.nextIdleActionAt = now + 4200 + Math.random() * 7600;
}

function updateWangcaiAction(action, now) {
  if (wangcaiState.action !== action) {
    wangcaiState.action = action;
    wangcaiState.frameIndex = 0;
    wangcaiState.lastFrameAt = 0;
    wangcaiState.actionStartedAt = now;
    if (els.wangcaiPet) els.wangcaiPet.dataset.action = action;
  }

  if (action === "run" || action === "walk") {
    const frameDuration = action === "run" ? 120 : 220;
    const frames = wangcaiMotionFrames(action);
    if (!wangcaiState.lastFrameAt || now - wangcaiState.lastFrameAt > frameDuration) {
      wangcaiState.frameIndex = (wangcaiState.frameIndex + 1) % frames.length;
      wangcaiState.lastFrameAt = now;
    }
    setWangcaiAsset(frames[wangcaiState.frameIndex]);
    return;
  }

  if (action === "sit" || action === "watch") {
    setWangcaiAsset(wangcaiMotionAssets.sit);
    return;
  }

  if (action === "blink" || action === "wag" || action === "eat" || action === "pet") {
    const frames = wangcaiMotionAssets[action];
    const frameDuration = action === "blink" ? 520 : action === "wag" ? 260 : 420;
    if (!wangcaiState.lastFrameAt || now - wangcaiState.lastFrameAt > frameDuration) {
      wangcaiState.frameIndex = (wangcaiState.frameIndex + 1) % frames.length;
      wangcaiState.lastFrameAt = now;
    }
    setWangcaiAsset(frames[wangcaiState.frameIndex]);
    return;
  }

  if (action === "stretch") {
    setWangcaiAsset(wangcaiMotionAssets.stretch);
    return;
  }

  if (action === "nap" || action === "sleep") {
    const frameDuration = 900;
    if (!wangcaiState.lastFrameAt || now - wangcaiState.lastFrameAt > frameDuration) {
      wangcaiState.frameIndex = (wangcaiState.frameIndex + 1) % wangcaiMotionAssets.nap.length;
      wangcaiState.lastFrameAt = now;
    }
    setWangcaiAsset(wangcaiMotionAssets.nap[wangcaiState.frameIndex]);
    return;
  }

  if (action === "celebrate") {
    const frames = [wangcaiMoodAssets.happy, wangcaiMotionAssets.wag[1], wangcaiMoodAssets.happy];
    const frameDuration = 220;
    if (!wangcaiState.lastFrameAt || now - wangcaiState.lastFrameAt > frameDuration) {
      wangcaiState.frameIndex = (wangcaiState.frameIndex + 1) % frames.length;
      wangcaiState.lastFrameAt = now;
    }
    setWangcaiAsset(frames[wangcaiState.frameIndex]);
    return;
  }

  setWangcaiAsset(wangcaiCurrentMoodAsset());
}

function moveWangcaiToward(dx, dy, distance, action, dt) {
  if (wangcaiState.dragging || (action !== "run" && action !== "walk")) {
    wangcaiState.velocityX *= 0.7;
    wangcaiState.velocityY *= 0.7;
    return;
  }
  const speed = action === "run" ? 48 : 26;
  const slowdownDistance = action === "run" ? 560 : 260;
  const speedScale = Math.min(1, Math.max(0.35, distance / slowdownDistance));
  const nx = distance > 0 ? dx / distance : 0;
  const ny = distance > 0 ? dy / distance : 0;
  const targetVelocityX = nx * speed * speedScale;
  const targetVelocityY = ny * speed * speedScale;
  const blend = action === "run" ? 0.12 : 0.16;
  wangcaiState.velocityX += (targetVelocityX - wangcaiState.velocityX) * blend;
  wangcaiState.velocityY += (targetVelocityY - wangcaiState.velocityY) * blend;
  const stepX = wangcaiState.velocityX * dt;
  const stepY = wangcaiState.velocityY * dt;
  if (Math.hypot(stepX, stepY) >= distance) {
    wangcaiState.x += dx;
    wangcaiState.y += dy;
    wangcaiState.velocityX = 0;
    wangcaiState.velocityY = 0;
    return;
  }
  wangcaiState.x += stepX;
  wangcaiState.y += stepY;
}

function wangcaiCurrentMoodAsset() {
  return wangcaiMoodAssets[wangcaiState.mood] || wangcaiMoodAssets.calm;
}

function wangcaiMotionFrames(action) {
  if (action === "run") return wangcaiMotionAssets.runFlow;
  const byMood = wangcaiMotionAssets[action] || wangcaiMotionAssets.run;
  return byMood[wangcaiState.mood] || byMood.calm;
}

function setWangcaiAsset(nextAsset) {
  if (!nextAsset || !els.wangcaiPetImage || wangcaiState.lastAsset === nextAsset) return;
  wangcaiState.lastAsset = nextAsset;
  els.wangcaiPetImage.src = nextAsset;
}

function updateWangcaiBubble(action, distance, now) {
  if (action === "run" && distance > 430 && now - wangcaiState.lastRunQuipAt > 18000) {
    wangcaiState.lastRunQuipAt = now;
    maybeShowWangcaiBubble("chase");
    return;
  }
  if (action === "walk" && distance > 220 && now - wangcaiState.lastWalkQuipAt > 24000) {
    wangcaiState.lastWalkQuipAt = now;
    maybeShowWangcaiBubble("walk");
    return;
  }
  if (action === "watch" && now - wangcaiState.lastNearQuipAt > 26000) {
    wangcaiState.lastNearQuipAt = now;
    maybeShowWangcaiBubble("watch");
    return;
  }
  if ((action === "stand" || action === "sit" || action === "watch" || action === "stretch" || action === "nap" || action === "eat" || action === "pet" || action === "blink" || action === "wag" || action === "celebrate") && now >= wangcaiState.nextBubbleAt) {
    maybeShowWangcaiBubble(action === "stand" || action === "blink" || action === "wag" ? "idle" : action === "pet" ? "touch" : action);
    scheduleNextBubble(now);
  }
}

function scheduleNextBubble(now = performance.now()) {
  wangcaiState.nextBubbleAt = now + 15000 + Math.random() * 24000;
}

async function maybeShowWangcaiBubble(trigger, preferredText = "", force = false) {
  if (!els.wangcaiBubble || wangcaiState.fallbackLoaded || state.quietPet) return;
  const now = performance.now();
  if (!force && wangcaiState.lastQuipAt && now - wangcaiState.lastQuipAt < 9000) return;
  wangcaiState.lastQuipAt = now;

  if (preferredText && Math.random() < 0.35) {
    showWangcaiBubble(preferredText);
    return;
  }

  const fallback = wangcaiFallbackQuip(trigger);
  if (wangcaiState.quipLoading) {
    showWangcaiBubble(fallback);
    return;
  }

  wangcaiState.quipLoading = true;
  try {
    const response = await fetch(`/api/pet/quip?trigger=${encodeURIComponent(trigger)}&distance=${Math.round(wangcaiState.lastDistance)}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    showWangcaiBubble(payload.message || fallback);
  } catch (_error) {
    showWangcaiBubble(fallback);
  } finally {
    wangcaiState.quipLoading = false;
  }
}

function wangcaiFallbackQuip(trigger) {
  const bucket = trigger === "run" || trigger === "chase"
    ? "chase"
    : ["walk", "touch", "sit", "watch", "stretch", "nap", "celebrate", "drag", "feed", "sleep", "work"].includes(trigger)
      ? trigger
    : trigger === "account"
      ? "account"
      : "idle";
  const options = wangcaiFallbackQuips[bucket] || wangcaiFallbackQuips.idle;
  return options[Math.floor(Math.random() * options.length)];
}

function showWangcaiBubble(message) {
  if (!els.wangcaiBubble) return;
  const text = String(message || "").replace(/\s+/g, " ").trim();
  if (!text) return;
  els.wangcaiBubble.textContent = text.slice(0, 42);
  els.wangcaiBubble.classList.add("visible");
  window.clearTimeout(wangcaiState.bubbleHideTimer);
  wangcaiState.bubbleHideTimer = window.setTimeout(() => {
    if (els.wangcaiBubble) els.wangcaiBubble.classList.remove("visible");
  }, 5200);
}

function moveWangcai(x, y) {
  if (!els.wangcaiPet) return;
  els.wangcaiPet.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  els.wangcaiPet.classList.toggle("bubbleLeft", x > window.innerWidth - 310);
  els.wangcaiPet.classList.toggle("bubbleBelow", y < 150);
}

function loadOnekoFallback() {
  if (wangcaiState.fallbackLoaded) return;
  wangcaiState.fallbackLoaded = true;
  if (els.wangcaiPet) els.wangcaiPet.remove();
  const script = document.createElement("script");
  script.src = "/vendor/oneko/oneko.js?v=20260520-wangcai-moodrun";
  script.dataset.cat = "/vendor/oneko/wangcai.gif";
  script.dataset.persistPosition = "true";
  document.body.appendChild(script);
}

function renderSummary() {
  const { totals, quote } = state.summary;
  const totalBtc = Number(totals.allAccountsTotalAssetBtc);
  const masterBtc = Number(totals.masterAccountTotalAssetBtc);
  const subsBtc = Number(totals.subAccountsTotalAssetBtc);
  const manualBtc = Number(totals.manualAccountsTotalAssetBtc || 0);
  const fiat = quote?.fiat || {};
  const cnyRate = Number(fiat.rate || 0);

  els.totalBtc.textContent = `${btcFormat.format(totalBtc)} BTC`;
  els.totalUsdt.innerHTML = assetEstimateHtml(totals.allAccountsTotalAssetUsdt, totals.allAccountsTotalAssetCny, cnyRate, fiat);
  els.masterBtc.textContent = `${btcFormat.format(masterBtc)} BTC`;
  els.masterUsdt.innerHTML = assetEstimateHtml(masterBtc * quote.price, totals.masterAccountTotalAssetCny, cnyRate, fiat);
  els.subsBtc.textContent = `${btcFormat.format(subsBtc)} BTC`;
  els.subsCount.innerHTML = `${totals.totalSubAccountsListed} 个子账户，${totals.nonZeroSubAccounts} 个非零；手工账户 ${totals.manualAccountCount || 0} 个${assetRmbLine((totals.subAccountsTotalAssetCny || 0) + (totals.manualAccountsTotalAssetCny || 0), (subsBtc + manualBtc) * quote.price, cnyRate, fiat)}`;
  els.updatedAt.textContent = `${new Date(state.summary.generatedAt).toLocaleString()}${state.summary.stale ? " · 上次完整数据" : ""}`;
  renderMarketQuotes(quote?.markets || []);
  els.nonZeroStat.textContent = `${totals.nonZeroSubAccounts} non-zero · ${totals.manualAccountCount || 0} manual`;
  els.summarySource.textContent = state.summary.stale
    ? `上次完整数据 · ${coverageText(state.summary.coverage)}`
    : coverageText(state.summary.coverage);

  renderBars();
  renderCoverage();
  renderAccounts();
}

function assetEstimateHtml(usdtValue, cnyValue, cnyRate, fiat) {
  const usdt = Number(usdtValue || 0);
  const cny = Number(cnyValue || 0) || (cnyRate > 0 ? usdt * cnyRate : 0);
  const sourceText = fiat?.source === "fallback" ? "RMB估算" : "RMB折算";
  return `${usdFormat.format(usdt)} 估算${cny > 0 ? `<span>${cnyFormat.format(cny)} ${sourceText}</span>` : ""}`;
}

function assetRmbLine(cnyValue, usdtValue, cnyRate, fiat) {
  const cny = Number(cnyValue || 0) || (cnyRate > 0 ? Number(usdtValue || 0) * cnyRate : 0);
  if (!cny) return "";
  const sourceText = fiat?.source === "fallback" ? "RMB估算" : "RMB折算";
  return `<span>${cnyFormat.format(cny)} ${sourceText}</span>`;
}

function renderMarketQuotes(quotes) {
  if (!els.marketQuotes) return;
  const rows = Array.isArray(quotes) && quotes.length
    ? quotes
    : [{ symbol: "BTCUSDT", baseAsset: "BTC", price: state.summary?.quote?.price || 0, priceChangePercent: 0 }];
  els.marketQuotes.innerHTML = rows
    .map((quote) => {
      const change = Number(quote.priceChangePercent || 0);
      const positive = change >= 0;
      const baseAsset = quote.baseAsset || String(quote.symbol || "").replace("USDT", "");
      return `
        <div class="marketQuote ${positive ? "up" : "down"}">
          <strong>${escapeHtml(baseAsset)}</strong>
          <b>${compactUsdFormat.format(Number(quote.price || 0))}</b>
          <em>${positive ? "+" : ""}${change.toFixed(2)}%</em>
        </div>
      `;
    })
    .join("");
}

function renderBars() {
  const total = state.summary.distribution.reduce((sum, row) => sum + BigInt(row.totalAssetSats), 0n);
  const topRows = state.summary.distribution
    .filter((row) => BigInt(row.totalAssetSats) > 0n)
    .slice(0, 12);

  if (!topRows.length) {
    els.bars.innerHTML = '<div class="empty">没有非零资产账户</div>';
    return;
  }

  els.bars.innerHTML = topRows
    .map((row) => {
      const sats = BigInt(row.totalAssetSats);
      const pct = total > 0n ? Number(sats * 10000n / total) / 100 : 0;
      return `
        <div class="barRow">
          <div class="barLabel" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</div>
          <div class="barTrack" aria-hidden="true">
            <div class="barFill" style="width: ${Math.max(pct, 0.4)}%"></div>
          </div>
          <div class="barValue">${pct.toFixed(2)}% · ${compactUsdFormat.format(row.totalAssetUsdt)}</div>
        </div>
      `;
    })
    .join("");
}

function renderAccounts() {
  if (!state.summary) return;

  const totalSats = decimalToSats(state.summary.totals.allAccountsTotalAssetBtc);
  const rows = state.summary.accounts.filter((account) => {
    if (!state.filter) return true;
    return `${account.email} ${account.remark} ${(account.tags || []).join(" ")}`
      .toLowerCase()
      .includes(state.filter);
  });

  if (!rows.length) {
    els.accountsTable.innerHTML = '<tr><td colspan="11" class="empty">没有匹配的子账户</td></tr>';
    return;
  }

  els.accountsTable.innerHTML = rows
    .map((account) => {
      const sats = BigInt(account.totalAssetSats);
      const pct = totalSats > 0n ? Number(sats * 1000000n / totalSats) / 1000000 : 0;
      const badges = [
        account.isFreeze ? '<span class="badge danger">Frozen</span>' : '<span class="badge">Active</span>',
        account.isManagedSubAccount ? '<span class="badge warn">Managed</span>' : "",
        account.isAssetManagementSubAccount ? '<span class="badge warn">Asset Mgmt</span>' : "",
        !account.hasSpotSummary ? '<span class="badge warn">No Spot</span>' : "",
        !account.hasMarginSummary ? '<span class="badge muted">No Margin</span>' : "",
        !account.hasUsdMFuturesSummary && !account.hasCoinMFuturesSummary
          ? '<span class="badge muted">No Futures</span>'
          : ""
      ]
        .filter(Boolean)
        .join(" ");
      const futuresBtc = Number(account.usdMFuturesAssetBtc) + Number(account.coinMFuturesAssetBtc);

      return `
        <tr>
          <td class="accountCell">
            <div class="email">${escapeHtml(account.email)}</div>
            <div class="subtle">${account.listed ? "sub-account list" : "spot summary only"}</div>
	          </td>
	          <td>${escapeHtml(account.remark || "-")}</td>
	          <td>${accountModeBadge(account)}</td>
	          <td>${tagInput(account)}</td>
	          <td>${badges}</td>
	          <td class="num">${btcFormat.format(Number(account.spotAssetBtc))}</td>
          <td class="num">${btcFormat.format(Number(account.marginAssetBtc))}</td>
          <td class="num">${btcFormat.format(futuresBtc)}</td>
          <td class="num">${btcFormat.format(Number(account.totalAssetBtc))}</td>
          <td class="num">${usdFormat.format(account.totalAssetUsdt)}</td>
          <td class="num">${percentFormat.format(pct)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCoverage() {
  if (!els.coverageList || !state.summary.coverage) return;

  const coverage = state.summary.coverage || [];
  const masterItems = coverage.filter((item) => item.scope === "master");
  const subItems = coverage.filter((item) => item.scope !== "master");
  const masterMode = state.summary.totals?.masterAccountMode === "unified" ? "统一账户" : "普通账户";

  els.coverageList.innerHTML = [
    coverageGroupHtml("子账户数据源", "用于发现子账户并汇总每个子账户的现货、杠杆和合约权益。", subItems),
    coverageGroupHtml(
      "母账户数据源",
      `当前母账户类型：${masterMode}。普通母账户使用现货/杠杆/U本位合约/币本位合约接口；统一母账户会使用 Portfolio Margin 权益接口兜底。`,
      masterItems
    )
  ].join("");
}

function coverageGroupHtml(title, description, items) {
  return `
    <section class="coverageGroup">
      <div class="coverageGroupHead">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="coverageGrid">
        ${items.map(coverageItemHtml).join("")}
      </div>
    </section>
  `;
}

function coverageItemHtml(item) {
  const disabled = Boolean(item.disabled);
  const optionalMiss = item.optional && !item.ok;
  const status = disabled ? "已禁用" : item.ok ? (item.usedForEquity ? "使用中" : "可用") : optionalMiss ? "可选" : "失败";
  const badgeClass = disabled ? "muted" : item.ok ? (item.usedForEquity ? "info" : "") : optionalMiss ? "muted" : "danger";
  const itemClass = disabled ? "disabled" : item.ok ? "" : optionalMiss ? "optional" : "failed";
  const errorText = item.error ? `接口返回：${item.error.code || "ERROR"} ${item.error.message || ""}` : "";
  const noteText = item.note || coverageItemNote(item);
  return `
    <div class="coverageItem ${itemClass}">
      <span class="badge ${badgeClass}">${escapeHtml(status)}</span>
      <div>
        <strong>${escapeHtml(coverageLabel(item))}</strong>
        <small>${escapeHtml(coverageDescription(item))}</small>
        ${noteText ? `<small>${escapeHtml(noteText)}</small>` : ""}
        ${errorText ? `<small>${escapeHtml(errorText)}</small>` : ""}
      </div>
    </div>
  `;
}

function coverageLabel(item) {
  const labels = {
    spot: "现货资产汇总",
    subMargin: "子账户杠杆账户汇总",
    subUsdMFutures: "子账户 U 本位合约汇总",
    subCoinMFutures: "子账户币本位合约汇总",
    masterMargin: "母账户杠杆账户",
    masterUsdMFutures: "母账户 U 本位合约",
    masterCoinMFutures: "母账户币本位合约",
    masterPortfolioMargin: "母账户统一账户权益",
    masterSimpleEarn: "母账户理财账户"
  };
  return labels[item.key] || item.label || item.key;
}

function coverageDescription(item) {
  const descriptions = {
    spot: "母账户 + 子账户现货资产，来自母子账户现货汇总接口。",
    subMargin: "所有子账户的杠杆账户权益，用于子账户净值统计。",
    subUsdMFutures: "所有子账户的 USDT/USDC 本位合约权益，用于子账户净值统计。",
    subCoinMFutures: "所有子账户的币本位合约权益，用于子账户净值统计。",
    masterMargin: "普通母账户的杠杆账户权益；统一母账户下可由 Portfolio Margin 接口替代。",
    masterUsdMFutures: "普通母账户的 U 本位合约权益；统一母账户下可由 Portfolio Margin 接口替代。",
    masterCoinMFutures: "普通母账户的币本位合约权益；统一母账户下可由 Portfolio Margin 接口替代。",
    masterPortfolioMargin: "母账户为统一账户时使用的组合保证金/统一账户权益接口。",
    masterSimpleEarn: "母账户 Simple Earn 活期/定期理财权益；接口可用时并入母账户净值。"
  };
  return descriptions[item.key] || `${item.endpoint} · ${item.scope}`;
}

function coverageItemNote(item) {
  if (item.key === "masterPortfolioMargin" && item.optional && !item.ok) {
    return "当前母账户不是统一账户时，这个接口不可用是正常现象，不影响采样和收益曲线。";
  }
  if (item.key === "masterPortfolioMargin" && item.usedForEquity) {
    return "当前母账户按统一账户处理，这个接口已经参与母账户净值计算。";
  }
  if (item.key === "masterSimpleEarn" && item.optional && !item.ok) {
    return "没有理财余额、未开通理财或只读 Key 未开放该接口时，这里不可用是正常现象。";
  }
  return "";
}

function renderTradingStats() {
  if (!state.tradingStats || !els.tradingVolumeChart) return;

  const { totals } = state.tradingStats;
  els.tradingVolumeStat.textContent = `${compactUsdFormat.format(totals.totalVolumeUsdt30d || 0)} / 30d`;
  els.tradingActiveStat.textContent = `${totals.activeAccounts || 0}/${totals.accountCount || 0} active`;
  els.tradingCoverageStat.textContent = coverageText(state.tradingStats.coverage || []);

  const selected = els.tradingSeriesSelect.value || "total";
  const options = [state.tradingStats.total, ...(state.tradingStats.accounts || [])];
  els.tradingSeriesSelect.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.id || item.email)}">${escapeHtml(item.label || item.email)}</option>`)
    .join("");
  els.tradingSeriesSelect.value = options.some((item) => (item.id || item.email) === selected) ? selected : "total";

  const series =
    els.tradingSeriesSelect.value === "total"
      ? state.tradingStats.total
      : state.tradingStats.accounts.find((account) => account.email === els.tradingSeriesSelect.value);
  renderTradingVolumeChart(series || state.tradingStats.total);
  renderTradingActivityTable();
}

function renderTradingActivityTable() {
  const rows = (state.tradingStats.accounts || []).slice(0, 20);
  if (!rows.length) {
    els.tradingActivityTable.innerHTML = '<tr><td colspan="3" class="empty">暂无交易统计</td></tr>';
    return;
  }

  els.tradingActivityTable.innerHTML = rows
    .map((account) => `
      <tr>
        <td class="accountCell">
          <div class="email">${escapeHtml(account.email)}</div>
          <div class="subtle">${escapeHtml(account.remark || "-")}</div>
          ${tagBadges(account.tags)}
        </td>
        <td class="num">${usdFormat.format(account.totalVolumeUsdt30d || 0)}</td>
        <td>${formatLastTrade(account.lastTradeAt)}</td>
      </tr>
    `)
    .join("");
}

function renderTagSeriesControls() {
  const tags = tagChartOptions();
  const available = new Set(tags.map((item) => item.tag));
  state.selectedTags = new Set(Array.from(state.selectedTags).filter((tag) => available.has(tag)));

  els.tagSeriesControls.innerHTML = `
    <div class="tagSeriesTitle">Tag 曲线</div>
    <div class="tagSeriesList">
      ${tags
        .map((item, index) => {
          const color = colorForTag(item.tag, index);
          return `
            <label class="tagSeriesOption" style="--tag-color: ${escapeHtml(color)}">
              <input type="checkbox" data-tag-series value="${escapeHtml(item.tag)}" ${state.selectedTags.has(item.tag) ? "checked" : ""} />
              <span class="tagDot" aria-hidden="true"></span>
              <span>${escapeHtml(item.tag)}</span>
              <small>${escapeHtml(tagOptionSubline(item))}</small>
            </label>
          `;
        })
        .join("")}
    </div>
    ${state.performance?.tags?.length ? "" : '<span class="tagSeriesHint">给子账户添加 tag 后，可在这里勾选更多分组曲线。</span>'}
  `;
}

async function saveAccountTags(input) {
  const accountId = input.dataset.accountId;
  const tags = parseTags(input.value);
  input.disabled = true;

  try {
    const response = await fetch("/api/tags/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ accountId, tags })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    updateLocalAccountTags(accountId, payload.tags || tags);
    await loadPerformance();
    if (state.activeView === "positions") await loadPositions(false);
    els.statusText.textContent = "Tag 已保存";
  } catch (error) {
    els.statusText.textContent = "Tag 保存失败";
    alert(error.message || "Tag 保存失败");
  } finally {
    input.disabled = false;
  }
}

function updateLocalAccountTags(accountId, tags) {
  const normalizedId = String(accountId || "").toLowerCase();
  if (state.summary?.accounts) {
    state.summary.accounts = state.summary.accounts.map((account) =>
      String(account.email || "").toLowerCase() === normalizedId ? { ...account, tags } : account
    );
    renderAccounts();
  }
  if (state.tradingStats?.accounts) {
    state.tradingStats.accounts = state.tradingStats.accounts.map((account) =>
      String(account.email || "").toLowerCase() === normalizedId ? { ...account, tags } : account
    );
    renderTradingStats();
  }
  if (state.positions?.accounts) {
    state.positions.accounts = state.positions.accounts.map((account) =>
      String(account.email || "").toLowerCase() === normalizedId ? { ...account, tags } : account
    );
    state.positions.rows = state.positions.rows.map((row) =>
      String(row.accountEmail || "").toLowerCase() === normalizedId ? { ...row, tags } : row
    );
  }
}

function parseTags(value) {
  const seen = new Set();
  const tags = [];
  String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\s+/g, " ").slice(0, 40))
    .forEach((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    });
  return tags;
}

function renderPerformance() {
  if (!state.performance) return;

  els.snapshotStat.textContent = `${state.performance.snapshotCount} snapshots`;
  els.transferStat.textContent = `${state.performance.transferCount} transfers`;

  const selected = els.seriesSelect.value || "total";
  const options = [
    state.performance.total,
    state.performance.cryptoTotal,
    state.performance.manualTotal,
    ...state.performance.entities.filter((entity) => entity.id !== "master")
  ].filter(Boolean);
  els.seriesSelect.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
    .join("");
  const selectedOption = options.find((item) => item.id === selected && item.points?.length >= 2);
  els.seriesSelect.value = selectedOption ? selectedOption.id : "total";
  renderTagSeriesControls();

  const rows = [
    state.performance.total,
    state.performance.cryptoTotal,
    state.performance.manualTotal,
    ...(state.performance.tags || []),
    ...state.performance.entities
  ]
    .filter(Boolean)
    .filter((item) => item.points.length > 0)
    .slice(0, 80);

  if (!rows.length) {
    els.performanceTable.innerHTML = '<tr><td colspan="13" class="empty">等待首次采样</td></tr>';
    renderShareSeriesOptions();
    renderChart();
    return;
  }

  els.performanceTable.innerHTML = rows
    .map((item) => {
      const oneDay = periodStat(item, "oneDay");
      const sevenDay = periodStat(item, "sevenDay");
      const thirtyDay = periodStat(item, "thirtyDay");
      const allDay = periodStat(item, "allDay");
      return `
        <tr>
          <td class="accountCell">
            <div class="email">${escapeHtml(item.label)}</div>
            <div class="subtle">${escapeHtml(performanceSubline(item))}</div>
          </td>
          <td class="num">${usdFormat.format(item.latestEquityUsdt)}</td>
          <td class="num">${numberFormat(item.nav, 6)}</td>
          <td class="num">${usdFormat.format(item.minEquityUsdt || 0)}</td>
          <td class="num">${usdFormat.format(item.maxEquityUsdt || 0)}</td>
          <td class="num ${returnClass(oneDay.returnPct)}">${signedPercent(oneDay.returnPct)}</td>
          <td class="num ${returnClass(oneDay.pnlUsdt)}">${signedCurrency(oneDay.pnlUsdt)}</td>
          <td class="num ${returnClass(sevenDay.returnPct)}">${signedPercent(sevenDay.returnPct)}</td>
          <td class="num ${returnClass(sevenDay.pnlUsdt)}">${signedCurrency(sevenDay.pnlUsdt)}</td>
          <td class="num ${returnClass(thirtyDay.returnPct)}">${signedPercent(thirtyDay.returnPct)}</td>
          <td class="num ${returnClass(thirtyDay.pnlUsdt)}">${signedCurrency(thirtyDay.pnlUsdt)}</td>
          <td class="num ${returnClass(allDay.returnPct)}">${signedPercent(allDay.returnPct)}</td>
          <td class="num ${returnClass(allDay.pnlUsdt)}">${signedCurrency(allDay.pnlUsdt)}</td>
        </tr>
      `;
    })
    .join("");

  renderShareSeriesOptions();
  renderChart();
}

function openShareModal() {
  if (!state.performance) {
    els.shareStatus.textContent = "收益数据还在加载，稍后再生成。";
  }
  renderShareSeriesOptions();
  document.body.classList.add("shareModalOpen");
  els.shareModal.classList.remove("hidden");
  els.shareSeriesSelect.focus();
}

function closeShareModal() {
  els.shareModal.classList.add("hidden");
  document.body.classList.remove("shareModalOpen");
}

function renderShareSeriesOptions() {
  if (!els.shareSeriesSelect || !state.performance) return;
  const selected = els.shareSeriesSelect.value;
  const options = shareSeriesOptions();
  if (!options.length) {
    els.shareSeriesSelect.innerHTML = '<option value="">等待采样</option>';
    return;
  }
  els.shareSeriesSelect.innerHTML = options
    .map((item) => `<option value="${escapeHtml(item.shareId)}">${escapeHtml(item.shareLabel)}</option>`)
    .join("");
  els.shareSeriesSelect.value = options.some((item) => item.shareId === selected) ? selected : options[0]?.shareId || "";
}

function shareSeriesOptions() {
  if (!state.performance) return [];
  const total = state.performance.total
    ? {
        ...state.performance.total,
        shareId: "series:total",
        shareLabel: "总账户"
      }
    : null;
  const cryptoTotal = state.performance.cryptoTotal
    ? {
        ...state.performance.cryptoTotal,
        shareId: "series:cryptoTotal",
        shareLabel: "币账户合计"
      }
    : null;
  const manualTotal = state.performance.manualTotal
    ? {
        ...state.performance.manualTotal,
        shareId: "series:manualTotal",
        shareLabel: "A股手工账合计"
      }
    : null;
  const tags = (state.performance.tags || []).map((item) => ({
    ...item,
    shareId: `tag:${item.tag}`,
    shareLabel: `#${item.tag}`
  }));
  const entities = (state.performance.entities || []).map((item) => ({
    ...item,
    shareId: `account:${item.id}`,
    shareLabel: item.label
  }));
  return [total, cryptoTotal, manualTotal, ...tags, ...entities].filter((item) => item?.points?.length >= 2);
}

function selectedShareSeries() {
  const id = els.shareSeriesSelect.value;
  return shareSeriesOptions().find((item) => item.shareId === id) || shareSeriesOptions()[0] || null;
}

async function generateSharePoster() {
  const days = Math.max(1, Math.min(Number(els.shareDaysInput.value || 30), 3650));
  els.shareDaysInput.value = String(days);

  setShareDownload(null);
  els.shareGenerateButton.disabled = true;
  els.shareStatus.textContent = "正在计算指标和生成旺财文案";
  try {
    await ensurePerformanceWindow(days);
    const series = selectedShareSeries();
    if (!series || !series.points || series.points.length < 2) {
      throw new Error("这个账户还没有足够采样点。");
    }
    const sliced = sliceSeriesByDays(series.points, days);
    if (sliced.length < 2) {
      throw new Error("选定天数内采样点不足，换更长的晒单天数试试。");
    }
    const metrics = computeShareMetrics(sliced, days, series.cashFlows);
    const showName = Boolean(els.shareShowNameInput.checked);
    const showAmount = Boolean(els.shareShowAmountInput.checked);
    const displayLabel = showName ? (series.shareLabel || series.label || "账户") : shareHiddenTitle(series);
    const quip = await fetchShareQuip(series, days, metrics, displayLabel);
    await drawSharePoster({
      series,
      points: sliced,
      days,
      metrics,
      message: quip.message,
      source: quip.source,
      showName,
      showAmount
    });
    els.shareStatus.textContent = shareQuipStatusText(quip);
  } catch (error) {
    els.shareStatus.textContent = error.message || "晒单图生成失败";
  } finally {
    els.shareGenerateButton.disabled = false;
  }
}

async function ensurePerformanceWindow(days) {
  const currentDays = Number(state.performance?.pointWindowDays || 0);
  const currentMaxPoints = Number(state.performance?.pointMaxPoints || 0);
  if (state.performance && (!state.performance.pointsTruncated || (currentDays >= days && currentMaxPoints === 0))) return;
  await loadPerformance({ days, maxPoints: 0 });
}

function sliceSeriesByDays(points, days) {
  const sorted = (points || []).slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const latest = sorted.at(-1);
  if (!latest) return [];
  const cutoff = Date.parse(latest.timestamp) - days * 86400000;
  const filtered = sorted.filter((point) => Date.parse(point.timestamp) >= cutoff);
  return filtered.length >= 2 ? filtered : sorted.slice(-Math.min(sorted.length, 2));
}

function computeShareMetrics(points, days, cashFlows = []) {
  const first = points[0];
  const last = points[points.length - 1];
  const startNav = Number(first.nav || 0);
  const endNav = Number(last.nav || 0);
  const returnPct = startNav ? (endNav / startNav - 1) * 100 : 0;
  const elapsedDays = Math.max((Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 86400000, 1);
  const annualizedReturnPct = startNav > 0 ? ((endNav / startNav) ** (365 / elapsedDays) - 1) * 100 : 0;
  const dailyPoints = dailyClosePoints(points);
  const dailyReturns = [];
  for (let i = 1; i < dailyPoints.length; i += 1) {
    const previous = Number(dailyPoints[i - 1].nav || 0);
    const current = Number(dailyPoints[i].nav || 0);
    if (previous > 0 && current > 0) dailyReturns.push(current / previous - 1);
  }
  const average = mean(dailyReturns);
  const volatility = stddev(dailyReturns);
  const sharpe = volatility ? (average / volatility) * Math.sqrt(365) : 0;
  const maxDrawdownPct = maxDrawdown(points.map((point) => Number(point.nav || 0)));
  const calmar = Math.abs(maxDrawdownPct) > 0 ? annualizedReturnPct / Math.abs(maxDrawdownPct) : 0;
  const cashFlowUsdt = clientCashFlowSumForWindow(cashFlows, first.timestamp, last.timestamp);
  const pnlUsdt = Number(last.equityUsdt || 0) - Number(first.equityUsdt || 0) - cashFlowUsdt;
  return {
    returnPct: roundClient(returnPct, 4),
    annualizedReturnPct: roundClient(annualizedReturnPct, 4),
    maxDrawdownPct: roundClient(maxDrawdownPct, 4),
    sharpe: roundClient(sharpe, 4),
    calmar: roundClient(calmar, 4),
    startEquityUsdt: Number(first.equityUsdt || 0),
    endEquityUsdt: Number(last.equityUsdt || 0),
    pnlUsdt,
    cashFlowUsdt,
    sampleCount: points.length,
    dailySampleCount: dailyPoints.length,
    elapsedDays
  };
}

function clientCashFlowSumForWindow(cashFlows = [], startTimestamp, endTimestamp) {
  const start = Date.parse(startTimestamp);
  const end = Date.parse(endTimestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return cashFlows.reduce((total, flow) => {
    const appliedAt = Date.parse(flow.appliedAt || flow.timestamp);
    if (!Number.isFinite(appliedAt) || appliedAt <= start || appliedAt > end) return total;
    return total + Number(flow.signedUsdtValue || 0);
  }, 0);
}

function dailyClosePoints(points) {
  const byDate = new Map();
  for (const point of points) {
    byDate.set(String(point.timestamp || "").slice(0, 10), point);
  }
  return Array.from(byDate.values()).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function maxDrawdown(values) {
  let peak = 0;
  let maxDd = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || value <= 0) continue;
    peak = Math.max(peak || value, value);
    if (peak > 0) maxDd = Math.min(maxDd, (value / peak - 1) * 100);
  }
  return maxDd;
}

function roundClient(value, decimals = 4) {
  if (!Number.isFinite(Number(value))) return 0;
  return Number(Number(value).toFixed(decimals));
}

async function fetchShareQuip(series, days, metrics, displayLabel) {
  const fallback = localShareQuip(displayLabel, days, metrics);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 13500);
  try {
    const response = await fetch("/api/share/quip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        label: displayLabel,
        days,
        metrics
      })
    });
    const payload = await response.json();
    if (!response.ok) throw payload;
    return {
      source: payload.source || "local",
      message: payload.message || fallback,
      llm: payload.llm || null
    };
  } catch (error) {
    return {
      source: "local",
      message: fallback,
      llm: {
        enabled: true,
        ok: false,
        error: error.name === "AbortError" ? "AI_TIMEOUT" : "AI_UNAVAILABLE"
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function localShareQuip(label, days, metrics) {
  const pct = signedPercent(metrics.returnPct);
  const drawdown = Math.abs(metrics.maxDrawdownPct || 0).toFixed(2);
  const strong = [
    `主人，${label} ${days}天 ${pct}，旺财宣布这条曲线有皇宫味儿！`,
    `主人，打工十年还是工，这张图先替你把气势打满！`,
    `主人，年化 ${signedPercent(metrics.annualizedReturnPct)}，旺财已经想全款购入地球。`
  ];
  const weak = [
    `主人，${label} ${days}天 ${pct}，先别怂，下一张海报更狂。`,
    `主人，回撤 ${drawdown}% 压不住野心，纪律还在就有戏。`,
    `主人，曲线暂时低头，旺财不低头，继续守住本金。`
  ];
  const list = metrics.returnPct >= 0 ? strong : weak;
  return list[Math.floor(Math.random() * list.length)];
}

function shareQuipStatusText(quip) {
  if (quip.source === "llm") return "已生成，旺财 AI 点评已写入图片。";
  if (quip.llm?.enabled) {
    return quip.llm.error === "AI_TIMEOUT"
      ? "已生成，AI 点评超时，使用本地旺财文案。"
      : "已生成，AI 点评暂不可用，使用本地旺财文案。";
  }
  return "已生成，未配置 AI，使用本地旺财文案。";
}

async function drawSharePoster({ series, points, days, metrics, message, source, showName, showAmount }) {
  const canvas = els.shareCanvas;
  const ctx = canvas.getContext("2d");
  const scale = 2;
  const width = 1280;
  const height = 720;
  const positive = Number(metrics.returnPct || 0) >= 0;
  const accent = positive ? "#14804a" : "#c2413d";
  const accentSoft = positive ? "#e8f6ef" : "#fff0ef";
  const title = showName ? (series.shareLabel || series.label || "账户") : shareHiddenTitle(series);
  const startAt = new Date(points[0].timestamp).toLocaleDateString();
  const endAt = new Date(points.at(-1).timestamp).toLocaleDateString();

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#fffdf7");
  bg.addColorStop(0.48, "#f7fbff");
  bg.addColorStop(1, positive ? "#edf8f1" : "#fff3ef");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawPosterDecor(ctx, width, height, accent);
  roundedRect(ctx, 34, 30, width - 68, height - 60, 28, "rgba(255,255,255,0.88)", "rgba(20,32,51,0.09)");

  ctx.fillStyle = accent;
  drawMainReturn(ctx, signedPercent(metrics.returnPct), 76, 130, 300, accent);
  ctx.fillStyle = "#637083";
  ctx.font = "700 18px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText("当前收益率", 82, 160);
  ctx.fillStyle = "#0d1420";
  ctx.font = "850 22px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText(`${title} · 最近 ${days} 天`, 78, 202);
  ctx.fillStyle = "#637083";
  ctx.font = "650 15px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText(`${startAt} 至 ${endAt}`, 78, 226);

  const statCards = [
    ["年化收益率", signedPercent(metrics.annualizedReturnPct)],
    ["最大回撤", signedPercent(metrics.maxDrawdownPct)],
    ["夏普率", ratioText(metrics.sharpe)],
    ["卡玛比", ratioText(metrics.calmar)]
  ];
  drawPosterStats(ctx, statCards, 430, 70, 500, accent, accentSoft);
  drawPosterChart(ctx, points, 70, 270, 870, 365, accent, positive);
  const bubble = measureSpeechBubble(ctx, message, 282, 20, 26, 5);
  drawSpeechBubble(ctx, bubble, 958, 118, accent);
  if (showAmount) {
    drawPosterSideMetrics(ctx, metrics, 996, 318, 196, 86, accentSoft);
    await drawPosterWangcai(ctx, metrics, 1010, 430, 160, 160);
  } else {
    await drawPosterWangcai(ctx, metrics, 1000, 358, 188, 188);
  }

  const imageUrl = canvas.toDataURL("image/png");
  setShareDownload(imageUrl);
}

function shareHiddenTitle(series) {
  if (series.shareId?.startsWith("tag:")) return "策略分组";
  if (series.shareId?.startsWith("account:")) return "账户";
  return "总账户";
}

function drawPosterDecor(ctx, width, height, accent) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(width - 120, 96, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.arc(128, height - 80, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMainReturn(ctx, text, x, y, maxWidth, accent) {
  let fontSize = 78;
  do {
    ctx.font = `900 ${fontSize}px Inter, Microsoft YaHei, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || fontSize <= 58) break;
    fontSize -= 4;
  } while (fontSize > 58);
  ctx.fillStyle = accent;
  ctx.fillText(text, x, y);
}

function drawPosterStats(ctx, cards, x, y, width, accent, accentSoft) {
  const gap = 12;
  const cardWidth = (width - gap) / 2;
  const cardHeight = 82;
  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const left = x + col * (cardWidth + gap);
    const top = y + row * (cardHeight + gap);
    roundedRect(ctx, left, top, cardWidth, cardHeight, 16, index === 0 ? accentSoft : "#ffffff", "rgba(20,32,51,0.08)");
    ctx.fillStyle = "#637083";
    ctx.font = "700 14px Inter, Microsoft YaHei, sans-serif";
    ctx.fillText(card[0], left + 18, top + 28);
    ctx.fillStyle = index === 0 ? accent : "#0d1420";
    ctx.font = "900 24px Inter, Microsoft YaHei, sans-serif";
    ctx.fillText(card[1], left + 18, top + 58);
  });
}

function drawPosterSideMetrics(ctx, metrics, x, y, width, height, accentSoft) {
  roundedRect(ctx, x, y, width, height, 18, accentSoft, "rgba(20,32,51,0.08)");
  ctx.fillStyle = "#637083";
  ctx.font = "750 13px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText("区间盈亏", x + 16, y + 26);
  ctx.fillStyle = "#0d1420";
  ctx.font = "900 23px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText(signedCurrency(metrics.pnlUsdt), x + 16, y + 56);
  ctx.fillStyle = "#637083";
  ctx.font = "650 12px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText(`当前 ${compactUsdFormat.format(metrics.endEquityUsdt)}`, x + 16, y + 76);
}

function drawPosterChart(ctx, points, x, y, width, height, accent, positive) {
  roundedRect(ctx, x, y, width, height, 22, "#ffffff", "rgba(20,32,51,0.08)");
  const padding = { top: 62, right: 30, bottom: 46, left: 72 };
  const plotX = x + padding.left;
  const plotY = y + padding.top;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const baseNav = Number(points[0]?.nav || 0);
  const values = points.map((point) => sharePointReturnPct(point, baseNav));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const yMin = min - range * 0.12;
  const yMax = max + range * 0.12;

  ctx.strokeStyle = "#e6edf6";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#637083";
  ctx.font = "600 12px Inter, Microsoft YaHei, sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const gy = plotY + plotH - (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(plotX, gy);
    ctx.lineTo(plotX + plotW, gy);
    ctx.stroke();
    const value = yMin + ((yMax - yMin) * i) / 4;
    ctx.fillText(signedPercent(value), x + 16, gy + 4);
  }

  const mapped = points.map((point, index) => ({
    x: plotX + (plotW * index) / (points.length - 1),
    y: plotY + plotH - ((sharePointReturnPct(point, baseNav) - yMin) / (yMax - yMin)) * plotH
  }));
  const gradient = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  gradient.addColorStop(0, positive ? "rgba(20,128,74,0.2)" : "rgba(194,65,61,0.2)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  mapped.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(mapped.at(-1).x, plotY + plotH);
  ctx.lineTo(mapped[0].x, plotY + plotH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  mapped.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const last = mapped.at(-1);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0d1420";
  ctx.font = "900 22px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText("资金曲线", x + 22, y + 34);
  ctx.fillStyle = "#637083";
  ctx.font = "600 13px Inter, Microsoft YaHei, sans-serif";
  ctx.fillText(shortDate(points[0].timestamp), plotX, y + height - 15);
  ctx.textAlign = "right";
  ctx.fillText(shortDate(points.at(-1).timestamp), plotX + plotW, y + height - 15);
  ctx.textAlign = "left";
}

function sharePointReturnPct(point, baseNav) {
  const nav = Number(point?.nav || 0);
  return baseNav > 0 && nav > 0 ? (nav / baseNav - 1) * 100 : 0;
}

async function drawPosterWangcai(ctx, metrics, x, y, width, height) {
  const asset = metrics.returnPct >= 0
    ? "/assets/wangcai/happy.png"
    : metrics.returnPct <= -1
      ? "/assets/wangcai/sad.png"
      : "/assets/wangcai/worried.png";
  const image = await loadImage(asset);
  ctx.drawImage(image, x, y, width, height);
}

function measureSpeechBubble(ctx, text, width, fontSize, lineHeight, maxLines) {
  ctx.font = `850 ${fontSize}px Inter, Microsoft YaHei, sans-serif`;
  const maxTextWidth = width - 44;
  const lines = canvasTextLines(ctx, text, maxTextWidth, maxLines);
  return {
    text: String(text || ""),
    lines,
    width,
    height: Math.max(78, 26 + lines.length * lineHeight + 20),
    fontSize,
    lineHeight
  };
}

function drawSpeechBubble(ctx, bubble, x, y, accent) {
  const { width, height } = bubble;
  roundedRect(ctx, x, y, width, height, 18, "#fffaf0", "rgba(194,65,61,0.18)");
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x + 68, y + height);
  ctx.lineTo(x + 92, y + height + 24);
  ctx.lineTo(x + 118, y + height);
  ctx.closePath();
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.strokeStyle = "rgba(194,65,61,0.18)";
  ctx.stroke();
  ctx.fillStyle = "#0d1420";
  ctx.font = `850 ${bubble.fontSize}px Inter, Microsoft YaHei, sans-serif`;
  bubble.lines.forEach((line, index) => {
    ctx.fillText(line, x + 22, y + 34 + index * bubble.lineHeight);
  });
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  canvasTextLines(ctx, text, maxWidth, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function canvasTextLines(ctx, text, maxWidth, maxLines = 3) {
  const chars = Array.from(String(text || ""));
  let line = "";
  const lines = [];
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      if (lines.length >= maxLines) return lines;
      line = char;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : [""];
}

function ratioText(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toFixed(2);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function setShareDownload(imageUrl) {
  state.shareImageUrl = "";
  els.shareDownloadLink.classList.add("disabledLink");
  els.shareDownloadLink.setAttribute("aria-disabled", "true");
  els.shareDownloadLink.removeAttribute("href");
  if (!imageUrl) return;
  els.shareDownloadLink.href = imageUrl;
  els.shareDownloadLink.download = `wangcai-share-${new Date().toISOString().slice(0, 10)}.png`;
  els.shareDownloadLink.classList.remove("disabledLink");
  els.shareDownloadLink.setAttribute("aria-disabled", "false");
}

function renderPositions() {
  if (!state.positions) return;

  const { totals } = state.positions;
  els.positionsTotalValue.textContent = usdFormat.format(totals.totalAssetUsdt || 0);
  els.positionsUpdatedAt.textContent = `${new Date(state.positions.generatedAt).toLocaleString()}${state.positions.stale ? " · 上次完整数据" : ""}`;
  els.positionsAccountCount.textContent = String(totals.accountCount || 0);
  els.positionsAccountHealth.textContent = `${totals.okAccountCount || 0}/${totals.accountCount || 0} data complete`;
  els.positionsAssetCount.textContent = String(totals.assetRowCount || 0);
  els.positionsDustStat.textContent = `${totals.nonDustAssetRowCount || 0} rows >= $0.01`;
  els.positionsContractCount.textContent = String(totals.contractRowCount || 0);
  els.positionsOpenNotional.textContent = `${usdFormat.format(totals.openContractNotionalUsdt || 0)} notional`;
  els.positionsSourceStat.textContent = state.positions.stale
    ? `上次完整数据 · ${coverageText(state.positions.coverage)}`
    : coverageText(state.positions.coverage);

  renderPositionsAccountTable();
  renderPositionsExposureChart();
  renderPositionPnlLeaders();
  renderPositionsTable();
  renderPositionsCoverage();
  renderPositionDetail();
}

function renderPositionsExposureChart() {
  const chart = els.positionsExposureChart;
  if (!chart) return;
  chart.innerHTML = "";
  const rows = topExposureRows();
  if (els.positionsExposureStat) {
    els.positionsExposureStat.textContent = rows.length
      ? `Top ${rows.length} 净敞口`
      : "无可展示仓位";
  }
  if (!rows.length) {
    chart.innerHTML = '<div class="chartEmpty">没有符合过滤条件的持仓</div>';
    return;
  }

  const rect = chart.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 640);
  const height = Math.max(320, 92 + rows.length * 24);
  const padding = { top: 58, right: 128, bottom: 34, left: 188 };
  const x0 = padding.left;
  const y0 = height - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.notionalUsdt || 0)), 1);
  const barHeight = Math.max(10, Math.min(18, plotHeight / rows.length * 0.68));
  const rowStep = plotHeight / rows.length;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none",
    class: "chartSvg exposureSvg"
  });

  for (let i = 0; i <= 4; i += 1) {
    const x = x0 + (plotWidth * i) / 4;
    const value = (maxAbs * i) / 4;
    svg.append(
      svgEl("line", { class: "chartGrid", x1: x, y1: padding.top, x2: x, y2: y0 }),
      svgText(x, height - 12, compactUsdFormat.format(value), `chartAxis xAxis ${i === 0 ? "start" : i === 4 ? "end" : ""}`)
    );
  }

  rows.forEach((row, index) => {
    const y = padding.top + index * rowStep + (rowStep - barHeight) / 2;
    const barWidth = Math.max(2, (Math.abs(row.notionalUsdt || 0) / maxAbs) * plotWidth);
    const cls = row.side === "short" ? "exposureBar short" : "exposureBar long";
    svg.append(svgText(x0 - 12, y + barHeight * 0.72, row.asset, "chartAxis yAxis exposureLabel"));
    const bar = svgEl("rect", {
      class: cls,
      x: x0,
      y,
      width: barWidth,
      height: barHeight,
      rx: 5,
      role: "button",
      tabindex: 0,
      "aria-label": `${row.asset} 持仓详情`
    });
    bar.addEventListener("mouseenter", (event) => showExposureTooltip(event, row));
    bar.addEventListener("mousemove", (event) => showExposureTooltip(event, row));
    bar.addEventListener("mouseleave", hideExposureTooltip);
    bar.addEventListener("click", () => selectPositionAsset(row.asset));
    bar.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPositionAsset(row.asset);
      }
    });
    svg.append(bar);
    const valueInside = barWidth > plotWidth - 112;
    const valueX = valueInside ? x0 + barWidth - 8 : x0 + barWidth + 8;
    svg.append(svgText(
      valueX,
      y + barHeight * 0.72,
      signedCompactUsd(row.signedNotionalUsdt || 0),
      `chartAxis exposureValue ${valueInside ? "inside" : ""}`
    ));
  });

  chart.append(buildExposureChartHeader(rows), svg);
}

function topExposureRows() {
  const groups = new Map();
  for (const row of state.positions?.rows || []) {
    if (row.kind !== "asset" && row.kind !== "contract") continue;
    const asset = row.kind === "contract"
      ? contractBaseAsset(row.symbol || row.asset)
      : normalizeExposureAsset(row.asset || row.symbol);
    if (!asset) continue;

    const existing = groups.get(asset) || {
      asset,
      symbols: new Set(),
      venues: new Set(),
      accountEmails: new Set(),
      quantity: 0,
      signedNotionalUsdt: 0,
      assetExposureUsdt: 0,
      contractLongUsdt: 0,
      contractShortUsdt: 0,
      longNotionalUsdt: 0,
      shortNotionalUsdt: 0,
      grossNotionalUsdt: 0,
      unrealizedPnlUsdt: 0
    };

    const quantity = Number(row.quantity || 0);
    const exposure = row.kind === "contract"
      ? contractExposureValue(row)
      : Number(row.usdtValue || 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(exposure) || !quantity || Math.abs(exposure) < 1) {
      continue;
    }
    const signedExposure = row.kind === "contract"
      ? quantity < 0 ? -Math.abs(exposure) : Math.abs(exposure)
      : exposure;

    existing.symbols.add(row.symbol || row.asset);
    existing.venues.add(row.venue || row.kind);
    existing.accountEmails.add(row.accountEmail);
    existing.quantity += quantity;
    existing.signedNotionalUsdt += signedExposure;
    existing.grossNotionalUsdt += Math.abs(exposure);

    if (row.kind === "contract") {
      if (signedExposure >= 0) existing.contractLongUsdt += Math.abs(exposure);
      else existing.contractShortUsdt += Math.abs(exposure);
    } else {
      existing.assetExposureUsdt += exposure;
    }

    if (signedExposure >= 0) existing.longNotionalUsdt += Math.abs(exposure);
    else existing.shortNotionalUsdt += Math.abs(exposure);
    existing.unrealizedPnlUsdt += Number(row.unrealizedPnlUsdt || 0);
    groups.set(asset, existing);
  }

  return Array.from(groups.values())
    .map((row) => {
      const netAbs = Math.abs(row.signedNotionalUsdt);
      return {
        ...row,
        side: row.signedNotionalUsdt < 0 ? "short" : "long",
        notionalUsdt: netAbs,
        symbols: Array.from(row.symbols).sort(),
        venues: Array.from(row.venues).sort(),
        accountEmails: Array.from(row.accountEmails).filter(Boolean).sort(),
        accountCount: row.accountEmails.size,
        pnlPct: row.grossNotionalUsdt ? (row.unrealizedPnlUsdt / row.grossNotionalUsdt) * 100 : 0
      };
    })
    .filter((row) => row.notionalUsdt >= 1)
    .sort((a, b) => Math.abs(b.notionalUsdt) - Math.abs(a.notionalUsdt))
    .slice(0, 20);
}

function renderPositionPnlLeaders() {
  if (!els.positionPnlPanel) return;
  const payload = state.positionPnlLeaders;
  const winners = payload?.winners || [];
  const losers = payload?.losers || [];
  const allRows = [...winners, ...losers];
  const maxAbs = Math.max(...allRows.map((row) => Math.abs(Number(row.pnlUsdt || 0))), 1);

  if (state.positionPnlLoading && !payload) {
    els.positionPnlStatus.textContent = "归因加载中";
    els.positionPnlWinnersStat.textContent = "--";
    els.positionPnlLosersStat.textContent = "--";
    els.positionPnlWinners.innerHTML = '<div class="chartEmpty">正在拉取 1h K 线</div>';
    els.positionPnlLosers.innerHTML = '<div class="chartEmpty">正在计算窗口收益</div>';
    return;
  }

  if (state.positionPnlError && !payload) {
    els.positionPnlStatus.textContent = "加载失败";
    els.positionPnlWinnersStat.textContent = "--";
    els.positionPnlLosersStat.textContent = "--";
    const message = `<div class="chartEmpty">${escapeHtml(state.positionPnlError)}</div>`;
    els.positionPnlWinners.innerHTML = message;
    els.positionPnlLosers.innerHTML = message;
    return;
  }

  if (!payload) {
    els.positionPnlStatus.textContent = "等待加载";
    els.positionPnlWinnersStat.textContent = "--";
    els.positionPnlLosersStat.textContent = "--";
    els.positionPnlWinners.innerHTML = '<div class="chartEmpty">切到持仓页后加载</div>';
    els.positionPnlLosers.innerHTML = '<div class="chartEmpty">切到持仓页后加载</div>';
    return;
  }

  const totalPnl = Number(payload.totalEstimatedPnlUsdt || 0);
  els.positionPnlStatus.textContent = state.positionPnlLoading
    ? `最近 ${payload.hours || state.positionPnlHours}h · 更新中`
    : `最近 ${payload.hours || state.positionPnlHours}h · ${payload.rowCount || 0} 币种 · ${signedCompactUsd(totalPnl)}`;
  els.positionPnlWinnersStat.textContent = winners.length ? `${winners.length} 个币` : "无盈利";
  els.positionPnlLosersStat.textContent = losers.length ? `${losers.length} 个币` : "无亏损";
  renderPositionPnlList(els.positionPnlWinners, winners, maxAbs, "winner");
  renderPositionPnlList(els.positionPnlLosers, losers, maxAbs, "loser");
}

function renderPositionPnlList(container, rows, maxAbs, tone) {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="chartEmpty">当前窗口没有可展示数据</div>';
    return;
  }
  container.innerHTML = rows
    .map((row, index) => {
      const width = Math.max(3, Math.min(100, (Math.abs(Number(row.pnlUsdt || 0)) / maxAbs) * 100));
      const pnlClass = returnClass(row.pnlUsdt);
      const subline = [
        `${signedPercent(row.priceChangePct || 0)} 价格`,
        compactUsdFormat.format(row.grossExposureUsdt || 0),
        (row.venues || []).join("/")
      ].filter(Boolean).join(" · ");
      return `
        <div class="positionPnlRow ${tone}">
          <div class="positionPnlRank">${index + 1}</div>
          <div class="positionPnlMain">
            <div class="positionPnlTopline">
              <button class="assetDrillButton" type="button" data-position-asset="${escapeHtml(row.asset)}">${escapeHtml(row.asset)}</button>
              <strong class="${pnlClass}">${escapeHtml(signedCompactUsd(row.pnlUsdt || 0))}</strong>
            </div>
            <div class="positionPnlBarTrack">
              <i style="width:${width.toFixed(2)}%"></i>
            </div>
            <div class="positionPnlMeta">
              <span>${escapeHtml(subline)}</span>
              <span>${escapeHtml(formatPositionPrice(row.startPrice))} -> ${escapeHtml(formatPositionPrice(row.endPrice))}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function contractExposureValue(row) {
  return Math.abs(Number(row.notionalUsdt || row.usdtValue || 0));
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
  return value;
}

function renderPositionsAccountTable() {
  const rows = state.positions.accounts || [];
  if (!rows.length) {
    els.positionsAccountTable.innerHTML = '<tr><td colspan="12" class="empty">没有子账户</td></tr>';
    return;
  }

  els.positionsAccountTable.innerHTML = sortPositionAccounts(rows)
    .map((account) => {
      const failed = account.coverage.filter((item) => !item.ok);
      const empty = account.coverage.filter((item) => item.empty).length;
      const status = failed.length
        ? `<span class="badge danger">${failed.length} failed</span>`
        : `<span class="badge">OK</span>${empty ? ` <span class="badge muted">${empty} 未开通</span>` : ""}`;
      return `
        <tr>
          <td class="accountCell">
            <div class="email">${escapeHtml(account.email)}</div>
            <div class="subtle">${escapeHtml(account.remark || "-")}</div>
            ${tagBadges(account.tags)}
          </td>
          <td>${accountModeBadge(account)}</td>
          <td>${status}</td>
          <td>${formatLastTrade(account.lastTradeAt)}</td>
          <td class="num">${usdFormat.format(account.spotUsdt || 0)}</td>
          <td class="num">${usdFormat.format(account.marginUsdt || 0)}</td>
          <td class="num">${usdFormat.format(account.futuresUsdt || 0)}</td>
          <td class="num">${usdFormat.format(account.totalAssetUsdt || 0)}</td>
          <td class="num">${account.contractCount || 0}</td>
          <td class="num">${usdFormat.format(account.contractNotionalUsdt || 0)}</td>
          <td class="num ${returnClass(account.unrealizedPnlUsdt)}">${signedCurrency(account.unrealizedPnlUsdt || 0)}</td>
          <td class="num ${returnClass(account.pnlPct)}">${signedPercent(account.pnlPct || 0)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPositionsTable() {
  const filtered = filteredPositionRows();
  els.positionsRowStat.textContent = `${filtered.length}/${state.positions.rows.length} rows`;

  if (!filtered.length) {
    els.positionsTable.innerHTML = '<tr><td colspan="11" class="empty">没有匹配的持仓</td></tr>';
    return;
  }

  els.positionsTable.innerHTML = sortPositionRows(filtered)
    .slice(0, 500)
    .map((row) => {
      const isContract = row.kind === "contract";
      const detailAsset = isContract
        ? contractBaseAsset(row.symbol || row.asset)
        : normalizeExposureAsset(row.asset || row.symbol);
      const label = isContract
        ? `${row.symbol} ${row.positionSide || ""}`.trim()
        : row.asset;
      const subline = isContract
        ? `${row.leverage ? `${escapeHtml(row.leverage)}x · ` : ""}${escapeHtml(row.positionSide || "BOTH")}`
        : row.borrowed
          ? `borrowed ${numberFormat(row.borrowed, 8)}`
          : row.kind;
      return `
        <tr>
          <td class="accountCell">
            <div class="email">${escapeHtml(row.accountEmail)}</div>
            <div class="subtle">${escapeHtml(row.remark || "-")}</div>
            ${tagBadges(row.tags)}
          </td>
          <td>${accountModeBadge(row)}</td>
          <td><span class="badge ${venueBadgeClass(row.venue)}">${escapeHtml(row.venue)}</span></td>
          <td class="accountCell">
            <button class="assetDrillButton" type="button" data-position-asset="${escapeHtml(detailAsset)}">${escapeHtml(label)}</button>
            <div class="subtle">${escapeHtml(subline)}</div>
          </td>
          <td class="num ${Number(row.quantity) < 0 ? "negative" : ""}">${numberFormat(row.quantity, isContract ? 4 : 8)}</td>
          <td class="num">${isContract ? "-" : `${numberFormat(row.available, 8)} / ${numberFormat(row.locked, 8)}`}</td>
          <td class="num">${isContract ? usdFormat.format(row.entryPrice || 0) : "-"}</td>
          <td class="num">${usdFormat.format(row.priceUsdt || 0)}</td>
          <td class="num ${returnClass(row.unrealizedPnlUsdt)}">${isContract ? signedCurrency(row.unrealizedPnlUsdt || 0) : "-"}</td>
          <td class="num ${returnClass(row.pnlPct)}">${isContract ? signedPercent(row.pnlPct || 0) : "-"}</td>
          <td class="num">${usdFormat.format(row.usdtValue || 0)}</td>
        </tr>
      `;
    })
    .join("");
}

function filteredPositionRows() {
  return (state.positions.rows || []).filter((row) => {
    if (state.positionVenue !== "all" && row.venue !== state.positionVenue) return false;
    if (state.positionKind !== "all" && row.kind !== state.positionKind) return false;
    if (Math.abs(Number(row.usdtValue || 0)) < state.positionMinValue) return false;
    if (!state.positionFilter) return true;
    return `${row.accountEmail} ${row.remark || ""} ${(row.tags || []).join(" ")} ${row.asset || ""} ${row.symbol || ""} ${row.venue || ""}`
      .toLowerCase()
      .includes(state.positionFilter);
  });
}

function sortPositionRows(rows) {
  const sorters = {
    valueDesc: (a, b) => Number(b.usdtValue || 0) - Number(a.usdtValue || 0),
    valueAsc: (a, b) => Number(a.usdtValue || 0) - Number(b.usdtValue || 0),
    pnlDesc: (a, b) => Number(b.unrealizedPnlUsdt || 0) - Number(a.unrealizedPnlUsdt || 0),
    pnlAsc: (a, b) => Number(a.unrealizedPnlUsdt || 0) - Number(b.unrealizedPnlUsdt || 0),
    absPnlDesc: (a, b) => Math.abs(Number(b.unrealizedPnlUsdt || 0)) - Math.abs(Number(a.unrealizedPnlUsdt || 0)),
    pnlPctDesc: (a, b) => Number(b.pnlPct || 0) - Number(a.pnlPct || 0),
    pnlPctAsc: (a, b) => Number(a.pnlPct || 0) - Number(b.pnlPct || 0)
  };
  const sorter = sorters[state.positionSort] || sorters.valueDesc;
  return rows.slice().sort((a, b) => {
    const result = sorter(a, b);
    if (result !== 0) return result;
    return Math.abs(Number(b.usdtValue || 0)) - Math.abs(Number(a.usdtValue || 0));
  });
}

function sortPositionAccounts(rows) {
  const adapters = {
    valueDesc: (row) => row.totalAssetUsdt,
    valueAsc: (row) => -row.totalAssetUsdt,
    pnlDesc: (row) => row.unrealizedPnlUsdt,
    pnlAsc: (row) => -row.unrealizedPnlUsdt,
    absPnlDesc: (row) => Math.abs(Number(row.unrealizedPnlUsdt || 0)),
    pnlPctDesc: (row) => row.pnlPct,
    pnlPctAsc: (row) => -row.pnlPct
  };
  const adapter = adapters[state.positionSort] || adapters.valueDesc;
  return rows.slice().sort((a, b) => {
    const result = Number(adapter(b) || 0) - Number(adapter(a) || 0);
    if (result !== 0) return result;
    return Number(b.totalAssetUsdt || 0) - Number(a.totalAssetUsdt || 0);
  });
}

function renderPositionsCoverage() {
  els.positionsCoverageList.innerHTML = (state.positions.coverage || [])
    .map((item) => {
      const status = item.ok ? "OK" : "Failed";
      const detail = `${item.successCount} 正常 · ${item.emptyCount} 未开通 · ${item.failureCount} 失败`;
      const errorText = item.errors?.length ? ` · ${item.errors[0].code}: ${item.errors[0].message}` : "";
      return `
        <div class="coverageItem ${item.ok ? "" : "failed"}">
          <span class="badge ${item.ok ? "" : "danger"}">${status}</span>
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(detail)}${escapeHtml(errorText)}</small>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPositionDetail() {
  if (!els.positionDetailPanel) return;
  const hasSelection = Boolean(state.selectedPositionAsset || state.positionDetail || state.positionDetailLoading || state.positionDetailError);
  els.positionDetailPanel.classList.toggle("hidden", !hasSelection);
  if (!hasSelection) return;

  const asset = state.selectedPositionAsset || state.positionDetail?.asset || "资产";
  els.positionDetailTitle.textContent = `${asset} 持仓详情`;

  if (state.positionDetailLoading) {
    els.positionDetailSubtitle.textContent = "正在加载 1h K 线和账户持仓拆分";
    els.positionDetailCoverage.textContent = "loading";
    els.positionDetailMetrics.innerHTML = positionDetailMetricSkeleton();
    els.positionKlineChart.innerHTML = '<div class="chartEmpty">正在加载 K 线</div>';
    els.positionTradeLegend.innerHTML = "";
    els.positionDetailAccountStat.textContent = "--";
    els.positionDetailAccounts.innerHTML = '<div class="empty">正在加载账户拆分</div>';
    els.positionDetailRows.innerHTML = '<tr><td colspan="8" class="empty">正在加载持仓明细</td></tr>';
    return;
  }

  if (state.positionDetailError) {
    els.positionDetailSubtitle.textContent = "加载失败";
    els.positionDetailCoverage.textContent = "error";
    els.positionDetailMetrics.innerHTML = "";
    els.positionKlineChart.innerHTML = `<div class="chartEmpty">${escapeHtml(state.positionDetailError)}</div>`;
    els.positionTradeLegend.innerHTML = "";
    els.positionDetailAccountStat.textContent = "--";
    els.positionDetailAccounts.innerHTML = `<div class="empty">${escapeHtml(state.positionDetailError)}</div>`;
    els.positionDetailRows.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(state.positionDetailError)}</td></tr>`;
    return;
  }

  const detail = state.positionDetail;
  if (!detail) return;
  const coverageOk = (detail.coverage || []).filter((item) => item.ok).length;
  const klineScope = [detail.klineVenue, detail.klineSymbol || detail.asset].filter(Boolean).join(" ");
  const visibleRangeText = state.positionKlineRange ? " · 已框选缩放" : "";
  els.positionDetailSubtitle.textContent = `${klineScope || detail.asset} · 最近 ${detail.windowDays || 7} 天 · ${detail.interval || "1h"}${visibleRangeText} · ${new Date(detail.generatedAt).toLocaleString()}`;
  els.positionDetailCoverage.textContent = `${coverageOk}/${(detail.coverage || []).length} sources · ${detail.rows?.length || 0} 行`;
  if (els.positionKlineDaysInput) els.positionKlineDaysInput.value = String(detail.windowDays || state.positionKlineDays || 7);
  renderPositionDetailMetrics(detail);
  renderPositionKlineChart(detail);
  renderPositionDetailAccounts(detail);
  renderPositionDetailRows(detail);
}

function positionDetailMetricSkeleton() {
  return Array.from({ length: 5 })
    .map(() => `
      <div class="positionDetailMetric">
        <span>--</span>
        <strong>--</strong>
        <small>--</small>
      </div>
    `)
    .join("");
}

function renderPositionDetailMetrics(detail) {
  const totals = detail.totals || {};
  const realizedText = totals.realizedPnlUsdt === null || totals.realizedPnlUsdt === undefined
    ? "暂无权限"
    : signedCurrency(totals.realizedPnlUsdt);
  const realizedClass = totals.realizedPnlUsdt === null || totals.realizedPnlUsdt === undefined
    ? ""
    : returnClass(totals.realizedPnlUsdt);
  const costText = totals.weightedCostUsdt
    ? formatPositionPrice(totals.weightedCostUsdt)
    : "暂无成本";
  const costSubline = totals.costBasisAvailable
    ? `合约加权成本${totals.breakEvenPriceUsdt ? ` · BE ${formatPositionPrice(totals.breakEvenPriceUsdt)}` : ""}`
    : "Spot/Margin 成本需成交历史";
  const rows = [
    {
      label: "当前净敞口",
      value: signedCurrency(totals.currentPositionUsdt || 0),
      subline: `${usdFormat.format(totals.spotValueUsdt || 0)} 现货 · ${usdFormat.format(totals.grossNotionalUsdt || 0)} 毛仓位`,
      cls: returnClass(totals.currentPositionUsdt)
    },
    {
      label: "综合持仓",
      value: `${numberFormat(totals.netQuantity || 0, Math.abs(totals.netQuantity || 0) >= 1 ? 4 : 8)} ${detail.asset}`,
      subline: `${totals.accountCount || 0} 个账户 · ${totals.rowCount || 0} 行`,
      cls: returnClass(totals.netQuantity)
    },
    {
      label: "综合成本",
      value: costText,
      subline: costSubline,
      cls: totals.costBasisAvailable ? "" : "mutedMetric"
    },
    {
      label: "已实现 PnL",
      value: realizedText,
      subline: "需逐笔成交或 Income 历史",
      cls: realizedClass
    },
    {
      label: "未实现 PnL",
      value: signedCurrency(totals.unrealizedPnlUsdt || 0),
      subline: totals.unrealizedPnlPct === null || totals.unrealizedPnlPct === undefined
        ? "无合约未实现收益率"
        : signedPercent(totals.unrealizedPnlPct),
      cls: returnClass(totals.unrealizedPnlUsdt)
    }
  ];
  els.positionDetailMetrics.innerHTML = rows
    .map((item) => `
      <div class="positionDetailMetric ${item.cls || ""}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <small>${escapeHtml(item.subline)}</small>
      </div>
    `)
    .join("");
}

function renderPositionKlineChart(detail) {
  const chart = els.positionKlineChart;
  if (!chart) return;
  chart.innerHTML = "";
  const sourceKlines = detail.klines || [];
  if (!sourceKlines.length) {
    chart.innerHTML = `<div class="chartEmpty">${escapeHtml(detail.klineSymbol ? "K 线加载失败或交易对无数据" : "该资产暂无 USDT K 线交易对")}</div>`;
    renderPositionTradeLegend(detail);
    return;
  }
  let klines = positionVisibleKlines(sourceKlines);
  if (klines.length < 2) {
    state.positionKlineRange = null;
    klines = sourceKlines;
  }

  const rect = chart.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 760);
  const height = Math.max(430, Math.round(width * 0.48));
  const padding = { top: 24, right: 72, bottom: 34, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const volumeHeight = 76;
  const volumeGap = 18;
  const plotHeight = height - padding.top - padding.bottom - volumeHeight - volumeGap;
  const volumeTop = padding.top + plotHeight + volumeGap;
  const volumeBottom = height - padding.bottom;
  const highs = klines.map((row) => Number(row.high || 0)).filter((value) => value > 0);
  const lows = klines.map((row) => Number(row.low || 0)).filter((value) => value > 0);
  const volumes = klines.map((row) => Number(row.quoteVolume || row.volume || 0)).filter((value) => value > 0);
  const cost = Number(detail.totals?.weightedCostUsdt || 0);
  if (cost > 0) {
    highs.push(cost);
    lows.push(cost);
  }
  let minPrice = Math.min(...lows);
  let maxPrice = Math.max(...highs);
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice <= 0 || maxPrice <= 0) {
    chart.innerHTML = '<div class="chartEmpty">K 线价格无效</div>';
    renderPositionTradeLegend(detail);
    return;
  }
  if (minPrice === maxPrice) {
    minPrice *= 0.99;
    maxPrice *= 1.01;
  }
  const pad = (maxPrice - minPrice) * 0.08;
  minPrice = Math.max(0, minPrice - pad);
  maxPrice += pad;
  const yFor = (price) => padding.top + ((maxPrice - Number(price || 0)) / (maxPrice - minPrice)) * plotHeight;
  const maxVolume = Math.max(...volumes, 1);
  const volumeYFor = (value) => volumeBottom - (Number(value || 0) / maxVolume) * volumeHeight;
  const xForIndex = (index) => padding.left + (index / Math.max(klines.length - 1, 1)) * plotWidth;
  const candleStep = plotWidth / Math.max(klines.length, 1);
  const candleWidth = Math.max(1.5, Math.min(7, candleStep * 0.58));

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none",
    class: "chartSvg positionKlineSvg"
  });

  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const y = padding.top + plotHeight * ratio;
    const price = maxPrice - (maxPrice - minPrice) * ratio;
    svg.append(
      svgEl("line", { class: "chartGrid", x1: padding.left, y1: y, x2: width - padding.right, y2: y }),
      svgText(width - padding.right + 8, y + 4, formatPositionPrice(price), "chartAxis klinePriceAxis")
    );
  }
  svg.append(
    svgEl("line", { class: "chartGrid positionVolumeDivider", x1: padding.left, y1: volumeTop, x2: width - padding.right, y2: volumeTop }),
    svgText(width - padding.right + 8, volumeTop + 4, "成交额", "chartAxis klinePriceAxis"),
    svgText(width - padding.right + 8, volumeTop + 18, compactUsdFormat.format(maxVolume), "chartAxis klinePriceAxis")
  );

  const labelIndexes = uniqueIndexes([0, Math.floor(klines.length * 0.25), Math.floor(klines.length * 0.5), Math.floor(klines.length * 0.75), klines.length - 1], klines.length);
  labelIndexes.forEach((index) => {
    const x = xForIndex(index);
    svg.append(svgText(x, height - 10, klineAxisLabel(klines[index]?.timestamp), "chartAxis xAxis klineTimeAxis"));
  });

  if (cost > 0 && cost >= minPrice && cost <= maxPrice) {
    const y = yFor(cost);
    svg.append(
      svgEl("line", { class: "positionCostLine", x1: padding.left, y1: y, x2: width - padding.right, y2: y }),
      svgText(width - padding.right - 4, y - 6, `成本 ${formatPositionPrice(cost)}`, "positionCostLabel")
    );
  }

  const candleGroup = svgEl("g", { class: "positionCandles" });
  const volumeGroup = svgEl("g", { class: "positionVolumes" });
  klines.forEach((row, index) => {
    const x = xForIndex(index);
    const open = Number(row.open || 0);
    const close = Number(row.close || 0);
    const high = Number(row.high || 0);
    const low = Number(row.low || 0);
    const volume = Number(row.quoteVolume || row.volume || 0);
    const up = close >= open;
    const bodyTop = yFor(Math.max(open, close));
    const bodyBottom = yFor(Math.min(open, close));
    const volumeTopY = volumeYFor(volume);
    volumeGroup.append(svgEl("rect", {
      class: `positionVolumeBar ${up ? "up" : "down"}`,
      x: x - candleWidth / 2,
      y: volumeTopY,
      width: candleWidth,
      height: Math.max(1, volumeBottom - volumeTopY),
      rx: Math.min(2, candleWidth / 3)
    }));
    candleGroup.append(
      svgEl("line", {
        class: `positionCandleWick ${up ? "up" : "down"}`,
        x1: x,
        y1: yFor(high),
        x2: x,
        y2: yFor(low)
      }),
      svgEl("rect", {
        class: `positionCandleBody ${up ? "up" : "down"}`,
        x: x - candleWidth / 2,
        y: bodyTop,
        width: candleWidth,
        height: Math.max(1, bodyBottom - bodyTop),
        rx: Math.min(2, candleWidth / 3)
      })
    );
  });
  svg.append(volumeGroup);
  svg.append(candleGroup);

  const markerGroup = buildPositionTradeMarkerGroup(detail, klines, xForIndex, yFor);
  if (markerGroup) svg.append(markerGroup);

  const selection = svgEl("rect", {
    class: "positionRangeSelection hidden",
    x: padding.left,
    y: padding.top,
    width: 0,
    height: volumeBottom - padding.top
  });
  const overlay = svgEl("rect", {
    class: "positionRangeHit",
    x: padding.left,
    y: padding.top,
    width: plotWidth,
    height: volumeBottom - padding.top
  });
  attachPositionKlineInteractions(overlay, selection, {
    detail,
    klines,
    width,
    padding,
    plotWidth
  });
  svg.append(selection, overlay);

  chart.append(svg);
  renderPositionTradeLegend(detail);
}

function positionVisibleKlines(klines) {
  const range = state.positionKlineRange;
  if (!range) return klines;
  const start = Number(range.startTime || 0);
  const end = Number(range.endTime || 0);
  if (!start || !end || end <= start) return klines;
  return klines.filter((row) => {
    const time = Date.parse(row.timestamp);
    return Number.isFinite(time) && time >= start && time <= end;
  });
}

function attachPositionKlineInteractions(overlay, selection, context) {
  let dragStartX = 0;
  let dragging = false;
  const { detail, klines, width, padding, plotWidth } = context;
  const clampX = (x) => Math.max(padding.left, Math.min(padding.left + plotWidth, x));
  const localX = (event) => {
    const rect = overlay.ownerSVGElement.getBoundingClientRect();
    return clampX(((event.clientX - rect.left) * width) / Math.max(rect.width, 1));
  };
  const indexForX = (x) => {
    const ratio = (clampX(x) - padding.left) / Math.max(plotWidth, 1);
    return Math.max(0, Math.min(klines.length - 1, Math.round(ratio * (klines.length - 1))));
  };
  const showAt = (event) => {
    const row = klines[indexForX(localX(event))];
    if (row) showPositionKlineTooltip(event, candleTooltipHtml(detail, row));
  };
  overlay.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    dragStartX = localX(event);
    selection.classList.remove("hidden");
    selection.setAttribute("x", dragStartX);
    selection.setAttribute("width", 0);
    overlay.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  overlay.addEventListener("pointermove", (event) => {
    const x = localX(event);
    if (dragging) {
      selection.setAttribute("x", Math.min(dragStartX, x));
      selection.setAttribute("width", Math.abs(x - dragStartX));
    } else {
      showAt(event);
    }
  });
  overlay.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    const endX = localX(event);
    dragging = false;
    overlay.releasePointerCapture?.(event.pointerId);
    selection.classList.add("hidden");
    if (Math.abs(endX - dragStartX) < 12) {
      showAt(event);
      return;
    }
    const startIndex = indexForX(Math.min(dragStartX, endX));
    const endIndex = indexForX(Math.max(dragStartX, endX));
    if (endIndex - startIndex < 1) return;
    state.positionKlineRange = {
      startTime: Date.parse(klines[startIndex].timestamp),
      endTime: Date.parse(klines[endIndex].timestamp)
    };
    renderPositionDetail();
  });
  overlay.addEventListener("pointerleave", (event) => {
    if (dragging) return;
    hidePositionKlineTooltip(event);
  });
}

function buildPositionTradeMarkerGroup(detail, klines, xForIndex, yFor) {
  const markers = detail.tradeMarkers || [];
  if (!markers.length) return null;
  const start = Date.parse(klines[0]?.timestamp);
  const end = Date.parse(klines.at(-1)?.timestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const accounts = Array.from(new Set(markers.map((marker) => marker.accountEmail || marker.account || "unknown")));
  const group = svgEl("g", { class: "positionTradeMarkers" });
  markers.forEach((marker) => {
    const time = Date.parse(marker.timestamp);
    const price = Number(marker.price || marker.priceUsdt || 0);
    if (!Number.isFinite(time) || time < start || time > end || !price) return;
    const indexFloat = ((time - start) / (end - start)) * Math.max(klines.length - 1, 1);
    const x = xForIndex(indexFloat);
    const y = yFor(price);
    const side = String(marker.side || "").toUpperCase().startsWith("S") ? "sell" : "buy";
    const accountIndex = Math.max(accounts.indexOf(marker.accountEmail || marker.account || "unknown"), 0);
    const color = chartPalette[accountIndex % chartPalette.length];
    const label = side === "sell" ? "S" : "B";
    const node = svgEl("g", { class: `positionTradeMarker ${side}`, transform: `translate(${x} ${y})` });
    node.style.setProperty("--account-color", color);
    const path = side === "sell"
      ? "M0 8 L-7 -5 L7 -5 Z"
      : "M0 -8 L-7 5 L7 5 Z";
    node.append(
      svgEl("path", { d: path, class: "positionTradeMarkerShape" }),
      svgText(0, side === "sell" ? 2 : 4, label, "positionTradeMarkerText")
    );
    node.addEventListener("mouseenter", (event) => showPositionKlineTooltip(event, markerTooltipHtml(marker)));
    node.addEventListener("mousemove", (event) => showPositionKlineTooltip(event, markerTooltipHtml(marker)));
    node.addEventListener("mouseleave", hidePositionKlineTooltip);
    group.append(node);
  });
  return group.childNodes.length ? group : null;
}

function renderPositionTradeLegend(detail) {
  if (!els.positionTradeLegend) return;
  const markers = detail.tradeMarkers || [];
  const tradeCoverage = (detail.coverage || []).find((item) => item.key === "tradeHistory");
  if (!markers.length) {
    els.positionTradeLegend.innerHTML = `
      <span class="badge muted">成交点暂无</span>
      <span>${escapeHtml(tradeCoverage?.note || "暂无 B/S 成交点数据")}</span>
    `;
    return;
  }
  const accounts = Array.from(new Set(markers.map((marker) => marker.accountEmail || marker.account || "unknown")));
  els.positionTradeLegend.innerHTML = accounts
    .map((account, index) => `
      <span class="positionLegendItem">
        <i style="background:${escapeHtml(chartPalette[index % chartPalette.length])}"></i>
        ${escapeHtml(shortAccountLabel(account))}
      </span>
    `)
    .join("");
}

function renderPositionDetailAccounts(detail) {
  const rows = detail.accounts || [];
  els.positionDetailAccountStat.textContent = rows.length
    ? `${rows.length} 个账户`
    : "无持仓账户";
  if (!rows.length) {
    els.positionDetailAccounts.innerHTML = '<div class="empty">没有当前持仓</div>';
    return;
  }
  const max = Math.max(...rows.map((row) => Math.abs(Number(row.signedNotionalUsdt || 0))), 1);
  els.positionDetailAccounts.innerHTML = rows
    .map((row) => {
      const width = Math.max(3, (Math.abs(Number(row.signedNotionalUsdt || 0)) / max) * 100);
      const side = Number(row.signedNotionalUsdt || 0) < 0 ? "short" : "long";
      return `
        <div class="positionAccountRow">
          <div class="positionAccountHead">
            <strong>${escapeHtml(shortAccountLabel(row.accountEmail))}</strong>
            <span class="${returnClass(row.unrealizedPnlUsdt)}">${escapeHtml(signedCurrency(row.unrealizedPnlUsdt || 0))}</span>
          </div>
          <div class="positionAccountSub">${escapeHtml((row.venues || []).join(", ") || "-")} · ${escapeHtml(numberFormat(row.quantity || 0, 6))}</div>
          <div class="positionAccountBar">
            <i class="${side}" style="width:${width}%"></i>
          </div>
          <div class="positionAccountFoot">
            <span>${escapeHtml(signedCurrency(row.signedNotionalUsdt || 0))}</span>
            <span>${row.pnlPct === null || row.pnlPct === undefined ? "--" : escapeHtml(signedPercent(row.pnlPct || 0))}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPositionDetailRows(detail) {
  const rows = detail.rows || [];
  if (!rows.length) {
    els.positionDetailRows.innerHTML = '<tr><td colspan="8" class="empty">没有当前持仓</td></tr>';
    return;
  }
  els.positionDetailRows.innerHTML = rows
    .map((row) => {
      const isContract = row.kind === "contract";
      const label = isContract
        ? `${row.symbol} ${row.positionSide || ""}`.trim()
        : row.asset;
      const value = isContract ? row.notionalUsdt : row.usdtValue;
      return `
        <tr>
          <td class="accountCell">
            <div class="email">${escapeHtml(shortAccountLabel(row.accountEmail))}</div>
            <div class="subtle">${escapeHtml(row.remark || "-")}</div>
          </td>
          <td><span class="badge ${venueBadgeClass(row.venue)}">${escapeHtml(row.venue || "-")}</span></td>
          <td class="accountCell">
            <div class="email">${escapeHtml(label)}</div>
            <div class="subtle">${escapeHtml(isContract ? `${row.leverage ? `${row.leverage}x · ` : ""}${row.positionSide || "BOTH"}` : row.kind)}</div>
          </td>
          <td class="num ${Number(row.quantity || 0) < 0 ? "negative" : ""}">${numberFormat(row.quantity || 0, isContract ? 4 : 8)}</td>
          <td class="num">${isContract && row.entryPrice ? formatPositionPrice(row.entryPrice) : "-"}</td>
          <td class="num">${row.priceUsdt ? formatPositionPrice(row.priceUsdt) : "-"}</td>
          <td class="num ${returnClass(row.unrealizedPnlUsdt)}">${isContract ? signedCurrency(row.unrealizedPnlUsdt || 0) : "-"}</td>
          <td class="num">${usdFormat.format(value || 0)}</td>
        </tr>
      `;
    })
    .join("");
}

function formatPositionPrice(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "--";
  if (numeric >= 1000) return usdFormat.format(numeric);
  if (numeric >= 1) return `$${numberFormat(numeric, 4)}`;
  return `$${numberFormat(numeric, 8)}`;
}

function uniqueIndexes(indexes, length) {
  return Array.from(new Set(indexes.map((index) => Math.max(0, Math.min(length - 1, index)))))
    .filter((index) => Number.isFinite(index))
    .sort((a, b) => a - b);
}

function klineAxisLabel(timestamp) {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
}

function candleTooltipHtml(detail, row) {
  return `
    <strong>${escapeHtml(detail.klineSymbol || detail.asset)} 1h</strong>
    <span>${escapeHtml(new Date(row.timestamp).toLocaleString())}</span>
    <div>O：${escapeHtml(formatPositionPrice(row.open))}</div>
    <div>H：${escapeHtml(formatPositionPrice(row.high))}</div>
    <div>L：${escapeHtml(formatPositionPrice(row.low))}</div>
    <div>C：${escapeHtml(formatPositionPrice(row.close))}</div>
    <div>成交额：${escapeHtml(compactUsdFormat.format(row.quoteVolume || 0))}</div>
  `;
}

function markerTooltipHtml(marker) {
  const side = String(marker.side || "").toUpperCase().startsWith("S") ? "卖出" : "买入";
  return `
    <strong>${escapeHtml(side)} ${escapeHtml(marker.symbol || marker.asset || "")}</strong>
    <span>${escapeHtml(new Date(marker.timestamp).toLocaleString())}</span>
    <div>账户：${escapeHtml(shortAccountLabel(marker.accountEmail || marker.account || "-"))}</div>
    <div>价格：${escapeHtml(formatPositionPrice(marker.price || marker.priceUsdt))}</div>
    <div>数量：${escapeHtml(numberFormat(marker.quantity || 0, 8))}</div>
  `;
}

function showPositionKlineTooltip(event, html) {
  const tooltip = els.positionKlineTooltip;
  if (!tooltip) return;
  tooltip.innerHTML = html;
  tooltip.classList.remove("hidden");
  const wrap = event.currentTarget.closest(".chartWrap").getBoundingClientRect();
  const x = event.clientX - wrap.left + 12;
  const y = event.clientY - wrap.top - 12;
  tooltip.style.left = `${Math.min(x, wrap.width - 270)}px`;
  tooltip.style.top = `${Math.max(y, 10)}px`;
}

function hidePositionKlineTooltip() {
  els.positionKlineTooltip?.classList.add("hidden");
}

function renderResources() {
  if (!state.resources) return;
  const { process, system, data, network, requests, cache, scheduler } = state.resources;
  const memory = process.memory || {};
  const heapPct = memory.heapTotalBytes ? (memory.heapUsedBytes / memory.heapTotalBytes) * 100 : 0;

  els.resourceRss.textContent = formatBytes(memory.rssBytes || 0);
  els.resourceUptime.textContent = `${formatDuration(process.uptimeSeconds || 0)} uptime`;
  els.resourceCpu.textContent = `${numberFormat(process.cpuPercent || 0, 2)}%`;
  els.resourceLoad.textContent = `load ${system.loadAverage?.map((item) => numberFormat(item, 2)).join(" / ") || "--"}`;
  els.resourceDataSize.textContent = formatBytes(data.totalBytes || 0);
  els.resourceDataCount.textContent = `${data.fileCount || 0} files · ${data.inMemoryStore?.snapshots || 0} snapshots`;
  els.resourceNetworkRate.textContent = `${formatBytes(network.rxBytesPerSecond || 0)}/s ↓`;
  els.resourceNetworkTotal.textContent = `${formatBytes(network.totalRxBytes || 0)} RX · ${formatBytes(network.totalTxBytes || 0)} TX`;
  els.resourceGeneratedAt.textContent = new Date(state.resources.generatedAt).toLocaleTimeString();
  els.resourcePid.textContent = `pid ${process.pid}`;
  els.resourceStoreStat.textContent = `${data.inMemoryStore?.transfers || 0} transfers · ${data.inMemoryStore?.taggedAccounts || 0} tagged`;
  els.resourceRequestStat.textContent = `${requests.total || 0} requests · ${requests.errors || 0} errors`;
  els.resourceByteStat.textContent = `${formatBytes(requests.bytesIn || 0)} in · ${formatBytes(requests.bytesOut || 0)} out`;

  els.resourceStatusGrid.innerHTML = [
    resourceCard("Node", `${process.nodeVersion} · ${process.platform}/${process.arch}`, `started ${new Date(process.startedAt).toLocaleString()}`),
    resourceCard("Heap", `${formatBytes(memory.heapUsedBytes || 0)} / ${formatBytes(memory.heapTotalBytes || 0)}`, `${numberFormat(heapPct, 1)}% used`),
    resourceCard("System Memory", `${formatBytes(system.memory?.usedBytes || 0)} / ${formatBytes(system.memory?.totalBytes || 0)}`, `${numberFormat(system.memory?.usedPct || 0, 1)}% used`),
    resourceCard("Summary Cache", cache.summary?.hasData ? cacheAgeText(cache.summary) : "empty", cache.summary?.fresh ? "fresh" : "stale"),
    resourceCard("Positions Cache", cache.positions?.hasData ? cacheAgeText(cache.positions) : "empty", cache.positions?.fresh ? "fresh" : "stale"),
    resourceCard("Snapshot Scheduler", scheduler.isCapturingSnapshot ? "capturing" : "idle", scheduler.nextSnapshotAt ? `next ${new Date(scheduler.nextSnapshotAt).toLocaleTimeString()}` : "no schedule")
  ].join("");

  renderResourceFiles(data.files || []);
  renderResourceRequests(requests.byPath || []);
  renderResourceNetwork(network.interfaces || []);
}

function renderResourceFiles(files) {
  if (!files.length) {
    els.resourceFilesTable.innerHTML = '<tr><td colspan="3" class="empty">没有数据文件</td></tr>';
    return;
  }

  els.resourceFilesTable.innerHTML = files
    .map((file) => `
      <tr>
        <td class="accountCell">
          <div class="email">${escapeHtml(file.path)}</div>
          ${file.error ? `<div class="subtle">${escapeHtml(file.error)}</div>` : ""}
        </td>
        <td class="num">${formatBytes(file.bytes || 0)}</td>
        <td>${file.modifiedAt ? escapeHtml(new Date(file.modifiedAt).toLocaleString()) : "-"}</td>
      </tr>
    `)
    .join("");
}

function renderResourceRequests(rows) {
  if (!rows.length) {
    els.resourceRequestsTable.innerHTML = '<tr><td colspan="5" class="empty">暂无请求统计</td></tr>';
    return;
  }

  els.resourceRequestsTable.innerHTML = rows
    .map((row) => `
      <tr class="${resourceRequestRowClass(row)}">
        <td>${escapeHtml(row.path)}</td>
        <td class="num">${row.count || 0}</td>
        <td class="num ${row.errors ? "negative" : ""}">${row.errors || 0}</td>
        <td class="num">${numberFormat(row.avgMs || 0, 2)} ms</td>
        <td class="num">${formatBytes(row.bytesOut || 0)}</td>
      </tr>
    `)
    .join("");
}

function resourceRequestRowClass(row) {
  if (row.errors) return "resourceDanger";
  if (Number(row.avgMs || 0) > 5000) return "resourceWarn";
  return "";
}

function renderResourceNetwork(rows) {
  if (!rows.length) {
    els.resourceNetworkTable.innerHTML = '<tr><td colspan="3" class="empty">暂无网卡统计</td></tr>';
    return;
  }

  els.resourceNetworkTable.innerHTML = rows
    .map((row) => `
      <tr>
        <td class="accountCell">
          <div class="email">${escapeHtml(row.name)}</div>
          ${row.error ? `<div class="subtle">${escapeHtml(row.error)}</div>` : ""}
        </td>
        <td class="num">${formatBytes(row.rxBytes || 0)}</td>
        <td class="num">${formatBytes(row.txBytes || 0)}</td>
      </tr>
    `)
    .join("");
}

function resourceCard(label, value, detail) {
  return `
    <div class="resourceCard">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail || "")}</small>
    </div>
  `;
}

function renderChart() {
  if (state.performance) syncChartDaysInput();
  renderAggregateCharts();
  const chart = els.equityChart;
  chart.innerHTML = "";
  if (!state.performance) {
    chart.innerHTML = '<div class="chartEmpty">正在加载资金曲线</div>';
    return;
  }
  const metric = els.metricSelect.value;
  const selectedTagSeries = selectedTagSeriesForChart();
  if (selectedTagSeries.length) {
    renderMultiSeriesChart(chart, selectedTagSeries.map((series) => windowedSeries(series)), metric);
    return;
  }

  const series = windowedSeries(selectedSeries());
  const points = series ? series.points : [];
  if (!points || points.length < 2) {
    chart.innerHTML = `<div class="chartEmpty">${escapeHtml(emptyChartText(series))}</div>`;
    return;
  }

  const rect = chart.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 640);
  const height = Math.max(Math.round(rect.height), 320);
  const padding = { top: series.id === "total" && metric === "returnPct" ? 96 : 78, right: 28, bottom: 42, left: 92 };
  const benchmarkSeries = totalBenchmarkSeries(series, metric);
  const allChartSeries = [series, ...benchmarkSeries];
  const values = allChartSeries.flatMap((item) => item.points.map((point) => Number(point[metric] || 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(max, 1) * 0.02 || 1;
  const yMin = min - range * 0.08;
  const yMax = max + range * 0.08;
  const x0 = padding.left;
  const y0 = height - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const mapped = mapSeriesPoints(series, metric, x0, y0, plotWidth, plotHeight, yMin, yMax);
  const linePath = pathFromPoints(mapped);
  const areaPath = `${linePath} L ${mapped[mapped.length - 1].x.toFixed(2)} ${y0} L ${mapped[0].x.toFixed(2)} ${y0} Z`;
  const last = points[points.length - 1];
  const latestReturn = Number(last.returnPct || 0);
  const lineClass = latestReturn >= 0 ? "chartLine positiveLine" : "chartLine negativeLine";

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none",
    class: "chartSvg"
  });
  const defs = svgEl("defs");
  const gradient = svgEl("linearGradient", {
    id: "equityAreaGradient",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  });
  gradient.append(
    svgEl("stop", { offset: "0%", "stop-color": Number(latestReturn) >= 0 ? "#14804a" : "#c2413d", "stop-opacity": "0.18" }),
    svgEl("stop", { offset: "100%", "stop-color": Number(latestReturn) >= 0 ? "#14804a" : "#c2413d", "stop-opacity": "0" })
  );
  defs.append(gradient);
  svg.append(defs);

  for (let i = 0; i <= 4; i += 1) {
    const y = y0 - (plotHeight * i) / 4;
    const value = yMin + ((yMax - yMin) * i) / 4;
    svg.append(
      svgEl("line", { class: "chartGrid", x1: x0, y1: y, x2: x0 + plotWidth, y2: y }),
      svgText(x0 - 12, y + 4, formatChartValue(value, metric), "chartAxis yAxis")
    );
  }

  const lastMapped = mapped[mapped.length - 1];
  buildXAxisTicks(mapped, plotWidth).forEach((tick) => {
    svg.append(svgText(tick.x, height - 14, shortTime(tick.point.timestamp), `chartAxis xAxis ${tick.anchor}`));
  });

  svg.append(
    svgEl("path", { class: "chartArea", d: areaPath }),
    svgEl("path", { class: lineClass, d: linePath, pathLength: "1" }),
    svgEl("line", { class: "chartCursorLine", x1: lastMapped.x, y1: padding.top, x2: lastMapped.x, y2: y0 }),
    svgEl("circle", { class: "chartLastPoint", cx: lastMapped.x, cy: lastMapped.y, r: 4.5 })
  );
  benchmarkSeries.forEach((benchmark) => {
    const benchmarkMapped = mapSeriesPoints(benchmark, metric, x0, y0, plotWidth, plotHeight, yMin, yMax);
    const color = benchmark.color || "#475569";
    svg.append(
      svgEl("path", {
        class: "chartLine benchmarkLine",
        d: pathFromPoints(benchmarkMapped),
        pathLength: "1",
        stroke: color
      }),
      svgEl("circle", {
        class: "chartLastPoint benchmarkPoint",
        cx: benchmarkMapped[benchmarkMapped.length - 1].x,
        cy: benchmarkMapped[benchmarkMapped.length - 1].y,
        r: 3.8,
        style: `color: ${color}`
      })
    );
  });
  const hitGroup = svgEl("g", { class: "chartHits" });
  mapped.forEach((point) => {
    const hit = svgEl("circle", {
      class: "chartHit",
      cx: point.x,
      cy: point.y,
      r: Math.max(8, Math.min(18, plotWidth / mapped.length / 2))
    });
    hit.addEventListener("mouseenter", (event) => showChartTooltip(event, series, point, metric));
    hit.addEventListener("mousemove", (event) => showChartTooltip(event, series, point, metric));
    hit.addEventListener("mouseleave", hideChartTooltip);
    hitGroup.append(hit);
  });
  svg.append(hitGroup);
  svg.append(buildCashFlowMarkerGroup(series, mapped, metric, plotWidth));

  chart.append(buildChartHeader(series, metric, last, latestReturn, benchmarkSeries), svg);
}

function renderAggregateCharts() {
  const manualEnabled = Boolean(state.manualAccountsEnabled || state.performance?.manualTotal?.points?.length);
  els.manualEquityChart?.closest(".curvePanel")?.classList.toggle("hidden", !manualEnabled);
  if (els.overallCurveScope) els.overallCurveScope.textContent = manualEnabled ? "币 + A股" : "币账户";
  const charts = [
    {
      chart: els.overallEquityChart,
      series: state.performance?.total,
      title: "总账户资金曲线"
    },
    {
      chart: els.cryptoEquityChart,
      series: state.performance?.cryptoTotal,
      title: "币账户资金曲线"
    },
    {
      chart: els.manualEquityChart,
      series: state.performance?.manualTotal,
      title: "A股账户资金曲线",
      enabled: manualEnabled
    }
  ];
  const metric = els.metricSelect.value;
  charts.forEach(({ chart, series, title, enabled = true }) => {
    if (!chart) return;
    if (!enabled) return;
    chart.innerHTML = "";
    if (!state.performance) {
      chart.innerHTML = '<div class="chartEmpty">正在加载资金曲线</div>';
      return;
    }
    const windowed = windowedSeries(series);
    if (!windowed?.points || windowed.points.length < 2) {
      chart.innerHTML = `<div class="chartEmpty">${escapeHtml(title)}等待至少两次采样</div>`;
      return;
    }
    renderMultiSeriesChart(chart, [windowed], metric, title);
  });
}

function renderMultiSeriesChart(chart, seriesList, metric, title = "Tag 资金曲线") {
  const drawable = seriesList.filter((series) => series.points && series.points.length >= 2);
  if (!drawable.length) {
    chart.innerHTML = `<div class="chartEmpty">当前天数窗口内等待至少两次采样后生成 ${escapeHtml(title)}</div>`;
    return;
  }

  const rect = chart.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 640);
  const height = Math.max(Math.round(rect.height), 320);
  const padding = { top: 96, right: 28, bottom: 42, left: 92 };
  const allPoints = drawable.flatMap((series) =>
    series.points.map((point) => ({
      ...point,
      series,
      value: Number(point[metric] || 0),
      time: Date.parse(point.timestamp)
    }))
  );
  const times = allPoints.map((point) => point.time).filter(Number.isFinite);
  const values = allPoints.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(Math.abs(max), 1) * 0.02 || 1;
  const yMin = min - range * 0.08;
  const yMax = max + range * 0.08;
  const x0 = padding.left;
  const y0 = height - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const timeRange = maxTime - minTime || 1;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none",
    class: "chartSvg"
  });

  for (let i = 0; i <= 4; i += 1) {
    const y = y0 - (plotHeight * i) / 4;
    const value = yMin + ((yMax - yMin) * i) / 4;
    svg.append(
      svgEl("line", { class: "chartGrid", x1: x0, y1: y, x2: x0 + plotWidth, y2: y }),
      svgText(x0 - 12, y + 4, formatChartValue(value, metric), "chartAxis yAxis")
    );
  }

  const ticks = buildTimeTicks(minTime, maxTime, plotWidth).map((tick) => ({
    ...tick,
    x: x0 + ((tick.time - minTime) / timeRange) * plotWidth
  }));
  ticks.forEach((tick) => {
    svg.append(svgText(tick.x, height - 14, shortTime(tick.time), `chartAxis xAxis ${tick.anchor}`));
  });

  drawable.forEach((series, index) => {
    const color = colorForTag(series.tag || series.id, index);
    const mapped = series.points.map((point) => {
      const time = Date.parse(point.timestamp);
      return {
        ...point,
        series,
        x: x0 + ((time - minTime) / timeRange) * plotWidth,
        y: y0 - ((Number(point[metric] || 0) - yMin) / (yMax - yMin)) * plotHeight,
        chartY0: y0,
        value: Number(point[metric] || 0)
      };
    });
    const last = mapped[mapped.length - 1];
    svg.append(
      svgEl("path", {
        class: "chartLine tagChartLine",
        d: pathFromPoints(mapped),
        pathLength: "1",
        stroke: color
      }),
      svgEl("circle", {
        class: "chartLastPoint",
        cx: last.x,
        cy: last.y,
        r: 4,
        style: `color: ${color}`
      })
    );
    const hitGroup = svgEl("g", { class: "chartHits" });
    mapped.forEach((point) => {
      const hit = svgEl("circle", {
        class: "chartHit",
        cx: point.x,
        cy: point.y,
        r: Math.max(8, Math.min(18, plotWidth / mapped.length / 2))
      });
      hit.addEventListener("mouseenter", (event) => showChartTooltip(event, series, point, metric));
      hit.addEventListener("mousemove", (event) => showChartTooltip(event, series, point, metric));
      hit.addEventListener("mouseleave", hideChartTooltip);
      hitGroup.append(hit);
    });
    svg.append(hitGroup);
    svg.append(buildCashFlowMarkerGroup(series, mapped, metric, plotWidth, color));
  });

  const latestTimestamp = drawable
    .map((series) => series.latestTimestamp)
    .filter(Boolean)
    .sort()
    .at(-1);
  chart.append(buildMultiChartHeader(drawable, metric, latestTimestamp, title), svg);
}

function mapSeriesPoints(series, metric, x0, y0, plotWidth, plotHeight, yMin, yMax) {
  const points = series.points || [];
  return points.map((point, index) => ({
    ...point,
    series,
    x: x0 + (plotWidth * index) / (points.length - 1),
    y: y0 - ((Number(point[metric] || 0) - yMin) / (yMax - yMin)) * plotHeight,
    chartY0: y0,
    value: Number(point[metric] || 0)
  }));
}

function renderTradingVolumeChart(series) {
  const chart = els.tradingVolumeChart;
  chart.innerHTML = "";
  const points = (series?.points || []).filter((point) => Number.isFinite(Number(point.volumeUsdt)));
  if (points.length < 2) {
    chart.innerHTML = '<div class="chartEmpty">等待最近 30 天交易统计</div>';
    return;
  }

  const rect = chart.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 520);
  const height = Math.max(Math.round(rect.height), 260);
  const padding = { top: 76, right: 22, bottom: 42, left: 86 };
  const values = points.map((point) => Number(point.volumeUsdt || 0));
  const max = Math.max(...values);
  const yMax = max > 0 ? max * 1.12 : 1;
  const x0 = padding.left;
  const y0 = height - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barGap = Math.max(3, Math.min(9, plotWidth / points.length * 0.18));
  const barWidth = Math.max(5, plotWidth / points.length - barGap);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none",
    class: "chartSvg"
  });

  for (let i = 0; i <= 4; i += 1) {
    const y = y0 - (plotHeight * i) / 4;
    const value = (yMax * i) / 4;
    svg.append(
      svgEl("line", { class: "chartGrid", x1: x0, y1: y, x2: x0 + plotWidth, y2: y }),
      svgText(x0 - 12, y + 4, compactUsdFormat.format(value), "chartAxis yAxis")
    );
  }

  const mapped = points.map((point, index) => {
    const x = x0 + (plotWidth * index) / points.length + barGap / 2;
    const heightValue = yMax ? (Number(point.volumeUsdt || 0) / yMax) * plotHeight : 0;
    return {
      ...point,
      x,
      y: y0 - heightValue,
      width: barWidth,
      height: heightValue,
      value: Number(point.volumeUsdt || 0)
    };
  });

  buildXAxisTicks(mapped.map((point) => ({ ...point, x: point.x + point.width / 2 })), plotWidth).forEach((tick) => {
    svg.append(svgText(tick.x, height - 14, shortDate(tick.point.timestamp), `chartAxis xAxis ${tick.anchor}`));
  });

  mapped.forEach((point) => {
    const bar = svgEl("rect", {
      class: "volumeBar",
      x: point.x,
      y: point.y,
      width: point.width,
      height: Math.max(point.height, point.value > 0 ? 2 : 0),
      rx: 3
    });
    bar.addEventListener("mouseenter", (event) => showTradingTooltip(event, series, point));
    bar.addEventListener("mousemove", (event) => showTradingTooltip(event, series, point));
    bar.addEventListener("mouseleave", hideTradingTooltip);
    svg.append(bar);
  });

  chart.append(buildTradingChartHeader(series, points), svg);
}

function selectedSeries() {
  if (!state.performance) return null;
  const id = els.seriesSelect.value || "total";
  const aggregate = performanceAggregateSeries().find((item) => item.id === id);
  if (aggregate) return aggregate;
  const selected = state.performance.entities.find((item) => item.id === id);
  if (selected?.points?.length >= 2) return selected;
  return state.performance.total?.points?.length >= 2 ? state.performance.total : selected || state.performance.total;
}

function performanceAggregateSeries() {
  if (!state.performance) return [];
  return [
    state.performance.total,
    state.performance.cryptoTotal,
    state.performance.manualTotal
  ].filter(Boolean);
}

function selectedTagSeriesForChart() {
  if (!state.performance || !state.selectedTags.size) return [];
  return tagChartOptions().filter((item) => state.selectedTags.has(item.tag));
}

function syncChartDaysInput() {
  if (!els.chartDaysInput) return;
  const next = normalizeChartDays(els.chartDaysInput.value || state.chartDays);
  state.chartDays = next;
  if (els.chartDaysInput.value !== chartDaysInputValue(next)) els.chartDaysInput.value = chartDaysInputValue(next);
}

function normalizeChartDays(value) {
  if (isAllChartDays(value)) return "all";
  const numeric = Math.floor(Number(value || 7));
  if (!Number.isFinite(numeric)) return 7;
  return Math.max(1, Math.min(3650, numeric));
}

function isAllChartDays(value) {
  return String(value || "").trim().toLowerCase() === "all";
}

function chartDaysInputValue(value) {
  return isAllChartDays(value) ? "all" : String(normalizeChartDays(value));
}

function chartRangeLabel(value = state.chartDays) {
  if (state.chartDateFrom && state.chartDateTo) {
    return `${state.chartDateFrom} → ${state.chartDateTo}`;
  }
  return isAllChartDays(value) ? "All" : `${normalizeChartDays(value)}D`;
}

function clearChartDateRange() {
  state.chartDateFrom = "";
  state.chartDateTo = "";
  if (els.chartDateFrom) els.chartDateFrom.value = "";
  if (els.chartDateTo) els.chartDateTo.value = "";
}

function hasChartDateRange() {
  return Boolean(state.chartDateFrom && state.chartDateTo);
}

function normalizePositionKlineDays(value) {
  const numeric = Math.floor(Number(value || 7));
  if (!Number.isFinite(numeric)) return 7;
  return Math.max(1, Math.min(365, numeric));
}

function normalizePositionPnlHours(value) {
  const numeric = Math.floor(Number(value || 24));
  if (!Number.isFinite(numeric)) return 24;
  return Math.max(1, Math.min(720, numeric));
}

function windowedSeries(series) {
  if (!series?.points?.length) return series;
  const isDateRange = state.chartDateFrom && state.chartDateTo;
  const points = isDateRange
    ? windowedPointsByDateRange(series.points, state.chartDateFrom, state.chartDateTo)
    : windowedPoints(series.points, state.chartDays);
  if (!points.length) return { ...series, points: [] };
  return {
    ...series,
    points: normalizeWindowPoints(points),
    cashFlows: windowedCashFlows(series.cashFlows, points),
    latestTimestamp: points.at(-1)?.timestamp || series.latestTimestamp
  };
}

function windowedPoints(points, days) {
  if (!points?.length) return [];
  if (isAllChartDays(days)) return points;
  const latestTime = Date.parse(points.at(-1).timestamp);
  if (!Number.isFinite(latestTime)) return points;
  const cutoff = latestTime - normalizeChartDays(days) * 24 * 60 * 60 * 1000;
  const filtered = points.filter((point) => Date.parse(point.timestamp) >= cutoff);
  return filtered.length >= 2 ? filtered : points.slice(-Math.min(points.length, 2));
}

function windowedPointsByDateRange(points, dateFrom, dateTo) {
  if (!points?.length) return [];
  const startMs = new Date(dateFrom + "T00:00:00").getTime();
  const endMs = new Date(dateTo + "T23:59:59").getTime();
  const filtered = points.filter((point) => {
    const timestamp = Date.parse(point.timestamp);
    return Number.isFinite(timestamp) && timestamp >= startMs && timestamp <= endMs;
  });
  return filtered.length >= 2 ? filtered : points.slice(-Math.min(points.length, 2));
}

function normalizeWindowPoints(points) {
  const base = points[0] || {};
  const baseNav = Number(base.nav || 0);
  const baseBtcNav = Number(base.btcNav || 0);
  const baseBtcPrice = Number(base.btcPriceUsdt || 0);
  return points.map((point) => {
    const nav = Number(point.nav || 0);
    const btcNav = Number(point.btcNav || 0);
    const btcPriceUsdt = Number(point.btcPriceUsdt || 0);
    const returnPct = baseNav && nav ? (nav / baseNav - 1) * 100 : 0;
    const btcEquityReturnPct = baseBtcNav && btcNav ? (btcNav / baseBtcNav - 1) * 100 : 0;
    const btcPriceReturnPct = baseBtcPrice && btcPriceUsdt ? (btcPriceUsdt / baseBtcPrice - 1) * 100 : 0;
    return {
      ...point,
      nav: baseNav && nav ? nav / baseNav : 1,
      returnPct,
      btcEquityReturnPct,
      btcPriceReturnPct,
      excessReturnPct: returnPct - btcPriceReturnPct
    };
  });
}

function windowedCashFlows(cashFlows = [], points = []) {
  if (!points.length) return [];
  const start = Date.parse(points[0].timestamp);
  const end = Date.parse(points.at(-1).timestamp);
  return cashFlows.filter((flow) => {
    const time = Date.parse(flow.appliedAt || flow.timestamp);
    return Number.isFinite(time) && time >= start && time <= end;
  });
}

function totalBenchmarkSeries(series, metric) {
  if (series?.id !== "total" || metric !== "returnPct") return [];
  const points = series.points || [];
  const btcPricePoints = points.filter((point) => Number.isFinite(Number(point.btcPriceReturnPct)));
  const btcEquityPoints = points.filter((point) => Number.isFinite(Number(point.btcEquityReturnPct)));
  return [
    {
      id: "btc-price",
      label: "BTC价格",
      color: "#f59e0b",
      points: btcPricePoints.map((point) => ({ ...point, returnPct: Number(point.btcPriceReturnPct || 0) }))
    },
    {
      id: "btc-equity",
      label: "BTC本位资产",
      color: "#7c3aed",
      points: btcEquityPoints.map((point) => ({ ...point, returnPct: Number(point.btcEquityReturnPct || 0) }))
    }
  ].filter((item) => item.points.length >= 2);
}

function renderError(error) {
  const code = error && error.code ? error.code : "ERROR";
  const message = error && error.message ? error.message : "请求失败";
  els.statusText.textContent = "拉取失败";

  if (code === "CONFIG_MISSING") {
    els.setupPanel.classList.remove("hidden");
  }

  els.accountsTable.innerHTML = `
    <tr>
      <td colspan="11" class="empty">${escapeHtml(code)}: ${escapeHtml(message)}</td>
    </tr>
  `;
}

function coverageText(coverage = []) {
  const active = coverage.filter((item) => !item.disabled);
  const ok = active.filter((item) => item.ok).length;
  const disabled = coverage.length - active.length;
  return `${ok}/${active.length} data sources${disabled ? ` · ${disabled} 已禁用` : ""}`;
}

function signedPercent(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function signedCurrency(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${usdFormat.format(numeric)}`;
}

function signedCompactUsd(value) {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "+" : ""}${compactUsdFormat.format(numeric)}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function cacheAgeText(cache) {
  if (!cache?.fetchedAt) return "empty";
  return `${Math.round((cache.ageMs || 0) / 1000)}s old`;
}

function numberFormat(value, digits) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value || 0));
}

function returnClass(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return "positive";
  if (numeric < 0) return "negative";
  return "";
}

function petMoodClass(mood) {
  if (mood === "euphoric" || mood === "happy") return "";
  if (mood === "sad") return "danger";
  if (mood === "worried") return "warn";
  return "muted";
}

function petMouth(mood) {
  if (mood === "euphoric") return "▽";
  if (mood === "happy") return "⌣";
  if (mood === "sad") return "︿";
  if (mood === "worried") return "-";
  return "•";
}

function venueBadgeClass(venue) {
  if (venue === "Margin") return "warn";
  if (venue === "USD-M Futures" || venue === "COIN-M Futures") return "muted";
  return "";
}

function accountModeBadge(row) {
  const label = row.accountModeLabel || (row.accountMode === "unified" ? "统一账户" : "普通账户");
  const cls = row.accountMode === "unified" ? "info" : "muted";
  return `<span class="badge ${cls}" title="${escapeHtml(row.accountModeSource || "default")}">${escapeHtml(label)}</span>`;
}

function tagInput(account) {
  const value = (account.tags || []).join(", ");
  return `
    <label class="tagEditor">
      <span class="srOnly">账户 Tag</span>
      <input data-tag-input data-account-id="${escapeHtml(account.email)}" value="${escapeHtml(value)}" placeholder="strategy, market" />
    </label>
  `;
}

function tagBadges(tags = []) {
  if (!tags.length) return "";
  return `<div class="tagBadges">${tags.map((tag) => `<span class="tagBadge">#${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function performanceSubline(item) {
  if (item.tag) return `${item.accountCount || 0} 个账户 · ${item.latestTimestamp || "-"}`;
  return item.latestTimestamp || "-";
}

function periodStat(item, key) {
  return item.stats?.[key] || {
    returnPct: 0,
    pnlUsdt: 0
  };
}

function tagChartOptions() {
  if (!state.performance) return [];
  const total = state.performance.total
    ? {
        ...state.performance.total,
        id: totalTagId,
        tag: "总账户",
        label: "总账户",
        accountCount: state.performance.requiredEntityCount || state.performance.entities?.length || 0,
        builtIn: true
      }
    : null;
  return [total, ...(state.performance.tags || [])].filter(Boolean);
}

function tagOptionSubline(item) {
  if (item.builtIn) return "全部账户";
  return `${item.accountCount || 0} 个账户`;
}

function buildChartHeader(series, metric, last, latestReturn, benchmarkSeries = []) {
  const header = document.createElement("div");
  header.className = "chartHeader";
  const benchmarkLegend = benchmarkSeries.length
    ? `<div class="chartLegend compactLegend">${benchmarkSeries.map((item) => `
        <span class="chartLegendItem" style="--legend-color: ${escapeHtml(item.color)}">
          <i aria-hidden="true"></i>${escapeHtml(item.label)}
          <b>${escapeHtml(signedPercent(item.points.at(-1)?.returnPct || 0))}</b>
        </span>
      `).join("")}</div>`
    : "";
  header.innerHTML = `
    <div class="chartTitleBlock">
      <strong title="${escapeHtml(series.label)}">${escapeHtml(series.label)}</strong>
      <span>${chartMetricLabel(metric)} · ${chartRangeLabel()} · ${escapeHtml(new Date(last.timestamp).toLocaleString())}</span>
      ${benchmarkLegend}
    </div>
    <div class="chartReturn ${returnClass(last.returnPct)}">${signedPercent(last.returnPct)} / ${chartRangeLabel()}</div>
  `;
  return header;
}

function buildMultiChartHeader(seriesList, metric, latestTimestamp, title = "Tag 资金曲线") {
  const header = document.createElement("div");
  header.className = "chartHeader multiChartHeader";
  const legend = seriesList
    .map((series, index) => {
      const color = colorForTag(series.tag || series.id, index);
      const latest = series.points[series.points.length - 1];
      return `
        <span class="chartLegendItem" style="--legend-color: ${escapeHtml(color)}">
          <i aria-hidden="true"></i>
          ${escapeHtml(series.tag || series.label)}
          <b>${escapeHtml(formatChartValue(latest?.[metric] || 0, metric))}</b>
        </span>
      `;
    })
    .join("");
  header.innerHTML = `
    <div class="chartTitleBlock">
      <strong>${escapeHtml(title)}</strong>
      <span>${chartMetricLabel(metric)} · ${chartRangeLabel()} · ${escapeHtml(latestTimestamp ? new Date(latestTimestamp).toLocaleString() : "-")}</span>
    </div>
    <div class="chartLegend">${legend}</div>
  `;
  return header;
}

function buildTradingChartHeader(series, points) {
  const header = document.createElement("div");
  header.className = "chartHeader";
  const total = points.reduce((sum, point) => sum + Number(point.volumeUsdt || 0), 0);
  const latestPoint = points
    .filter((point) => Number(point.volumeUsdt || 0) > 0)
    .at(-1);
  header.innerHTML = `
    <div class="chartTitleBlock">
      <strong title="${escapeHtml(series.label || series.email || "交易额")}">${escapeHtml(series.label || series.email || "交易额")}</strong>
      <span>最近 30 天 · 最后交易 ${escapeHtml(formatLastTrade(latestPoint?.timestamp))}</span>
    </div>
    <div class="chartReturn">${escapeHtml(compactUsdFormat.format(total))}</div>
  `;
  return header;
}

function buildExposureChartHeader(rows) {
  const header = document.createElement("div");
  header.className = "chartHeader";
  const totalLong = rows.filter((row) => row.side === "long").reduce((sum, row) => sum + Number(row.notionalUsdt || 0), 0);
  const totalShort = rows.filter((row) => row.side === "short").reduce((sum, row) => sum + Number(row.notionalUsdt || 0), 0);
  header.innerHTML = `
    <div class="chartTitleBlock">
      <strong>Top 20 币种净敞口</strong>
      <span>所有账户资产余额 + 合约多空合并后排序</span>
    </div>
    <div class="chartLegend">
      <span class="chartLegendItem" style="--legend-color: #14804a"><i aria-hidden="true"></i>净多 <b>${escapeHtml(compactUsdFormat.format(totalLong))}</b></span>
      <span class="chartLegendItem" style="--legend-color: #c2413d"><i aria-hidden="true"></i>净空 <b>${escapeHtml(compactUsdFormat.format(totalShort))}</b></span>
    </div>
  `;
  return header;
}

function buildXAxisTicks(points, plotWidth) {
  const targetCount = plotWidth < 420 ? 2 : plotWidth < 760 ? 3 : 4;
  const indexes = new Set();
  for (let i = 0; i < targetCount; i += 1) {
    indexes.add(Math.round((i * (points.length - 1)) / (targetCount - 1)));
  }

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .map((index, position, all) => ({
      point: points[index],
      x: points[index].x,
      anchor: position === 0 ? "start" : position === all.length - 1 ? "end" : "middle"
    }));
}

function buildTimeTicks(minTime, maxTime, plotWidth) {
  const targetCount = plotWidth < 420 ? 2 : plotWidth < 760 ? 3 : 4;
  const ticks = [];
  for (let i = 0; i < targetCount; i += 1) {
    const ratio = targetCount === 1 ? 0 : i / (targetCount - 1);
    ticks.push({
      time: minTime + (maxTime - minTime) * ratio,
      anchor: i === 0 ? "start" : i === targetCount - 1 ? "end" : "middle"
    });
  }
  return ticks;
}

function colorForTag(tag, fallbackIndex = 0) {
  const options = tagChartOptions();
  const index = options.findIndex((item) => item.tag === tag || item.id === tag);
  const colorIndex = index >= 0 ? index : fallbackIndex;
  if (colorIndex < chartPalette.length) return chartPalette[colorIndex];

  const hue = Math.round((colorIndex * 137.508) % 360);
  const saturation = 68 + (colorIndex % 3) * 8;
  const lightness = 38 + (colorIndex % 4) * 6;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function pathFromPoints(points) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildCashFlowMarkerGroup(series, mapped, metric, plotWidth, seriesColor = "") {
  const flows = cashFlowMarkersForSeries(series, mapped);
  const group = svgEl("g", { class: "cashFlowMarkers" });
  if (!flows.length) return group;

  const maxMarkers = plotWidth < 520 ? 16 : 36;
  flows.slice(-maxMarkers).forEach((flow, index) => {
    const direction = flow.direction === "out" || Number(flow.signedUsdtValue || 0) < 0 ? "out" : "in";
    const offset = direction === "in" ? -18 - (index % 2) * 10 : 18 + (index % 2) * 10;
    const y = Math.max(86, Math.min(mapped[0].chartY0 || 9999, flow.point.y + offset));
    const marker = svgEl("g", {
      class: `cashFlowMarker ${direction}`,
      transform: `translate(${flow.point.x.toFixed(2)} ${y.toFixed(2)})`
    });
    if (seriesColor) marker.setAttribute("style", `--series-color: ${seriesColor}`);
    marker.append(
      svgEl("circle", { class: "cashFlowMarkerDot", r: 9 }),
      svgText(0, 4, direction === "in" ? "+" : "-", "cashFlowMarkerLabel")
    );
    marker.addEventListener("mouseenter", (event) => showCashFlowTooltip(event, series, flow.cashFlow, metric));
    marker.addEventListener("mousemove", (event) => showCashFlowTooltip(event, series, flow.cashFlow, metric));
    marker.addEventListener("mouseleave", hideChartTooltip);
    group.append(marker);
  });
  return group;
}

function cashFlowMarkersForSeries(series, mapped) {
  const flows = Array.isArray(series?.cashFlows) ? series.cashFlows : [];
  if (!flows.length || !mapped.length) return [];

  return flows
    .map((cashFlow) => {
      const targetTime = Date.parse(cashFlow.appliedAt || cashFlow.timestamp);
      if (!Number.isFinite(targetTime)) return null;
      const point = nearestPointAtOrAfter(mapped, targetTime);
      if (!point) return null;
      return {
        cashFlow,
        point,
        direction: cashFlow.direction
      };
    })
    .filter(Boolean);
}

function nearestPointAtOrAfter(points, targetTime) {
  let fallback = null;
  for (const point of points) {
    const time = Date.parse(point.timestamp);
    if (!Number.isFinite(time)) continue;
    fallback = point;
    if (time >= targetTime) return point;
  }
  return fallback;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(svgNs, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function svgText(x, y, text, className) {
  const node = svgEl("text", { x, y, class: className });
  node.textContent = text;
  return node;
}

function showChartTooltip(event, series, point, metric) {
  const wrap = event.currentTarget.closest(".chartWrap");
  const tooltip = wrap?.querySelector(".chartTooltip") || document.querySelector("#chartTooltip");
  if (!tooltip) return;
  const value = formatChartValue(point.value, metric);
  const extraTotalRows = series.id === "total" && metric === "returnPct"
    ? `
      <div>BTC价格涨跌：${escapeHtml(signedPercent(point.btcPriceReturnPct || 0))}</div>
      <div>BTC本位涨跌：${escapeHtml(signedPercent(point.btcEquityReturnPct || 0))}</div>
      <div>相对BTC超额：${escapeHtml(signedPercent(point.excessReturnPct || 0))}</div>
    `
    : "";
  tooltip.innerHTML = `
    <strong>${escapeHtml(series.label)}</strong>
    <span>${escapeHtml(new Date(point.timestamp).toLocaleString())}</span>
    <div>${chartMetricLabel(metric)}：${escapeHtml(value)}</div>
    ${metric === "returnPct" ? "" : `<div>收益率：${escapeHtml(signedPercent(point.returnPct))}</div>`}
    <div>账户余额：${escapeHtml(usdFormat.format(point.equityUsdt || 0))}</div>
    ${point.equityBtc ? `<div>BTC本位余额：${escapeHtml(btcFormat.format(point.equityBtc))} BTC</div>` : ""}
    ${extraTotalRows}
  `;
  tooltip.classList.remove("hidden");
  const rect = wrap.getBoundingClientRect();
  const x = event.clientX - rect.left + 12;
  const y = event.clientY - rect.top - 12;
  tooltip.style.left = `${Math.min(x, rect.width - 220)}px`;
  tooltip.style.top = `${Math.max(y, 10)}px`;
}

function showCashFlowTooltip(event, series, cashFlow, metric) {
  const wrapEl = event.currentTarget.closest(".chartWrap");
  const tooltip = wrapEl?.querySelector(".chartTooltip") || document.querySelector("#chartTooltip");
  if (!tooltip) return;
  const isIn = cashFlow.direction === "in" || Number(cashFlow.signedUsdtValue || 0) > 0;
  const markerOnly = cashFlow.tracked === false;
  tooltip.innerHTML = `
    <strong>${escapeHtml(series.label)}</strong>
    <span>${escapeHtml(new Date(cashFlow.timestamp).toLocaleString())}</span>
    <div>${markerOnly ? "资金标记" : "现金流"}：${isIn ? "+" : "-"}${escapeHtml(compactUsdFormat.format(cashFlow.usdtValue || 0))}</div>
    <div>${escapeHtml(cashFlowSourceLabel(cashFlow.source))} · ${escapeHtml(cashFlow.amount || "0")} ${escapeHtml(cashFlow.asset || "")}</div>
    ${markerOnly ? "<div>仅作加仓标记，未纳入当前净值/收益扣除口径</div>" : ""}
  `;
  tooltip.classList.remove("hidden");
  const wrap = wrapEl?.getBoundingClientRect();
  if (!wrap) return;
  const x = event.clientX - wrap.left + 12;
  const y = event.clientY - wrap.top - 12;
  tooltip.style.left = `${Math.min(x, wrap.width - 220)}px`;
  tooltip.style.top = `${Math.max(y, 10)}px`;
}

function showTradingTooltip(event, series, point) {
  const tooltip = document.querySelector("#tradingChartTooltip");
  tooltip.innerHTML = `
    <strong>${escapeHtml(series.label || series.email || "交易额")}</strong>
    <span>${escapeHtml(new Date(point.timestamp).toLocaleDateString())}</span>
    <div>交易额：${escapeHtml(usdFormat.format(point.volumeUsdt || 0))}</div>
  `;
  tooltip.classList.remove("hidden");
  const wrap = event.currentTarget.closest(".chartWrap").getBoundingClientRect();
  const x = event.clientX - wrap.left + 12;
  const y = event.clientY - wrap.top - 12;
  tooltip.style.left = `${Math.min(x, wrap.width - 220)}px`;
  tooltip.style.top = `${Math.max(y, 10)}px`;
}

function showExposureTooltip(event, row) {
  const tooltip = els.positionsExposureTooltip;
  const contractNetUsdt = Number(row.contractLongUsdt || 0) - Number(row.contractShortUsdt || 0);
  tooltip.innerHTML = `
    <strong>${escapeHtml(row.asset)} ${row.side === "short" ? "净空" : "净多"}</strong>
    <span>${escapeHtml(`${row.accountCount || 0} 个账户 · ${(row.venues || []).join(", ")}`)}</span>
    <div>净敞口：${escapeHtml(signedCurrency(row.signedNotionalUsdt || 0))}</div>
    <div>资产余额敞口：${escapeHtml(signedCurrency(row.assetExposureUsdt || 0))}</div>
    <div>合约净敞口：${escapeHtml(signedCurrency(contractNetUsdt))}</div>
    <div>多头合计：${escapeHtml(usdFormat.format(row.longNotionalUsdt || 0))}</div>
    <div>空头合计：${escapeHtml(usdFormat.format(row.shortNotionalUsdt || 0))}</div>
    <div>收益率：${escapeHtml(signedPercent(row.pnlPct || 0))}</div>
    <div>未实现PnL：${escapeHtml(signedCurrency(row.unrealizedPnlUsdt || 0))}</div>
    <div>毛仓位：${escapeHtml(usdFormat.format(row.grossNotionalUsdt || 0))}</div>
    <div>标的：${escapeHtml((row.symbols || []).join(", "))}</div>
  `;
  tooltip.classList.remove("hidden");
  const wrap = event.currentTarget.closest(".chartWrap").getBoundingClientRect();
  const x = event.clientX - wrap.left + 12;
  const y = event.clientY - wrap.top - 12;
  tooltip.style.left = `${Math.min(x, wrap.width - 260)}px`;
  tooltip.style.top = `${Math.max(y, 10)}px`;
}

function hideExposureTooltip() {
  els.positionsExposureTooltip?.classList.add("hidden");
}

function chartMetricLabel(metric) {
  if (metric === "returnPct") return "收益率";
  if (metric === "equityUsdt") return "账户净值";
  return "单位净值";
}

function formatChartValue(value, metric) {
  if (metric === "returnPct") return signedPercent(value);
  if (metric === "equityUsdt") return compactUsdFormat.format(value);
  return numberFormat(value, 4);
}

function shortAccountLabel(value) {
  const text = String(value || "");
  const [name] = text.split("@");
  return name.length > 18 ? `${name.slice(0, 15)}...` : name || "-";
}

function cashFlowSourceLabel(source) {
  if (source === "deposit") return "链上入金";
  if (source === "withdraw") return "链上出金";
  if (source === "binanceInternalDeposit") return "币安内部入金";
  if (source === "binanceInternalWithdraw") return "币安内部出金";
  if (source === "binancePayTransfer") return "币安 Pay/C2C 钱包变动";
  if (source === "subAccountSpotTransfer") return "子账户现货划转";
  if (source === "universalTransfer") return "母子账户划转";
  return "现金流";
}

function hideChartTooltip() {
  document.querySelectorAll(".chartTooltip").forEach((tooltip) => tooltip.classList.add("hidden"));
}

function hideTradingTooltip() {
  document.querySelector("#tradingChartTooltip").classList.add("hidden");
}

function shortTime(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function shortDate(timestamp) {
  const date = new Date(timestamp);
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayInputDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDateTime(timestamp) {
  if (!timestamp) return "-";
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return "-";
  return shortTime(parsed);
}

function manualAccountById(accountId) {
  return (state.manualAccounts?.accounts || []).find((account) => account.id === accountId) || null;
}

function latestManualEntryForAccount(accountId, date = "") {
  const entries = state.manualAccounts?.entries || [];
  return entries.find((entry) => entry.accountId === accountId && (!date || entry.date === date)) ||
    entries.find((entry) => entry.accountId === accountId) ||
    null;
}

function manualCashFlowText(value) {
  const numeric = Number(value || 0);
  if (!numeric) return "-";
  return `${numeric > 0 ? "+" : ""}${cnyFormat.format(numeric)}`;
}

function cashFlowClass(value) {
  const numeric = Number(value || 0);
  if (numeric > 0) return "positive";
  if (numeric < 0) return "negative";
  return "muted";
}

function manualCashFlowInline(entry) {
  if (!entry || !Number(entry.cashFlowCny || 0)) return "无出入金";
  const label = entry.cashFlowType === "opening" ? "初始" : "出入金";
  return `${label} ${manualCashFlowText(entry.cashFlowCny)}`;
}

function resetManualAccountForm() {
  state.manualEditingId = "";
  if (!els.manualAccountForm) return;
  els.manualAccountForm.reset();
  if (els.manualAccountDate) els.manualAccountDate.value = todayInputDate();
  if (els.manualAccountCashFlow) els.manualAccountCashFlow.value = "";
  if (els.manualEditHint) els.manualEditHint.textContent = "新账户会自动创建";
}

function fillManualAccountForm(account, options = {}) {
  if (!account) return;
  state.manualEditingId = account.id || "";
  els.manualAccountDate.value = options.date || account.lastEntryDate || todayInputDate();
  els.manualAccountLabel.value = account.label || "";
  els.manualAccountBroker.value = account.broker || "";
  els.manualAccountEquity.value = options.equityCny ?? account.equityCny ?? "";
  els.manualAccountTags.value = (account.tags || []).join(", ");
  els.manualAccountCashFlow.value = "";
  if (els.manualEditHint) els.manualEditHint.textContent = options.hint || `正在编辑：${account.label || "手工账户"}`;
}

function formatLastTrade(timestamp) {
  if (!timestamp) return "无记录";
  return new Date(timestamp).toLocaleDateString();
}

function emptyChartText(series) {
  if (!state.performance) return "正在加载资金曲线";
  if (state.performance.snapshotCount >= 2 && state.performance.total?.points?.length >= 2) {
    return "当前账户没有足够采样点，已可切换到总账户查看资金曲线";
  }
  return "等待至少两次采样后生成曲线";
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function decimalToSats(value) {
  const [whole = "0", fraction = ""] = String(value || "0").split(".");
  return BigInt(`${whole}${fraction.padEnd(8, "0").slice(0, 8)}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
