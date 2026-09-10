/**
 * AZ Board - Frontend Application Controller (Vercel + Supabase)
 * Autenticação Google Workspace, Supabase Storage, Realtime WebSockets & Database
 */

// ============================================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================================
const SUPABASE_URL = "https://lggkmkmukrynzpgxkxwm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mWzgu8aUINgVaofrV0WFHw_2wGY3Cpl";

let supabaseClient = null;
try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Erro ao inicializar Supabase Client:", e);
}

// Domínios Corporativos Autorizados
const ALLOWED_DOMAINS = [
  "azi.net.br",
  "solucaosiga.com.br",
  "efcaz.com.br",
  "azi.com.br",
  "comprasbr.com.br"
];
const MASTER_ADMIN = "guilherme.valle@azi.com.br";

// ============================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================================
const state = {
  user: null,
  admins: [MASTER_ADMIN],
  boards: [],
  activeBoard: null,
  cards: [],
  filteredCards: [],
  currentSearch: "",
  activeCardForComments: null,
  comments: [],
  voteChartInstance: null,
  voteSummary: null,
  isLoading: false,
  realtimeChannel: null,
  editingCardId: null,
  editingBoardId: null,
  pendingMediaFile: null,
  viewMode: 'admin',
  isAdminDrawerOpen: false
};

// ============================================================================
// PALETAS DE CORES & GRADIENTES (AZ & VARIADAS)
// ============================================================================
const AZ_GRADIENTS = [
  // 2 Opções Oficiais AZ
  { name: "AZ Corporate", value: "linear-gradient(135deg, #0A2334 0%, #173057 50%, #D75B36 100%)" },
  { name: "AZ Pôr do Sol", value: "linear-gradient(135deg, #173057 0%, #D75B36 70%, #DC7B52 100%)" },

  // Opções Variadas Modernas
  { name: "Ocean Deep", value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { name: "Sunset Horizon", value: "linear-gradient(135deg, #42275a 0%, #734b6d 100%)" },
  { name: "Emerald Mystic", value: "linear-gradient(135deg, #0d324d 0%, #7f5a83 100%)" },
  { name: "Midnight Cosmic", value: "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)" },
  { name: "Aurora Green", value: "linear-gradient(135deg, #052e16 0%, #065f46 50%, #0d9488 100%)" },
  { name: "Deep Royal", value: "linear-gradient(135deg, #141e30 0%, #243b55 100%)" },
  { name: "Fire Amber", value: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #f59e0b 100%)" },
  { name: "Charcoal Slate", value: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)" },
  { name: "Vibrant Berry", value: "linear-gradient(135deg, #581c87 0%, #9333ea 50%, #ec4899 100%)" },
  { name: "Cyber Teal", value: "linear-gradient(135deg, #042f2e 0%, #0f766e 50%, #14b8a6 100%)" }
];

const AZ_SOLID_COLORS = [
  // 2 Opções Oficiais AZ
  { name: "Azul Escuro AZ", value: "#0A2334" },
  { name: "Laranja AZ", value: "#D75B36" },

  // Opções Variadas Modernas
  { name: "Grafite Escuro", value: "#1e293b" },
  { name: "Índigo Profundo", value: "#1e1b4b" },
  { name: "Esmeralda Escuro", value: "#064e3b" },
  { name: "Teal Oceano", value: "#134e4a" },
  { name: "Vinho Elegante", value: "#4c0519" },
  { name: "Roxo Noite", value: "#3b0764" },
  { name: "Azul Petróleo", value: "#0c4a6e" },
  { name: "Cinza Carvão", value: "#18181b" },
  { name: "Cobre Intenso", value: "#7c2d12" },
  { name: "Azul Cobalto", value: "#1e3a8a" }
];

const POPULAR_EMOJIS = [
  "📌", "💡", "🎯", "🚀", "💬", "📊", "🎨", "🏆",
  "🔥", "⭐", "📝", "📅", "👥", "🏢", "📢", "💼",
  "⚡", "🌟", "🛠️", "🧩", "🏷️", "🔍", "📈", "✨",
  "💻", "☕", "❤️", "🎉", "🔔", "📁", "🤝", "⚙️"
];

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
  setupEventListeners();
  renderEmojiPicker();
  renderGradientsList();
  renderSolidColorsList();
  initAuthFlow();
});

// ============================================================================
// FLUXO DE AUTENTICAÇÃO SUPABASE + GOOGLE WORKSPACE
// ============================================================================
function isEmailAuthorized(email) {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === MASTER_ADMIN) return true;
  const parts = cleanEmail.split("@");
  if (parts.length !== 2) return false;
  return ALLOWED_DOMAINS.includes(parts[1]);
}

async function initAuthFlow() {
  if (!supabaseClient) return;

  // 1. Escuta mudanças de sessão em tempo real
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      await handleAuthenticatedUser(session.user);
    } else {
      handleUnauthenticatedUser();
    }
  });

  // 2. Verifica se já existe uma sessão ativa
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    await handleAuthenticatedUser(session.user);
  } else {
    handleUnauthenticatedUser();
  }
}

async function handleAuthenticatedUser(supabaseUser) {
  const email = (supabaseUser.email || "").toLowerCase().trim();

  // Validação de Domínio Corporativo AZ
  if (!isEmailAuthorized(email)) {
    console.warn("Tentativa de login com domínio não autorizado:", email);
    await supabaseClient.auth.signOut();
    showLoginError("Acesso Não Autorizado", `O e-mail "${email}" não pertence aos domínios corporativos autorizados da AZ.`);
    handleUnauthenticatedUser();
    return;
  }

  // Obter nome e avatar
  let name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name;
  if (!name) {
    name = email.split("@")[0].replace(/\./g, " ");
    name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  const avatarUrl = supabaseUser.user_metadata?.avatar_url || null;

  state.user = {
    id: supabaseUser.id,
    email: email,
    name: name,
    avatarUrl: avatarUrl,
    isAdmin: email === MASTER_ADMIN,
    isMasterAdmin: email === MASTER_ADMIN
  };

  // Alternar telas imediatamente para transição instantânea
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  renderUserInfo();

  // Carregar lista de administradores do banco e re-renderizar
  await loadAdminsList();
  renderUserInfo();

  // Iniciar Realtime e Murais
  setupRealtimeWebsockets();
  await loadBoards();

  // Verificar link direto de compartilhamento (?board=<id>)
  await checkDirectBoardAccess();
}

// Acesso direto a um mural específico compartilhado
async function checkDirectBoardAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetBoardId = urlParams.get("board");
  if (!targetBoardId) return;

  let target = state.boards.find(b => b.id === targetBoardId);

  // Se não estiver na lista geral, busca direto no Supabase
  if (!target && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("boards")
        .select("*, cards(id)")
        .eq("id", targetBoardId)
        .single();
      if (!error && data) {
        target = {
          ...data,
          card_count: data.cards ? data.cards.length : 0
        };
        state.boards.push(target);
      }
    } catch (e) {
      console.warn("Aviso ao buscar mural direto:", e);
    }
  }

  if (target) {
    state.isDirectBoardAccess = true;
    openBoard(target);

    // Se o colaborador não for admin, oculta acesso ao painel geral de murais
    if (!state.user?.isAdmin && !state.user?.isMasterAdmin) {
      document.getElementById("btn-back-to-dashboard")?.classList.add("hidden");
      const headerLogo = document.getElementById("header-logo-home");
      if (headerLogo) {
        headerLogo.classList.remove("cursor-pointer");
        headerLogo.title = "AZ Board - " + target.title;
        headerLogo.onclick = (e) => { e.preventDefault(); };
      }
    }
  } else {
    showToast("Mural compartilhado não encontrado.", "error");
  }
}

function handleUnauthenticatedUser() {
  state.user = null;
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("view-login").classList.remove("hidden");
}

function showLoginError(title, message) {
  const box = document.getElementById("login-error-box");
  const titleEl = document.getElementById("login-error-title");
  const detailEl = document.getElementById("login-error-detail");
  if (box && titleEl && detailEl) {
    titleEl.textContent = title;
    detailEl.textContent = message;
    box.classList.remove("hidden");
  }
}

async function signInWithGoogle() {
  if (!supabaseClient) return;
  showLoader(true);
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    showLoader(false);
    console.error("Erro ao iniciar login Google:", err);
    showLoginError("Erro de Conexão", "Não foi possível conectar ao Google. Verifique se o Provider Google está configurado no Supabase.");
  }
}

async function signOut() {
  showLoader(true);
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (e) {}
  state.user = null;
  showLoader(false);
  handleUnauthenticatedUser();
}

// Modo Demonstração / Dev para testes imediatos sem Google OAuth
function devTestLogin() {
  handleAuthenticatedUser({
    id: "dev-master-id",
    email: MASTER_ADMIN,
    user_metadata: {
      full_name: "Guilherme Valle (Dev)",
      avatar_url: null
    }
  });
  showToast("Modo Demonstração ativado com Guilherme Valle", "success");
}

// ============================================================================
// RENDERIZAÇÃO DO USUÁRIO NO HEADER
// ============================================================================
function renderUserInfo() {
  if (!state.user) return;
  const nameEl = document.getElementById("user-name-display");
  const emailEl = document.getElementById("user-email-display");
  const avatarContainer = document.getElementById("user-avatar-container");
  const adminBadge = document.getElementById("admin-badge");
  const btnManageAdmins = document.getElementById("btn-manage-admins");

  if (nameEl) nameEl.textContent = state.user.name;
  if (emailEl) emailEl.textContent = state.user.email;

  if (avatarContainer) {
    if (state.user.avatarUrl) {
      avatarContainer.innerHTML = `<img src="${state.user.avatarUrl}" class="w-full h-full object-cover" alt="${state.user.name}">`;
    } else {
      const initial = (state.user.name || "A").charAt(0).toUpperCase();
      avatarContainer.innerHTML = `<span id="user-avatar-initials">${initial}</span>`;
    }
  }

  const isAdm = state.user.isAdmin || state.user.isMasterAdmin;
  if (adminBadge) adminBadge.classList.toggle("hidden", !isAdm);
  if (btnManageAdmins) btnManageAdmins.classList.toggle("hidden", !isAdm);
}

// ============================================================================
// GESTÃO DE ADMINISTRADORES
// ============================================================================
async function loadAdminsList() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("admins").select("email");
    if (!error && data) {
      const dbAdmins = data.map(a => a.email.toLowerCase().trim());
      state.admins = Array.from(new Set([MASTER_ADMIN, ...dbAdmins]));
      if (state.user) {
        state.user.isAdmin = state.admins.includes(state.user.email.toLowerCase());
      }
    }
  } catch (err) {
    console.warn("Aviso ao carregar admins:", err);
  }
}

function openAdminManagementModal() {
  renderAdminsList();
  openModal("modal-admins");
}

function renderAdminsList() {
  const container = document.getElementById("admins-list");
  if (!container) return;
  container.innerHTML = "";

  state.admins.forEach(email => {
    const isMaster = email.toLowerCase() === MASTER_ADMIN;
    const item = document.createElement("div");
    item.className = "flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs";
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="${isMaster ? 'crown' : 'shield'}" class="w-3.5 h-3.5 ${isMaster ? 'text-amber-500' : 'text-[#D75B36]'}"></i>
        <span class="font-body-medium text-gray-700">${email}</span>
        ${isMaster ? '<span class="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Master</span>' : ''}
      </div>
      ${!isMaster && (state.user?.isMasterAdmin || state.user?.isAdmin) ? `
        <button type="button" class="btn-remove-admin p-1 text-gray-400 hover:text-red-500" data-email="${email}" title="Remover Admin">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      ` : ''}
    `;
    container.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();

  container.querySelectorAll(".btn-remove-admin").forEach(btn => {
    btn.addEventListener("click", () => handleRemoveAdmin(btn.dataset.email));
  });
}

async function handleAddAdmin(e) {
  e.preventDefault();
  const input = document.getElementById("new-admin-email-input");
  const email = (input?.value || "").toLowerCase().trim();
  if (!email) return;

  if (!isEmailAuthorized(email)) {
    showToast("O e-mail deve pertencer a um dos domínios corporativos da AZ!", "error");
    return;
  }

  showLoader(true);
  try {
    const { error } = await supabaseClient.from("admins").insert([{ email: email }]);
    if (error && error.code !== "23505") throw error; // Ignora erro de duplicidade
    await loadAdminsList();
    renderAdminsList();
    input.value = "";
    showToast("Administrador adicionado com sucesso!", "success");
  } catch (err) {
    showToast("Erro ao adicionar admin: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

async function handleRemoveAdmin(email) {
  if (email.toLowerCase() === MASTER_ADMIN) {
    showToast("O Master Admin não pode ser removido!", "error");
    return;
  }
  if (!confirm(`Remover ${email} dos administradores?`)) return;

  showLoader(true);
  try {
    const { error } = await supabaseClient.from("admins").delete().eq("email", email);
    if (error) throw error;
    await loadAdminsList();
    renderAdminsList();
    showToast("Administrador removido!", "info");
  } catch (err) {
    showToast("Erro ao remover admin: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// ============================================================================
// SUPABASE REALTIME WEBSOCKETS (<50ms)
// ============================================================================
function setupRealtimeWebsockets() {
  if (!supabaseClient) return;
  if (state.realtimeChannel) {
    supabaseClient.removeChannel(state.realtimeChannel);
  }

  state.realtimeChannel = supabaseClient.channel("az-board-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "boards" }, (payload) => {
      loadBoards(true);
      // Atualização imediata do mural ativo em tempo real se alterado
      if (state.activeBoard && payload.new && payload.new.id === state.activeBoard.id) {
        state.activeBoard = { ...state.activeBoard, ...payload.new };
        document.getElementById("board-view-icon").textContent = state.activeBoard.icon || "📌";
        document.getElementById("board-view-title").textContent = state.activeBoard.title;
        document.getElementById("board-view-desc").textContent = state.activeBoard.description || "";
        applyBoardBackground(state.activeBoard);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => {
      if (state.activeBoard) {
        loadCards(state.activeBoard.id, true);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
      if (state.activeCardForComments) {
        loadComments(state.activeCardForComments, true);
      }
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
      if (state.activeBoard) {
        loadCards(state.activeBoard.id, true);
      }
    })
    .subscribe();
}

// ============================================================================
// GESTÃO DE MURAIS (BOARDS)
// ============================================================================
async function loadBoards(isSilent = false) {
  if (!isSilent) showLoader(true);
  try {
    const { data: boards, error } = await supabaseClient
      .from("boards")
      .select("*, cards(id)")
      .order("created_at", { ascending: false });

    if (!isSilent) showLoader(false);
    if (error) throw error;

    state.boards = (boards || []).map(b => ({
      ...b,
      card_count: b.cards ? b.cards.length : 0
    }));

    renderBoardsGrid();
  } catch (err) {
    if (!isSilent) showLoader(false);
    console.error("Erro ao carregar murais:", err);
    showToast("Erro ao carregar murais do Supabase.", "error");
  }
}

function renderBoardsGrid() {
  const grid = document.getElementById("boards-grid");
  const empty = document.getElementById("empty-boards-msg");
  if (!grid) return;

  grid.innerHTML = "";

  if (!state.boards || state.boards.length === 0) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  state.boards.forEach(board => {
    const cardEl = document.createElement("div");
    cardEl.className = "glass-card rounded-2xl overflow-hidden border border-gray-100 flex flex-col cursor-pointer group";
    
    // Background header
    let bgStyle = "background: linear-gradient(135deg, #0A2334 0%, #173057 100%);";
    if (board.background_type === "gradient" || board.background_type === "color") {
      bgStyle = `background: ${board.background_value};`;
    } else if (board.background_type === "image" && board.background_value) {
      bgStyle = `background: url('${board.background_value}') center/cover no-repeat;`;
    }

    const isAdmin = state.user && (state.user.isAdmin || state.user.isMasterAdmin);
    const isOwnerOrAdmin = state.user && (board.created_by === state.user.email || isAdmin);

    cardEl.innerHTML = `
      <div class="h-24 p-3 relative flex items-start justify-between" style="${bgStyle}">
        <div class="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-xl">
          ${board.icon || '📌'}
        </div>
        <div class="flex items-center gap-1">
          ${board.vote_mode && isAdmin ? '<span class="text-[9px] uppercase font-subtitle-semibold bg-[#D75B36] text-white px-2 py-0.5 rounded-full font-bold shadow-sm">Votação</span>' : ''}
          ${isOwnerOrAdmin ? `
            <div class="relative group/menu">
              <button type="button" class="btn-board-menu p-1 text-white/80 hover:text-white rounded-lg bg-black/20 hover:bg-black/40">
                <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
              </button>
              <div class="hidden group-hover/menu:block absolute right-0 top-6 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                <button type="button" class="btn-share-board w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5" data-id="${board.id}">
                  <i data-lucide="share-2" class="w-3 h-3 text-emerald-600"></i> Compartilhar
                </button>
                <button type="button" class="btn-edit-board w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" data-id="${board.id}">
                  <i data-lucide="edit-3" class="w-3 h-3 text-[#173057]"></i> Editar
                </button>
                <button type="button" class="btn-delete-board w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5" data-id="${board.id}">
                  <i data-lucide="trash-2" class="w-3 h-3"></i> Excluir
                </button>
              </div>
            </div>
          ` : `
            <button type="button" class="btn-share-board p-1 text-white/80 hover:text-white rounded-lg bg-black/20 hover:bg-black/40" data-id="${board.id}" title="Compartilhar Link">
              <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
            </button>
          `}
        </div>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between bg-white">
        <div>
          <h3 class="font-title text-sm text-[#0A2334] line-clamp-1 group-hover:text-[#D75B36] transition-colors">${escapeHtml(board.title)}</h3>
          <p class="font-body text-xs text-gray-500 line-clamp-2 mt-1">${escapeHtml(board.description || 'Sem descrição.')}</p>
        </div>
        <div class="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span class="flex items-center gap-1">
            <i data-lucide="layers" class="w-3 h-3 text-[#D75B36]"></i>
            <b>${board.card_count}</b> ${board.card_count === 1 ? 'card' : 'cards'}
          </span>
          <span>${formatDate(board.created_at)}</span>
        </div>
      </div>
    `;

    // Clique no card abre o mural
    cardEl.addEventListener("click", (e) => {
      if (e.target.closest(".group\\/menu") || e.target.closest(".btn-share-board")) return;
      openBoard(board);
    });

    grid.appendChild(cardEl);
  });

  if (window.lucide) lucide.createIcons();

  // Ações de Compartilhar / Editar / Excluir Mural
  grid.querySelectorAll(".btn-share-board").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openShareModal(btn.dataset.id);
    });
  });

  grid.querySelectorAll(".btn-edit-board").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditBoardModal(btn.dataset.id);
    });
  });

  grid.querySelectorAll(".btn-delete-board").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDeleteBoard(btn.dataset.id);
    });
  });
}

// ============================================================================
// CONTROLE DE VISÃO (MODO ADMIN VS VISÃO DE USUÁRIO) E GAVETA RETRÁTIL
// ============================================================================
function isUserAdmin() {
  if (!state.user) return false;
  const isRealAdmin = !!(state.user.isAdmin || state.user.isMasterAdmin);
  if (!isRealAdmin) return false;
  return state.viewMode !== "user";
}

function toggleAdminDrawer(forceOpen) {
  const toolbar = document.getElementById("admin-sliding-toolbar");
  const chevron = document.getElementById("admin-tab-chevron");
  if (!toolbar) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !state.isAdminDrawerOpen;
  state.isAdminDrawerOpen = shouldOpen;

  if (shouldOpen) {
    toolbar.classList.remove("max-h-0", "opacity-0");
    toolbar.classList.add("max-h-96", "opacity-100");
    if (chevron) chevron.classList.add("rotate-180");
  } else {
    toolbar.classList.remove("max-h-96", "opacity-100");
    toolbar.classList.add("max-h-0", "opacity-0");
    if (chevron) chevron.classList.remove("rotate-180");
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  updateViewModeUI();

  if (mode === "admin") {
    showToast("Modo Admin ativado: ferramentas completas visíveis.", "info");
  } else {
    showToast("Visão do Usuário ativada: você está visualizando como um colaborador comum.", "info");
    // Fecha a gaveta para dar a visão limpa real do mural ao usuário
    toggleAdminDrawer(false);
  }

  // Atualiza controles na tela do mural ativo
  if (state.activeBoard) {
    const effectiveAdmin = isUserAdmin();
    const voteBadge = document.getElementById("board-view-vote-badge");
    const btnVote = document.getElementById("btn-vote-board");
    const btnStats = document.getElementById("btn-stats-board");
    const btnSettings = document.getElementById("btn-board-settings");

    const btnFabVote = document.getElementById("btn-fab-vote-board");
    if (btnFabVote) btnFabVote.classList.toggle("hidden", !state.activeBoard.vote_mode);
    if (voteBadge) voteBadge.classList.toggle("hidden", !state.activeBoard.vote_mode);

    if (btnVote) btnVote.classList.toggle("hidden", !state.activeBoard.vote_mode || !effectiveAdmin);
    if (btnStats) btnStats.classList.toggle("hidden", !state.activeBoard.vote_mode || !effectiveAdmin);

    const isOwnerOrAdmin = state.user && (state.activeBoard.created_by === state.user.email || effectiveAdmin);
    if (btnSettings) btnSettings.classList.toggle("hidden", !isOwnerOrAdmin);

    renderCardsList();
  }
}

function updateViewModeUI() {
  const btnAdmin = document.getElementById("btn-view-mode-admin");
  const btnUser = document.getElementById("btn-view-mode-user");
  const tabLabel = document.getElementById("admin-tab-label");
  const tabIcon = document.getElementById("admin-tab-icon");
  const adminTools = document.getElementById("admin-tools-group");

  if (state.viewMode === "admin") {
    if (btnAdmin) {
      btnAdmin.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold transition-all bg-[#D75B36] text-white shadow-sm flex items-center gap-1.5";
    }
    if (btnUser) {
      btnUser.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 bg-transparent";
    }
    if (tabLabel) tabLabel.textContent = "Admin";
    if (tabIcon) {
      tabIcon.setAttribute("data-lucide", "shield");
      tabIcon.className = "w-3.5 h-3.5 text-[#D75B36]";
    }
    if (adminTools) {
      adminTools.classList.remove("hidden");
    }
  } else {
    if (btnAdmin) {
      btnAdmin.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 bg-transparent";
    }
    if (btnUser) {
      btnUser.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold transition-all bg-emerald-600 text-white shadow-sm flex items-center gap-1.5";
    }
    if (tabLabel) tabLabel.textContent = "Visão Usuário";
    if (tabIcon) {
      tabIcon.setAttribute("data-lucide", "eye");
      tabIcon.className = "w-3.5 h-3.5 text-emerald-400";
    }
    if (adminTools) {
      adminTools.classList.add("hidden");
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function openBoard(board) {
  state.activeBoard = board;
  document.getElementById("view-dashboard").classList.add("hidden");
  document.getElementById("view-board").classList.remove("hidden");

  // Oculta cabeçalho superior padrão para deixar a tela do mural 100% imersiva e limpa
  const mainHeader = document.getElementById("main-app-header");
  if (mainHeader) mainHeader.classList.add("hidden");

  // Controle da gaveta retrátil de Admin
  const isRealAdmin = !!(state.user?.isAdmin || state.user?.isMasterAdmin);
  const adminWrapper = document.getElementById("admin-collapsible-wrapper");
  if (adminWrapper) {
    if (isRealAdmin) {
      adminWrapper.classList.remove("hidden");
      toggleAdminDrawer(false);
      updateViewModeUI();
    } else {
      adminWrapper.classList.add("hidden");
    }
  }

  // Atualiza query param da URL com ?board=<id> de forma transparente
  try {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("board", board.id);
    history.replaceState(null, "", newUrl.toString());
  } catch(e) {}

  // Se o usuário não for admin e acessou via link compartilhado direto, oculta botão de voltar
  const btnBack = document.getElementById("btn-back-to-dashboard");
  if (btnBack) {
    const isRestrictedNonAdmin = state.isDirectBoardAccess && !isRealAdmin;
    btnBack.classList.toggle("hidden", isRestrictedNonAdmin);
  }

  // Configurações visuais do mural ativo
  document.getElementById("board-view-icon").textContent = board.icon || "📌";
  document.getElementById("board-view-title").textContent = board.title;
  document.getElementById("board-view-desc").textContent = board.description || "";

  const voteBadge = document.getElementById("board-view-vote-badge");
  const btnFabVote = document.getElementById("btn-fab-vote-board");
  const btnVote = document.getElementById("btn-vote-board");
  const btnStats = document.getElementById("btn-stats-board");
  const btnSettings = document.getElementById("btn-board-settings");

  const effectiveAdmin = isUserAdmin();

  // Votação: Botão flutuante aparente ao lado do novo card para todos quando ativa
  if (btnFabVote) btnFabVote.classList.toggle("hidden", !board.vote_mode);
  if (voteBadge) voteBadge.classList.toggle("hidden", !board.vote_mode);

  // Apuração e Ações na gaveta admin
  if (btnVote) btnVote.classList.toggle("hidden", !board.vote_mode || !effectiveAdmin);
  if (btnStats) btnStats.classList.toggle("hidden", !board.vote_mode || !effectiveAdmin);

  const isOwnerOrAdmin = state.user && (board.created_by === state.user.email || effectiveAdmin);
  if (btnSettings) btnSettings.classList.toggle("hidden", !isOwnerOrAdmin);

  // Aplica o fundo do mural
  applyBoardBackground(board);

  // Carrega os cards do mural
  loadCards(board.id);
}

function showDashboardView() {
  state.activeBoard = null;
  state.isDirectBoardAccess = false;
  document.getElementById("view-board").classList.add("hidden");
  document.getElementById("view-dashboard").classList.remove("hidden");

  // Restaura cabeçalho superior padrão
  const mainHeader = document.getElementById("main-app-header");
  if (mainHeader) mainHeader.classList.remove("hidden");

  // Oculta a gaveta de admin
  const adminWrapper = document.getElementById("admin-collapsible-wrapper");
  if (adminWrapper) {
    adminWrapper.classList.add("hidden");
    toggleAdminDrawer(false);
  }

  // Limpa o query param ?board da URL
  try {
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("board");
    history.replaceState(null, "", newUrl.pathname);
  } catch(e) {}

  // Restaura fundo padrão
  const bgEl = document.getElementById("board-custom-bg");
  if (bgEl) {
    bgEl.style.background = "linear-gradient(135deg, #0A2334 0%, #173057 100%)";
  }

  loadBoards(true);
}

function applyBoardBackground(board) {
  const bgEl = document.getElementById("board-custom-bg");
  if (!bgEl) return;

  if (board.background_type === "gradient" || board.background_type === "color") {
    bgEl.style.background = board.background_value || "linear-gradient(135deg, #0A2334 0%, #173057 100%)";
  } else if (board.background_type === "image" && board.background_value) {
    bgEl.style.background = `url('${board.background_value}') center/cover no-repeat fixed`;
  } else {
    bgEl.style.background = "linear-gradient(135deg, #0A2334 0%, #173057 100%)";
  }
}

function openNewBoardModal() {
  state.editingBoardId = null;
  const form = document.getElementById("form-board");
  if (form) form.reset();

  document.getElementById("modal-board-title").textContent = "Criar Novo Mural";
  document.getElementById("board-id-hidden").value = "";
  document.getElementById("board-icon-input").value = "📌";
  document.getElementById("board-icon-current").textContent = "📌";

  document.getElementById("bg-type-gradient").checked = true;
  handleBackgroundTypeChange("gradient");
  selectGradientPreset(AZ_GRADIENTS[0].value);

  openModal("modal-board");
}

function openEditBoardModal(boardId) {
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;

  state.editingBoardId = boardId;
  document.getElementById("modal-board-title").textContent = "Configurações do Mural";
  document.getElementById("board-id-hidden").value = board.id;
  document.getElementById("board-title-input").value = board.title || "";
  document.getElementById("board-desc-input").value = board.description || "";
  document.getElementById("board-icon-current").textContent = board.icon || "📌";
  document.getElementById("board-icon-input").value = board.icon || "📌";
  document.getElementById("board-vote-mode-toggle").checked = !!board.vote_mode;

  const bgType = board.background_type || "gradient";
  const radio = document.querySelector(`input[name="board_bg_type"][value="${bgType}"]`);
  if (radio) radio.checked = true;
  handleBackgroundTypeChange(bgType);

  if (bgType === "gradient") selectGradientPreset(board.background_value);
  else if (bgType === "color") selectSolidColorPreset(board.background_value);
  else if (bgType === "image") document.getElementById("board-bg-image-url").value = board.background_value || "";

  openModal("modal-board");
}

async function handleBoardFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("board-id-hidden").value;
  const title = document.getElementById("board-title-input").value.trim();
  const desc = document.getElementById("board-desc-input").value.trim();
  const icon = document.getElementById("board-icon-input").value || "📌";
  const voteMode = document.getElementById("board-vote-mode-toggle").checked;

  const bgType = document.querySelector('input[name="board_bg_type"]:checked')?.value || "gradient";
  let bgValue = "";
  if (bgType === "gradient" || bgType === "color") {
    bgValue = document.getElementById("board-bg-value-hidden").value;
  } else {
    bgValue = document.getElementById("board-bg-image-url").value.trim();
  }

  showLoader(true);
  try {
      if (id) {
        // Edição
        const { error } = await supabaseClient.from("boards").update({
          title: title,
          description: desc,
          icon: icon,
          vote_mode: voteMode,
          background_type: bgType,
          background_value: bgValue
        }).eq("id", id);
        if (error) throw error;

        // Atualização instantânea na tela do mural ativo
        if (state.activeBoard && state.activeBoard.id === id) {
          state.activeBoard.title = title;
          state.activeBoard.description = desc;
          state.activeBoard.icon = icon;
          state.activeBoard.vote_mode = voteMode;
          state.activeBoard.background_type = bgType;
          state.activeBoard.background_value = bgValue;

          document.getElementById("board-view-icon").textContent = icon;
          document.getElementById("board-view-title").textContent = title;
          document.getElementById("board-view-desc").textContent = desc;
          applyBoardBackground(state.activeBoard);
        }
        showToast("Mural atualizado com sucesso!", "success");
      } else {
        // Criação
        const { data, error } = await supabaseClient.from("boards").insert([{
          title: title,
          description: desc,
          icon: icon,
          vote_mode: voteMode,
          background_type: bgType,
          background_value: bgValue,
          created_by: state.user?.email || MASTER_ADMIN
        }]).select().single();
        if (error) throw error;
        showToast("Mural criado com sucesso!", "success");
        if (data) {
          openBoard(data);
          setTimeout(() => {
            openShareModal(data.id);
          }, 500);
        }
      }

    closeModal("modal-board");
    await loadBoards(true);
  } catch (err) {
    showToast("Erro ao salvar mural: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

async function confirmDeleteBoard(boardId) {
  if (!confirm("Tem certeza que deseja excluir este mural e todos os seus cards e votos? Esta ação não pode ser desfeita.")) return;

  showLoader(true);
  try {
    const { error } = await supabaseClient.from("boards").delete().eq("id", boardId);
    if (error) throw error;
    showToast("Mural excluído!", "info");
    if (state.activeBoard?.id === boardId) {
      showDashboardView();
    } else {
      await loadBoards(true);
    }
  } catch (err) {
    showToast("Erro ao excluir mural: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// ============================================================================
// GESTÃO DE CARDS (POSTAGENS DO MURAL)
// ============================================================================
async function loadCards(boardId, isSilent = false) {
  if (!isSilent) showLoader(true);
  try {
    const { data: cards, error } = await supabaseClient
      .from("cards")
      .select("*, votes(id, voter_email), comments(id)")
      .eq("board_id", boardId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!isSilent) showLoader(false);
    if (error) throw error;

    state.cards = (cards || []).map(c => {
      const userVoted = state.user && c.votes ? c.votes.some(v => (v.voter_email || v.user_email) === state.user.email) : false;
      return {
        ...c,
        vote_count: c.votes ? c.votes.length : 0,
        comment_count: c.comments ? c.comments.length : 0,
        has_voted: userVoted
      };
    });

    renderCardsList();
  } catch (err) {
    if (!isSilent) showLoader(false);
    console.error("Erro ao carregar cards:", err);
  }
}

function renderCardsList() {
  const container = document.getElementById("board-cards-container");
  const empty = document.getElementById("empty-cards-msg");
  if (!container) return;

  container.innerHTML = "";

  // Filtro de busca
  let list = [...state.cards];
  if (state.currentSearch) {
    const q = state.currentSearch.toLowerCase();
    list = list.filter(c => 
      (c.title || "").toLowerCase().includes(q) ||
      (c.content || "").toLowerCase().includes(q) ||
      (c.author_name || "").toLowerCase().includes(q)
    );
  }

  // Ordenação
  const sortMode = document.getElementById("board-sort-select")?.value || "recent";
  if (sortMode === "alphabetical") {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  if (list.length === 0) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  list.forEach(card => {
    const isOwner = state.user && card.author_email === state.user.email;
    const isAdmin = isUserAdmin();
    const isOwnerOrAdmin = isOwner || isAdmin;
    const themeClass = `card-theme-${card.card_color || card.color_theme || 'white'}`;

    const cardEl = document.createElement("div");
    cardEl.className = `masonry-item glass-card ${themeClass} rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative group animate-fade-in`;

    // Renderização de Mídia (Foto ou Vídeo)
    let mediaHtml = "";
    if (card.media_type === "image" && card.media_url) {
      mediaHtml = `
        <div class="mt-3 rounded-xl overflow-hidden cursor-pointer max-h-72 bg-black/5 flex items-center justify-center btn-zoom-media" data-url="${card.media_url}">
          <img src="${card.media_url}" class="w-full h-auto object-cover max-h-72 hover:scale-105 transition-transform duration-300" loading="lazy" alt="${escapeHtml(card.title)}">
        </div>
      `;
    } else if (card.media_type === "youtube" && card.media_url) {
      const ytId = extractYouTubeId(card.media_url);
      if (ytId) {
        mediaHtml = `
          <div class="mt-3 rounded-xl overflow-hidden aspect-video bg-black">
            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        `;
      }
    } else if (card.media_type === "video" && card.media_url) {
      mediaHtml = `
        <div class="mt-3 rounded-xl overflow-hidden aspect-video bg-black/10 flex items-center justify-center">
          <a href="${card.media_url}" target="_blank" class="px-3 py-2 bg-white rounded-xl text-xs font-subtitle-semibold text-[#0A2334] shadow flex items-center gap-1.5 hover:bg-gray-50">
            <i data-lucide="play-circle" class="w-4 h-4 text-[#D75B36]"></i> Assistir no Google Drive
          </a>
        </div>
      `;
    }

    cardEl.innerHTML = `
      <!-- Cabeçalho do Card -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          ${(card.pinned || card.is_pinned) ? '<i data-lucide="pin" class="w-3.5 h-3.5 text-[#D75B36] flex-shrink-0 fill-[#D75B36]"></i>' : ''}
          <h4 class="font-title text-sm text-[#0A2334] leading-snug font-semibold">${escapeHtml(card.title)}</h4>
        </div>
        ${isOwnerOrAdmin ? `
          <div class="relative group/menu">
            <button type="button" class="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
              <i data-lucide="more-horizontal" class="w-4 h-4"></i>
            </button>
            <div class="hidden group-hover/menu:block absolute right-0 top-6 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
              ${isAdmin ? `
                <button type="button" class="btn-pin-card w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" data-id="${card.id}" data-pinned="${card.pinned || card.is_pinned}">
                  <i data-lucide="pin" class="w-3 h-3 text-[#D75B36]"></i> ${(card.pinned || card.is_pinned) ? 'Desafixar' : 'Fixar no Topo'}
                </button>
              ` : ''}
              <button type="button" class="btn-edit-card w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5" data-id="${card.id}">
                <i data-lucide="edit-3" class="w-3 h-3 text-[#173057]"></i> Editar
              </button>
              <button type="button" class="btn-delete-card w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5" data-id="${card.id}">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Excluir
              </button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Conteúdo de Texto -->
      ${card.content ? `<p class="font-body text-xs text-gray-700 mt-2 whitespace-pre-line leading-relaxed">${escapeHtml(card.content)}</p>` : ''}

      <!-- Mídia -->
      ${mediaHtml}

      <!-- Rodapé do Card (Autor e Comentários) -->
      <div class="pt-3 mt-3 border-t border-gray-100/80 flex items-center justify-between text-[11px] text-gray-400">
        <div class="flex items-center gap-1.5 line-clamp-1">
          <div class="w-5 h-5 rounded-full bg-[#173057] text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0">
            ${(card.author_name || "A").charAt(0).toUpperCase()}
          </div>
          <span class="font-body-medium text-gray-600 truncate">${escapeHtml(card.author_name || 'Colaborador')}</span>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Comentários -->
          <button type="button" class="btn-open-comments flex items-center gap-1.5 text-gray-500 hover:text-[#0A2334] px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all" data-id="${card.id}" title="Ver Comentários">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-[#D75B36]"></i>
            <span class="font-subtitle-semibold text-xs text-gray-600">${card.comment_count}</span>
          </button>
        </div>
      </div>
    `;

    container.appendChild(cardEl);
  });

  if (window.lucide) lucide.createIcons();

  // Ações nos Cards
  container.querySelectorAll(".btn-zoom-media").forEach(el => {
    el.addEventListener("click", () => openMediaZoom(el.dataset.url));
  });

  container.querySelectorAll(".btn-open-comments").forEach(btn => {
    btn.addEventListener("click", () => openCommentsModal(btn.dataset.id));
  });

  container.querySelectorAll(".btn-pin-card").forEach(btn => {
    btn.addEventListener("click", () => togglePinCard(btn.dataset.id, btn.dataset.pinned === "true"));
  });

  container.querySelectorAll(".btn-edit-card").forEach(btn => {
    btn.addEventListener("click", () => openEditCardModal(btn.dataset.id));
  });

  container.querySelectorAll(".btn-delete-card").forEach(btn => {
    btn.addEventListener("click", () => confirmDeleteCard(btn.dataset.id));
  });
}

function openNewCardModal() {
  state.editingCardId = null;
  state.pendingMediaFile = null;
  const form = document.getElementById("form-card");
  if (form) form.reset();

  document.getElementById("modal-card-title").textContent = "Novo Card";
  document.getElementById("card-id-hidden").value = "";
  document.getElementById("card-color-hidden").value = "white";
  selectCardColor("white");

  // Apenas Administradores podem fixar no topo
  const isAdmin = isUserAdmin();
  const pinContainer = document.getElementById("card-pinned-container");
  if (pinContainer) pinContainer.classList.toggle("hidden", !isAdmin);
  const pinToggle = document.getElementById("card-pinned-toggle");
  if (pinToggle) pinToggle.checked = false;

  document.getElementById("card-upload-box").classList.add("hidden");
  document.getElementById("card-youtube-box").classList.add("hidden");
  document.getElementById("card-media-preview-container").classList.add("hidden");
  document.getElementById("card-media-preview").innerHTML = "";

  openModal("modal-card");
}

function openEditCardModal(cardId) {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  state.editingCardId = cardId;
  state.pendingMediaFile = null;
  document.getElementById("modal-card-title").textContent = "Editar Card";
  document.getElementById("card-id-hidden").value = card.id;
  document.getElementById("card-title-input").value = card.title || "";
  document.getElementById("card-content-input").value = card.content || "";

  // Apenas Administradores podem fixar no topo
  const isAdmin = isUserAdmin();
  const pinContainer = document.getElementById("card-pinned-container");
  if (pinContainer) pinContainer.classList.toggle("hidden", !isAdmin);
  const pinToggle = document.getElementById("card-pinned-toggle");
  if (pinToggle) pinToggle.checked = !!(card.pinned || card.is_pinned);

  const type = card.media_type || "text";
  const radio = document.querySelector(`input[name="card_type"][value="${type}"]`);
  if (radio) radio.checked = true;
  handleCardTypeChange(type);

  if (type === "youtube" || type === "video") {
    document.getElementById("card-youtube-url-input").value = card.media_url || "";
  } else if (type === "image" && card.media_url) {
    document.getElementById("card-media-preview-container").classList.remove("hidden");
    document.getElementById("card-media-preview").innerHTML = `<img src="${card.media_url}" class="max-h-36 object-contain rounded">`;
  }

  selectCardColor(card.card_color || card.color_theme || "white");
  openModal("modal-card");
}

async function handleCardFormSubmit(e) {
  e.preventDefault();
  if (!state.activeBoard) return;

  const id = document.getElementById("card-id-hidden").value;
  const title = document.getElementById("card-title-input").value.trim();
  const content = document.getElementById("card-content-input").value.trim();
  const color = document.getElementById("card-color-hidden").value || "white";

  // Apenas administradores podem definir/alterar o estado de fixado no topo
  const isAdmin = isUserAdmin();
  let isPinned = false;
  if (isAdmin) {
    isPinned = document.getElementById("card-pinned-toggle")?.checked || false;
  } else if (id) {
    const existing = state.cards.find(c => c.id === id);
    isPinned = existing ? !!(existing.pinned || existing.is_pinned) : false;
  }

  const mediaType = document.querySelector('input[name="card_type"]:checked')?.value || "text";

  let mediaUrl = "";

  showLoader(true);

  try {
    // 1. Upload de Foto direto para o Supabase Storage (se houver arquivo novo selecionado)
    if (mediaType === "image") {
      if (state.pendingMediaFile) {
        mediaUrl = await uploadImageToSupabaseStorage(state.pendingMediaFile);
      } else if (id) {
        const existing = state.cards.find(c => c.id === id);
        mediaUrl = existing ? existing.media_url : "";
      }
    } else if (mediaType === "youtube" || mediaType === "video") {
      mediaUrl = document.getElementById("card-youtube-url-input").value.trim();
    }

    // 2. Gravação no Banco PostgreSQL
    if (id) {
      // Edição
      const updatePayload = {
        title: title,
        content: content,
        card_color: color,
        pinned: isPinned,
        media_type: mediaType
      };
      if (mediaUrl) updatePayload.media_url = mediaUrl;

      const { error } = await supabaseClient.from("cards").update(updatePayload).eq("id", id);
      if (error) throw error;
      showToast("Card atualizado!", "success");
    } else {
      // Criação
      const { error } = await supabaseClient.from("cards").insert([{
        board_id: state.activeBoard.id,
        title: title,
        content: content,
        card_color: color,
        pinned: isPinned,
        media_type: mediaType,
        media_url: mediaUrl,
        author_name: state.user?.name || "Colaborador",
        author_email: state.user?.email || MASTER_ADMIN
      }]);
      if (error) throw error;
      showToast("Card criado no mural!", "success");
    }

    closeModal("modal-card");
    await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao salvar card: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// Upload direto para o bucket board-media do Supabase Storage
async function uploadImageToSupabaseStorage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const progressBar = document.getElementById("card-upload-progress-bar");
  const progressBox = document.getElementById("card-file-upload-progress");
  if (progressBox) progressBox.classList.remove("hidden");
  if (progressBar) progressBar.style.width = "45%";

  const { data, error } = await supabaseClient.storage
    .from("board-media")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (progressBar) progressBar.style.width = "100%";
  setTimeout(() => { if (progressBox) progressBox.classList.add("hidden"); }, 500);

  if (error) {
    console.error("Erro no Supabase Storage:", error);
    throw new Error("Falha no upload da foto: " + error.message);
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("board-media")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

async function togglePinCard(cardId, currentPinned) {
  if (!state.user?.isAdmin && !state.user?.isMasterAdmin) {
    showToast("Apenas administradores podem fixar cards no topo.", "error");
    return;
  }
  try {
    const { error } = await supabaseClient.from("cards").update({ pinned: !currentPinned }).eq("id", cardId);
    if (error) throw error;
    showToast(!currentPinned ? "Card fixado no topo!" : "Card desafixado!", "info");
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao atualizar card: " + err.message, "error");
  }
}

async function confirmDeleteCard(cardId) {
  if (!confirm("Excluir este card do mural?")) return;
  showLoader(true);
  try {
    const { error } = await supabaseClient.from("cards").delete().eq("id", cardId);
    if (error) throw error;
    showToast("Card excluído!", "info");
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao excluir card: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// ============================================================================
// SISTEMA DE VOTOS E CURTIDAS
// ============================================================================
async function handleCardVoteClick(cardId) {
  if (!state.user) {
    showToast("Você precisa estar logado para votar!", "error");
    return;
  }

  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;

  try {
    if (card.has_voted) {
      // Remove voto
      await supabaseClient.from("votes").delete().match({ card_id: cardId, voter_email: state.user.email });
      showToast("Voto removido!", "info");
    } else {
      // Adiciona voto
      await supabaseClient.from("votes").insert([{ board_id: state.activeBoard.id, card_id: cardId, voter_email: state.user.email }]);
      showToast("Voto registrado com sucesso!", "success");
    }
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao registrar voto: " + err.message, "error");
  }
}

function openVotingModal() {
  if (!state.user) {
    showToast("Faça login para votar.", "error");
    return;
  }
  if (!state.activeBoard?.vote_mode) {
    showToast("A votação não está ativa neste mural.", "info");
    return;
  }

  const container = document.getElementById("vote-options-list");
  if (!container || !state.cards) return;

  container.innerHTML = "";

  state.cards.forEach(card => {
    const authorInitial = (card.author_name || "A").charAt(0).toUpperCase();
    const opt = document.createElement("label");
    opt.className = "flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer transition-all";
    opt.innerHTML = `
      <input type="radio" name="vote_selected_card" value="${card.id}" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="font-title text-xs text-[#0A2334] font-semibold truncate">${escapeHtml(card.title)}</p>
          <span class="inline-flex items-center gap-1.5 text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-lg border border-gray-200 flex-shrink-0 shadow-xs">
            <span class="w-4 h-4 rounded-full bg-[#173057] text-white flex items-center justify-center font-bold text-[8px]">${authorInitial}</span>
            <span class="font-body-medium text-gray-700 truncate max-w-[120px]">${escapeHtml(card.author_name || 'Colaborador')}</span>
          </span>
        </div>
        <p class="font-body text-[11px] text-gray-500 line-clamp-1 mt-1">${escapeHtml(card.content || 'Sem descrição')}</p>
      </div>
    `;
    container.appendChild(opt);
  });

  openModal("modal-vote");
}

async function submitEnqueteVote() {
  if (!state.user) {
    showToast("Faça login para votar.", "error");
    return;
  }
  if (!state.activeBoard?.vote_mode) {
    showToast("A votação não está ativa neste mural.", "info");
    return;
  }

  const selected = document.querySelector('input[name="vote_selected_card"]:checked')?.value;
  if (!selected) {
    showToast("Selecione um card para votar!", "error");
    return;
  }

  showLoader(true);
  try {
    // Remove votos anteriores do usuário neste mural para garantir voto único na enquete
    const cardIds = state.cards.map(c => c.id);
    await supabaseClient.from("votes").delete().match({ board_id: state.activeBoard.id, voter_email: state.user.email });

    // Insere o novo voto
    const { error } = await supabaseClient.from("votes").insert([{
      board_id: state.activeBoard.id,
      card_id: selected,
      voter_email: state.user.email
    }]);
    if (error) throw error;

    closeModal("modal-vote");
    showToast("Seu voto oficial na enquete foi confirmado!", "success");
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao confirmar voto: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// Apuração de Votos & Gráfico Chart.js (Exclusivo Administrador)
function openAdminVoteStatsModal() {
  if (!state.user?.isAdmin && !state.user?.isMasterAdmin) {
    showToast("Apenas administradores têm acesso à apuração dos votos.", "error");
    return;
  }
  renderVoteStats();
  openModal("modal-vote-stats");
}

function renderVoteStats() {
  const canvas = document.getElementById("vote-chart-canvas");
  const rankingsContainer = document.getElementById("vote-rankings-table");
  if (!canvas || !state.cards) return;

  // Ordenar por votos
  const sorted = [...state.cards].sort((a, b) => b.vote_count - a.vote_count);
  const labels = sorted.slice(0, 8).map(c => c.title.length > 20 ? c.title.substring(0, 18) + '...' : c.title);
  const data = sorted.slice(0, 8).map(c => c.vote_count);

  if (state.voteChartInstance) {
    state.voteChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  state.voteChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Votos Recebidos",
        data: data,
        backgroundColor: "#D75B36",
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });

  // Tabela de Ranking
  if (rankingsContainer) {
    rankingsContainer.innerHTML = "";
    sorted.forEach((card, idx) => {
      const authorInitial = (card.author_name || "A").charAt(0).toUpperCase();
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs";
      row.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-5 h-5 rounded-full ${idx === 0 ? 'bg-amber-400 text-amber-900 font-bold' : 'bg-gray-200 text-gray-700'} flex items-center justify-center text-[10px] flex-shrink-0">
            ${idx + 1}º
          </span>
          <div class="min-w-0">
            <span class="font-body-semibold text-gray-800 line-clamp-1">${escapeHtml(card.title)}</span>
            <div class="flex items-center gap-1 text-[10px] text-gray-400 font-body mt-0.5">
              <span class="w-3.5 h-3.5 rounded-full bg-[#173057] text-white flex items-center justify-center font-bold text-[8px] flex-shrink-0">${authorInitial}</span>
              <span class="truncate">Por: ${escapeHtml(card.author_name || 'Colaborador')}</span>
            </div>
          </div>
        </div>
        <span class="font-title text-[#D75B36] font-bold text-xs flex-shrink-0 bg-white px-2 py-0.5 rounded-lg border border-gray-100">${card.vote_count} ${card.vote_count === 1 ? 'voto' : 'votos'}</span>
      `;
      rankingsContainer.appendChild(row);
    });
  }
}

function exportVoteChartImage() {
  const canvas = document.getElementById("vote-chart-canvas");
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `apuracao_mural_${state.activeBoard?.title || 'az_board'}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("Gráfico exportado como PNG!", "success");
}

function exportVotesCSV() {
  if (!state.cards) return;
  let csv = "Posicao,Titulo do Card,Autor,Votos\n";
  const sorted = [...state.cards].sort((a, b) => b.vote_count - a.vote_count);
  sorted.forEach((c, idx) => {
    csv += `"${idx + 1}","${c.title.replace(/"/g, '""')}","${c.author_name || ''}","${c.vote_count}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `votos_${state.activeBoard?.title || 'mural'}.csv`;
  link.click();
  showToast("CSV de apuração exportado!", "success");
}

// ============================================================================
// COMENTÁRIOS DO CARD
// ============================================================================
async function openCommentsModal(cardId) {
  state.activeCardForComments = cardId;
  const card = state.cards.find(c => c.id === cardId);
  const titleEl = document.getElementById("modal-comments-card-title");
  if (titleEl && card) titleEl.textContent = `Comentários: ${card.title}`;

  await loadComments(cardId);
  openModal("modal-comments");
}

async function loadComments(cardId, isSilent = false) {
  try {
    const { data: comments, error } = await supabaseClient
      .from("comments")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    state.comments = comments || [];
    renderCommentsList();
  } catch (err) {
    console.error("Erro ao carregar comentários:", err);
  }
}

function renderCommentsList() {
  const container = document.getElementById("comments-list");
  if (!container) return;
  container.innerHTML = "";

  if (state.comments.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-gray-400 py-6">Nenhum comentário ainda. Seja o primeiro a comentar!</p>`;
    return;
  }

  state.comments.forEach(c => {
    const isOwner = state.user && (c.author_email === state.user.email || state.user.isAdmin || state.user.isMasterAdmin);
    const item = document.createElement("div");
    item.className = "p-3 bg-white rounded-xl border border-gray-100 shadow-sm text-xs";
    item.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 rounded-full bg-[#173057] text-white flex items-center justify-center font-bold text-[9px]">
            ${(c.author_name || "A").charAt(0).toUpperCase()}
          </div>
          <span class="font-body-semibold text-gray-700">${escapeHtml(c.author_name || 'Colaborador')}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-[10px] text-gray-400">${formatDate(c.created_at)}</span>
          ${isOwner ? `
            <button type="button" class="btn-delete-comment p-1 text-gray-300 hover:text-red-500" data-id="${c.id}" title="Excluir">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
          ` : ''}
        </div>
      </div>
      <p class="font-body text-gray-600 pl-6 leading-relaxed">${escapeHtml(c.comment_text || c.content)}</p>
    `;
    container.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();

  container.querySelectorAll(".btn-delete-comment").forEach(btn => {
    btn.addEventListener("click", () => confirmDeleteComment(btn.dataset.id));
  });

  container.scrollTop = container.scrollHeight;
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("comment-input");
  const content = input?.value.trim();
  if (!content || !state.activeCardForComments) return;

  try {
    const { error } = await supabaseClient.from("comments").insert([{
      card_id: state.activeCardForComments,
      comment_text: content,
      author_name: state.user?.name || "Colaborador",
      author_email: state.user?.email || MASTER_ADMIN
    }]);
    if (error) throw error;
    input.value = "";
    await loadComments(state.activeCardForComments, true);
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao enviar comentário: " + err.message, "error");
  }
}

async function confirmDeleteComment(commentId) {
  if (!confirm("Excluir este comentário?")) return;
  try {
    const { error } = await supabaseClient.from("comments").delete().eq("id", commentId);
    if (error) throw error;
    if (state.activeCardForComments) await loadComments(state.activeCardForComments, true);
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao excluir comentário: " + err.message, "error");
  }
}

// ============================================================================
// EXPORTAÇÃO DO MURAL EM IMAGEM (PNG)
// ============================================================================
async function exportBoardToPNG() {
  const target = document.getElementById("board-export-area");
  if (!target || !window.html2canvas) return;

  showToast("Gerando imagem do mural...", "info");
  showLoader(true);

  try {
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null
    });

    const link = document.createElement("a");
    link.download = `AZ_Board_${state.activeBoard?.title || 'Mural'}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Mural exportado com sucesso!", "success");
  } catch (err) {
    showToast("Erro ao exportar imagem: " + err.message, "error");
  } finally {
    showLoader(false);
  }
}

// ============================================================================
// HELPERS DE UI, MODAIS, CORES E EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Autenticação
  document.getElementById("btn-login-google")?.addEventListener("click", signInWithGoogle);
  document.getElementById("btn-login-dev")?.addEventListener("click", devTestLogin);
  document.getElementById("btn-logout")?.addEventListener("click", signOut);
  document.getElementById("btn-logout-drawer")?.addEventListener("click", signOut);

  // Gaveta Retrátil de Admin & Alternador de Visão
  document.getElementById("btn-admin-tab-toggle")?.addEventListener("click", () => toggleAdminDrawer());
  document.getElementById("btn-view-mode-admin")?.addEventListener("click", () => setViewMode("admin"));
  document.getElementById("btn-view-mode-user")?.addEventListener("click", () => setViewMode("user"));
  document.getElementById("btn-manage-admins-drawer")?.addEventListener("click", openAdminManagementModal);

  // Navegação
  document.getElementById("header-logo-home")?.addEventListener("click", showDashboardView);
  document.getElementById("btn-back-to-dashboard")?.addEventListener("click", showDashboardView);

  // Criação de Mural
  document.getElementById("btn-create-board-hero")?.addEventListener("click", openNewBoardModal);
  document.getElementById("btn-create-board-empty")?.addEventListener("click", openNewBoardModal);
  document.getElementById("btn-board-settings")?.addEventListener("click", () => {
    if (state.activeBoard) openEditBoardModal(state.activeBoard.id);
  });

  // Criação de Card & Votação Flutuante
  document.getElementById("btn-add-card-header")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-add-card-empty")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-fab-add-card")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-fab-vote-board")?.addEventListener("click", openVotingModal);

  // Ações do Mural
  document.getElementById("btn-vote-board")?.addEventListener("click", openVotingModal);
  document.getElementById("btn-submit-vote")?.addEventListener("click", submitEnqueteVote);
  document.getElementById("btn-stats-board")?.addEventListener("click", openAdminVoteStatsModal);
  document.getElementById("btn-export-png")?.addEventListener("click", exportBoardToPNG);
  document.getElementById("btn-export-chart-img")?.addEventListener("click", exportVoteChartImage);
  document.getElementById("btn-export-votes-csv")?.addEventListener("click", exportVotesCSV);
  document.getElementById("btn-manage-admins")?.addEventListener("click", openAdminManagementModal);

  // Filtros & Ordenação
  document.getElementById("global-search-input")?.addEventListener("input", (e) => {
    state.currentSearch = e.target.value.trim();
    if (state.activeBoard) renderCardsList();
  });
  document.getElementById("board-search-input")?.addEventListener("input", (e) => {
    state.currentSearch = e.target.value.trim();
    if (state.activeBoard) renderCardsList();
  });
  document.getElementById("board-sort-select")?.addEventListener("change", () => {
    if (state.activeBoard) renderCardsList();
  });

  // Formulários
  document.getElementById("form-card")?.addEventListener("submit", handleCardFormSubmit);
  document.getElementById("form-board")?.addEventListener("submit", handleBoardFormSubmit);
  document.getElementById("form-comment")?.addEventListener("submit", handleCommentSubmit);
  document.getElementById("form-add-admin")?.addEventListener("submit", handleAddAdmin);

  // Upload e Seleção de Mídia do Card
  document.querySelectorAll('input[name="card_type"]').forEach(r => {
    r.addEventListener("change", (e) => handleCardTypeChange(e.target.value));
  });

  document.getElementById("btn-trigger-file")?.addEventListener("click", () => {
    document.getElementById("card-file-input")?.click();
  });

  document.getElementById("card-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.pendingMediaFile = file;

    const reader = new FileReader();
    reader.onload = (evt) => {
      document.getElementById("card-media-preview-container")?.classList.remove("hidden");
      document.getElementById("card-media-preview").innerHTML = `<img src="${evt.target.result}" class="max-h-36 object-contain rounded">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("btn-clear-media-preview")?.addEventListener("click", () => {
    state.pendingMediaFile = null;
    document.getElementById("card-file-input").value = "";
    document.getElementById("card-media-preview-container")?.classList.add("hidden");
    document.getElementById("card-media-preview").innerHTML = "";
  });

  // Seletor de Cores do Card (Post-it)
  document.querySelectorAll(".card-color-btn").forEach(btn => {
    btn.addEventListener("click", () => selectCardColor(btn.dataset.color));
  });

  // Tipos de Fundo do Mural
  document.querySelectorAll('input[name="board_bg_type"]').forEach(r => {
    r.addEventListener("change", (e) => handleBackgroundTypeChange(e.target.value));
  });

  // Upload e URL de Imagem de Fundo do Mural
  document.getElementById("btn-upload-board-bg")?.addEventListener("click", () => {
    document.getElementById("board-bg-file-input")?.click();
  });

  document.getElementById("board-bg-file-input")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) uploadBoardBackgroundToStorage(file);
  });

  document.getElementById("board-bg-image-url")?.addEventListener("input", (e) => {
    updateLiveBackgroundPreview("image", e.target.value.trim());
  });

  // Compartilhamento de Mural
  document.getElementById("btn-share-board-header")?.addEventListener("click", () => {
    if (state.activeBoard) openShareModal(state.activeBoard.id);
  });
  document.getElementById("btn-share-board-canvas")?.addEventListener("click", () => {
    if (state.activeBoard) openShareModal(state.activeBoard.id);
  });
  document.getElementById("btn-copy-share-url")?.addEventListener("click", handleCopyShareUrl);

  document.getElementById("btn-open-icon-picker")?.addEventListener("click", () => {
    openModal("modal-icon-picker");
  });

  // Fechamento genérico de modais
  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modal;
      if (modalId) {
        closeModal(modalId);
        // Se cancelou a edição de fundo do mural, restaura o fundo original ativo
        if (modalId === "modal-board" && state.activeBoard) {
          applyBoardBackground(state.activeBoard);
        }
      }
    });
  });
}

function handleCardTypeChange(type) {
  const uploadBox = document.getElementById("card-upload-box");
  const youtubeBox = document.getElementById("card-youtube-box");
  if (uploadBox) uploadBox.classList.toggle("hidden", type !== "image");
  if (youtubeBox) youtubeBox.classList.toggle("hidden", type !== "youtube" && type !== "video");
}

function selectCardColor(color) {
  document.getElementById("card-color-hidden").value = color;
  document.querySelectorAll(".card-color-btn").forEach(btn => {
    btn.classList.toggle("ring-2", btn.dataset.color === color);
    btn.classList.toggle("ring-[#D75B36]", btn.dataset.color === color);
  });
}

function handleBackgroundTypeChange(type) {
  document.getElementById("bg-presets-gradient")?.classList.toggle("hidden", type !== "gradient");
  document.getElementById("bg-presets-color")?.classList.toggle("hidden", type !== "color");
  document.getElementById("bg-custom-image")?.classList.toggle("hidden", type !== "image");

  if (type === "gradient") {
    const val = document.getElementById("board-bg-value-hidden").value || AZ_GRADIENTS[0].value;
    updateLiveBackgroundPreview("gradient", val);
  } else if (type === "color") {
    const val = document.getElementById("board-bg-value-hidden").value || AZ_SOLID_COLORS[0].value;
    updateLiveBackgroundPreview("color", val);
  } else if (type === "image") {
    const val = document.getElementById("board-bg-image-url")?.value.trim();
    updateLiveBackgroundPreview("image", val);
  }
}

function renderGradientsList() {
  const container = document.getElementById("bg-presets-gradient");
  if (!container) return;
  container.innerHTML = "";

  AZ_GRADIENTS.forEach((g) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "p-2 rounded-xl border border-gray-200 bg-white hover:border-[#D75B36] transition-all flex items-center gap-2 text-left group gradient-item";
    item.dataset.value = g.value;
    item.innerHTML = `
      <div class="w-6 h-6 rounded-lg shadow-sm flex-shrink-0 flex items-center justify-center text-white" style="background: ${g.value}">
        <i data-lucide="check" class="w-3.5 h-3.5 opacity-0 check-icon"></i>
      </div>
      <span class="text-[11px] font-body-semibold text-gray-700 group-hover:text-[#D75B36] truncate leading-tight">${g.name}</span>
    `;
    item.addEventListener("click", () => selectGradientPreset(g.value));
    container.appendChild(item);
  });
  if (window.lucide) lucide.createIcons();
}

function selectGradientPreset(value) {
  document.getElementById("board-bg-value-hidden").value = value;
  updateLiveBackgroundPreview("gradient", value);

  document.querySelectorAll(".gradient-item").forEach(el => {
    const match = el.dataset.value === value;
    el.classList.toggle("border-[#D75B36]", match);
    el.classList.toggle("bg-[#FFF8F5]", match);
    el.classList.toggle("ring-1", match);
    el.classList.toggle("ring-[#D75B36]", match);
    const icon = el.querySelector(".check-icon");
    if (icon) icon.classList.toggle("opacity-0", !match);
  });
}

function renderSolidColorsList() {
  const container = document.getElementById("bg-presets-color");
  if (!container) return;
  container.innerHTML = "";

  AZ_SOLID_COLORS.forEach(c => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "p-2 rounded-xl border border-gray-200 bg-white hover:border-[#D75B36] transition-all flex items-center gap-2 text-left group solid-item";
    item.dataset.value = c.value;
    item.innerHTML = `
      <div class="w-6 h-6 rounded-lg shadow-sm flex-shrink-0 flex items-center justify-center text-white" style="background-color: ${c.value}">
        <i data-lucide="check" class="w-3.5 h-3.5 opacity-0 check-icon"></i>
      </div>
      <span class="text-[11px] font-body-semibold text-gray-700 group-hover:text-[#D75B36] truncate leading-tight">${c.name}</span>
    `;
    item.addEventListener("click", () => selectSolidColorPreset(c.value));
    container.appendChild(item);
  });
  if (window.lucide) lucide.createIcons();
}

function selectSolidColorPreset(value) {
  document.getElementById("board-bg-value-hidden").value = value;
  updateLiveBackgroundPreview("color", value);

  document.querySelectorAll(".solid-item").forEach(el => {
    const match = el.dataset.value === value;
    el.classList.toggle("border-[#D75B36]", match);
    el.classList.toggle("bg-[#FFF8F5]", match);
    el.classList.toggle("ring-1", match);
    el.classList.toggle("ring-[#D75B36]", match);
    const icon = el.querySelector(".check-icon");
    if (icon) icon.classList.toggle("opacity-0", !match);
  });
}

// Atualização instantânea e automática do fundo na tela e no preview
function updateLiveBackgroundPreview(type, value) {
  const previewBox = document.getElementById("board-bg-preview-box");
  const bgEl = document.getElementById("board-custom-bg");

  let cssBg = "";
  if (type === "gradient" || type === "color") {
    cssBg = value || "linear-gradient(135deg, #0A2334 0%, #173057 100%)";
  } else if (type === "image" && value) {
    cssBg = `url('${value}') center/cover no-repeat`;
  } else {
    cssBg = "linear-gradient(135deg, #0A2334 0%, #173057 100%)";
  }

  if (previewBox) previewBox.style.background = cssBg;

  // Atualização em tempo real do fundo atrás do modal
  if (bgEl && state.activeBoard) {
    if (type === "image" && value) {
      bgEl.style.background = `url('${value}') center/cover no-repeat fixed`;
    } else {
      bgEl.style.background = cssBg;
    }
  }
}

// Upload de imagem de fundo para o bucket board-media
async function uploadBoardBackgroundToStorage(file) {
  if (!supabaseClient || !file) return;

  const fileExt = file.name.split('.').pop();
  const fileName = `bg_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `backgrounds/${fileName}`;

  const progressBox = document.getElementById("board-bg-upload-progress");
  const progressBar = document.getElementById("board-bg-progress-bar");
  if (progressBox) progressBox.classList.remove("hidden");
  if (progressBar) progressBar.style.width = "40%";

  try {
    const { error } = await supabaseClient.storage
      .from("board-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (progressBar) progressBar.style.width = "100%";
    if (error) throw error;

    const { data: publicUrlData } = supabaseClient.storage
      .from("board-media")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    const urlInput = document.getElementById("board-bg-image-url");
    if (urlInput) urlInput.value = publicUrl;

    updateLiveBackgroundPreview("image", publicUrl);
    showToast("Imagem de fundo enviada com sucesso!", "success");
  } catch (err) {
    console.error("Erro no upload de fundo:", err);
    showToast("Erro ao enviar imagem de fundo: " + err.message, "error");
  } finally {
    setTimeout(() => {
      if (progressBox) progressBox.classList.add("hidden");
      if (progressBar) progressBar.style.width = "0%";
    }, 600);
  }
}

// ============================================================================
// COMPARTILHAMENTO DE MURAL
// ============================================================================
function openShareModal(boardId) {
  const board = state.boards.find(b => b.id === boardId) || state.activeBoard;
  if (!board) return;

  const titleEl = document.getElementById("share-modal-title");
  const iconEl = document.getElementById("share-modal-icon");
  const urlInput = document.getElementById("share-board-url-input");

  if (titleEl) titleEl.textContent = board.title;
  if (iconEl) iconEl.textContent = board.icon || "📌";

  const shareUrl = `${window.location.origin}/?board=${board.id}`;
  if (urlInput) urlInput.value = shareUrl;

  // Tenta copiar automaticamente de forma instantânea
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("Link de compartilhamento copiado!", "success");
    }).catch(() => {});
  }

  openModal("modal-share-board");
}

function handleCopyShareUrl() {
  const urlInput = document.getElementById("share-board-url-input");
  const copyBtnText = document.getElementById("btn-copy-share-url-text");
  if (!urlInput) return;

  urlInput.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(urlInput.value).then(() => {
      if (copyBtnText) copyBtnText.textContent = "Copiado!";
      showToast("Link copiado para a área de transferência!", "success");
      setTimeout(() => {
        if (copyBtnText) copyBtnText.textContent = "Copiar";
      }, 2000);
    });
  } else {
    document.execCommand("copy");
    if (copyBtnText) copyBtnText.textContent = "Copiado!";
    showToast("Link copiado para a área de transferência!", "success");
    setTimeout(() => {
      if (copyBtnText) copyBtnText.textContent = "Copiar";
    }, 2000);
  }
}

function renderEmojiPicker() {
  const grid = document.getElementById("emoji-picker-grid");
  if (!grid) return;
  grid.innerHTML = "";

  POPULAR_EMOJIS.forEach(emoji => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "text-xl p-2 rounded-xl hover:bg-gray-100 hover:scale-125 transition-all text-center";
    btn.textContent = emoji;
    btn.addEventListener("click", () => {
      document.getElementById("board-icon-input").value = emoji;
      document.getElementById("board-icon-current").textContent = emoji;
      closeModal("modal-icon-picker");
    });
    grid.appendChild(btn);
  });
}

function openMediaZoom(url) {
  const img = document.getElementById("modal-zoom-img");
  if (img && url) {
    img.src = url;
    openModal("modal-media-zoom");
  }
}

// Helpers de Modal
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "flex";
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add("hidden");
    el.style.display = "none";
  }
}

function showLoader(show) {
  state.isLoading = show;
  const loader = document.getElementById("global-loader");
  if (loader) loader.classList.toggle("hidden", !show);
}

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl text-white text-xs font-subtitle-semibold shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-4 opacity-0";
  
  if (type === "success") toast.classList.add("bg-emerald-600");
  else if (type === "error") toast.classList.add("bg-[#D75B36]");
  else toast.classList.add("bg-[#173057]");

  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-4", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-4", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch (e) {
    return "";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
