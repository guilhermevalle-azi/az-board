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
  isAdminDrawerOpen: false,
  currentLayout: 'masonry',
  currentSort: 'recent',
  keepPinnedTop: true,
  userAvatars: {}
};

// ============================================================================
// PALETAS DE CORES & GRADIENTES (AZ, BÁSICAS, CLARAS & MODERNAS)
// ============================================================================
const AZ_GRADIENTS = [
  // Opções Oficiais AZ (Equilibradas, elegantes e confortáveis aos olhos)
  { name: "AZ Corporate", value: "linear-gradient(135deg, #0A2334 0%, #173057 65%, #7a321f 100%)" },
  { name: "AZ Pôr do Sol Suave", value: "linear-gradient(135deg, #0c1e2b 0%, #173057 55%, #4f2d24 100%)" },
  { name: "AZ Noite & Cobre", value: "linear-gradient(135deg, #071520 0%, #11263d 70%, #3d2019 100%)" },

  // Alternativas Mais Claras (Leves e Agradáveis)
  { name: "Luz da Manhã (Branco/Gelo)", value: "linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)" },
  { name: "Céu Claro (Azul Pastel)", value: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)" },
  { name: "Pôr do Sol Pastel (Amarelo Claro)", value: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FED7AA 100%)" },
  { name: "Menta Serena (Verde Claro)", value: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)" },
  { name: "Lavanda Suave (Lilás Claro)", value: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)" },
  { name: "Areia Dourada (Bege Suave)", value: "linear-gradient(135deg, #FAF5EF 0%, #F5EBE1 50%, #EAD8C7 100%)" },

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
  // Opções Oficiais AZ
  { name: "Azul Escuro AZ", value: "#0A2334" },
  { name: "Laranja AZ", value: "#D75B36" },

  // Cores Básicas e Claras
  { name: "Branco Neve", value: "#FFFFFF" },
  { name: "Branco Gelo (Off-White)", value: "#F8FAFC" },
  { name: "Cinza Claro Platina", value: "#E2E8F0" },
  { name: "Amarelo Claro Solar", value: "#FEF08A" },
  { name: "Amarelo Canário", value: "#FACC15" },
  { name: "Vermelho Carmim", value: "#DC2626" },
  { name: "Vermelho Suave (Coral)", value: "#EF4444" },
  { name: "Azul Céu Claro", value: "#BAE6FD" },
  { name: "Verde Menta Claro", value: "#BBF7D0" },
  { name: "Rosa Pastel", value: "#FBCFE8" },
  { name: "Bege Areia Natural", value: "#F5EBE0" },

  // Tons Escuros e Corporativos
  { name: "Grafite Escuro", value: "#1e293b" },
  { name: "Índigo Profundo", value: "#1e1b4b" },
  { name: "Esmeralda Escuro", value: "#064e3b" },
  { name: "Teal Oceano", value: "#134e4a" },
  { name: "Azul Petróleo", value: "#0c4a6e" },
  { name: "Cobre Intenso", value: "#7c2d12" }
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
  const avatarUrl = supabaseUser.user_metadata?.avatar_url || 
                    supabaseUser.user_metadata?.picture || 
                    supabaseUser.user_metadata?.photo_url || 
                    supabaseUser.user_metadata?.avatar || 
                    null;

  if (avatarUrl) {
    cacheAuthorAvatar(email, avatarUrl);
  }

  const isMaster = email.toLowerCase() === MASTER_ADMIN.toLowerCase();
  const cachedAdmin = localStorage.getItem("az_admin_" + email.toLowerCase()) === "true";

  state.user = {
    id: supabaseUser.id,
    email: email,
    name: name,
    avatarUrl: avatarUrl,
    isAdmin: isMaster || cachedAdmin,
    isMasterAdmin: isMaster
  };

  // Garante cabeçalho superior tradicional oculto para design limpo idêntico ao interior do mural
  const mainHeader = document.getElementById("main-app-header");
  if (mainHeader) mainHeader.classList.add("hidden");

  // Garante fundo neutro suave moderno na tela inicial
  const bgInit = document.getElementById("board-custom-bg");
  if (bgInit) bgInit.style.background = "#F4F6F8";

  // Alternar telas imediatamente para transição instantânea
  document.getElementById("view-login").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  renderUserInfo();

  // Exibe a aba da gaveta admin imediatamente na tela inicial se for admin
  updateAdminDrawerContext();

  // Carregar lista de administradores do banco e re-renderizar
  await loadAdminsList();
  renderUserInfo();

  if (state.user?.isAdmin) {
    localStorage.setItem("az_admin_" + email.toLowerCase(), "true");
  }

  // Iniciar Realtime e Murais
  setupRealtimeWebsockets();
  await loadBoards();

  // Configura a barra de ferramentas do Admin
  updateAdminDrawerContext();

  // Verifica se há acesso direto a um mural compartilhado via ?board=
  await checkDirectBoardAccess();
}

// Acesso direto a um mural específico compartilhado
async function checkDirectBoardAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  let targetBoardId = urlParams.get("board");
  if (!targetBoardId) {
    targetBoardId = localStorage.getItem("az_board_pending_id");
  }
  localStorage.removeItem("az_board_pending_id");

  // Se não houver mural específico solicitado por link, mantém o usuário no dashboard (que já filtra murais abertos)
  if (!targetBoardId) {
    updateAdminDrawerContext();
    return;
  }

  let target = state.boards.find(b => b.id === targetBoardId);

  // Se não estiver na lista geral carregada, busca direto no Supabase
  if (!target && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("boards")
        .select("*, cards(id)")
        .eq("id", targetBoardId)
        .single();
      if (!error && data) {
        const localClosed = localStorage.getItem("az_board_closed_" + data.id);
        const isClosed = (data.is_closed !== undefined && data.is_closed !== null)
          ? !!data.is_closed
          : (localClosed === "true");
        target = {
          ...data,
          is_closed: isClosed,
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
  } else {
    showToast("Mural compartilhado não encontrado.", "error");
    updateAdminDrawerContext();
  }
}

function handleUnauthenticatedUser() {
  state.user = null;
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("view-login").classList.remove("hidden");
  document.getElementById("admin-collapsible-wrapper")?.classList.add("hidden");
  toggleAdminDrawer(false);
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
    const urlParams = new URLSearchParams(window.location.search);
    const targetBoardId = urlParams.get("board");
    if (targetBoardId) {
      localStorage.setItem("az_board_pending_id", targetBoardId);
    }
    const redirectTarget = targetBoardId 
      ? `${window.location.origin}/?board=${targetBoardId}` 
      : window.location.origin;

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTarget
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

  // Atualiza chip do usuário no Hero do Dashboard
  const dashName = document.getElementById("dashboard-user-name");
  const dashAvatar = document.getElementById("dashboard-avatar-container");
  if (dashName) dashName.textContent = (state.user.name || "Usuário").split(" ")[0];
  if (dashAvatar) {
    if (state.user.avatarUrl) {
      dashAvatar.innerHTML = `<img src="${state.user.avatarUrl}" class="w-full h-full object-cover" alt="${state.user.name}">`;
    } else {
      const initial = (state.user.name || "U").charAt(0).toUpperCase();
      dashAvatar.innerHTML = `<span id="dashboard-avatar-initials">${initial}</span>`;
    }
  }

  const isAdm = state.user.isAdmin || state.user.isMasterAdmin;
  if (adminBadge) adminBadge.classList.toggle("hidden", !isAdm);
  if (btnManageAdmins) btnManageAdmins.classList.toggle("hidden", !isAdm);
}

// ============================================================================
// GESTÃO DE AVATARES E FOTOS DE PERFIL (GOOGLE OAUTH & WORKSPACE)
// ============================================================================
function cacheAuthorAvatar(email, avatarUrl) {
  if (!email || !avatarUrl) return;
  const cleanEmail = email.toLowerCase().trim();
  if (!state.userAvatars) state.userAvatars = {};
  state.userAvatars[cleanEmail] = avatarUrl;
  try {
    localStorage.setItem("az_avatar_" + cleanEmail, avatarUrl);
  } catch (e) {}
}

function getAuthorAvatar(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  // 1. Usuário atual logado
  if (state.user && state.user.email && state.user.email.toLowerCase().trim() === cleanEmail && state.user.avatarUrl) {
    return state.user.avatarUrl;
  }
  // 2. Cache em memória da sessão
  if (state.userAvatars && state.userAvatars[cleanEmail]) {
    return state.userAvatars[cleanEmail];
  }
  // 3. Cache persistido no localStorage
  try {
    const cached = localStorage.getItem("az_avatar_" + cleanEmail);
    if (cached) {
      if (!state.userAvatars) state.userAvatars = {};
      state.userAvatars[cleanEmail] = cached;
      return cached;
    }
  } catch (e) {}
  return null;
}

function renderAuthorAvatar(authorEmail, authorName, authorAvatar, sizeClass = "w-5 h-5", textClass = "text-[9px]") {
  const initial = (authorName || "A").charAt(0).toUpperCase();
  const avatarUrl = authorAvatar || getAuthorAvatar(authorEmail);

  if (avatarUrl) {
    return `
      <div class="${sizeClass} rounded-full bg-[#173057] text-white flex items-center justify-center font-bold ${textClass} flex-shrink-0 overflow-hidden ring-1 ring-black/10 shadow-xs">
        <img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" alt="${escapeHtml(authorName || 'Colaborador')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <span style="display:none;" class="w-full h-full flex items-center justify-center ${textClass}">${initial}</span>
      </div>
    `;
  }

  return `
    <div class="${sizeClass} rounded-full bg-[#173057] text-white flex items-center justify-center font-bold ${textClass} flex-shrink-0 ring-1 ring-black/10 shadow-xs">
      <span>${initial}</span>
    </div>
  `;
}

async function syncCardAuthorAvatar(cardId, avatarUrl) {
  if (!supabaseClient || !cardId || !avatarUrl) return;
  try {
    await supabaseClient.from("cards").update({ author_avatar: avatarUrl }).eq("id", cardId);
  } catch (e) {}
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
      state.admins = Array.from(new Set([MASTER_ADMIN.toLowerCase(), ...dbAdmins]));
      if (state.user) {
        state.user.isAdmin = state.admins.includes(state.user.email.toLowerCase());
      }
    }
  } catch (err) {
    console.warn("Aviso ao carregar admins:", err);
  }
  // Garante atualização e visibilidade imediata da gaveta admin
  updateAdminDrawerContext();
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
        updateBoardViewStatusUI();
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

    state.boards = (boards || []).map(b => {
      const localClosed = localStorage.getItem("az_board_closed_" + b.id);
      const isClosed = (b.is_closed !== undefined && b.is_closed !== null)
        ? !!b.is_closed
        : (localClosed === "true");
      const localSingle = localStorage.getItem("az_board_single_post_" + b.id);
      const isSinglePost = (b.single_post_mode !== undefined && b.single_post_mode !== null)
        ? !!b.single_post_mode
        : (localSingle === "true");
      const localEventDate = localStorage.getItem("az_board_has_event_date_" + b.id);
      const hasEventDate = (b.has_event_date !== undefined && b.has_event_date !== null)
        ? !!b.has_event_date
        : (localEventDate === "true");
      return {
        ...b,
        is_closed: isClosed,
        single_post_mode: isSinglePost,
        has_event_date: hasEventDate,
        card_count: b.cards ? b.cards.length : 0
      };
    });

    renderBoardsGrid();

    // Se houver um mural ativo aberto, atualiza suas propriedades e UI imediatamente
    if (state.activeBoard) {
      const updatedActive = state.boards.find(b => b.id === state.activeBoard.id);
      if (updatedActive) {
        state.activeBoard = { ...state.activeBoard, ...updatedActive };
        updateBoardViewStatusUI();
      }
    }
  } catch (err) {
    if (!isSilent) showLoader(false);
    console.error("Erro ao carregar murais:", err);
    showToast("Erro ao carregar murais do Supabase.", "error");
  }
}

function renderBoardsGrid() {
  const grid = document.getElementById("boards-grid");
  const empty = document.getElementById("empty-boards-msg");
  const emptyTitle = document.getElementById("empty-boards-title");
  const emptyDesc = document.getElementById("empty-boards-desc");
  const btnCreateHero = document.getElementById("btn-create-board-hero");
  const btnCreateEmpty = document.getElementById("btn-create-board-empty");
  if (!grid) return;

  grid.innerHTML = "";

  const effectiveAdmin = isUserAdmin();

  // Ajusta título e descrição de boas-vindas no Hero com convite acolhedor
  const heroTitle = document.getElementById("dashboard-hero-title");
  if (heroTitle) {
    heroTitle.textContent = effectiveAdmin
      ? "Murais de Interação & Marketing"
      : "Escolha um mural e participe!";
  }
  const heroDesc = document.getElementById("dashboard-hero-desc");
  if (heroDesc) {
    heroDesc.textContent = effectiveAdmin
      ? "Acompanhe as ações de marketing, interação e integração da empresa, gerencie as campanhas ativas e conduza as votações e feedbacks dos colaboradores."
      : "Seja bem-vindo(a)! Escolha um dos murais abertos abaixo para acompanhar as ações de marketing e integração da empresa, compartilhar fotos, vídeos e ideias, interagir nos comentários e votar nas melhores iniciativas.";
  }

  // Botões de criar mural: visíveis apenas no modo Admin
  if (btnCreateHero) btnCreateHero.classList.toggle("hidden", !effectiveAdmin);
  if (btnCreateEmpty) btnCreateEmpty.classList.toggle("hidden", !effectiveAdmin);

  // Filtragem: Usuário comum vê APENAS murais abertos (!board.is_closed)
  const visibleBoards = (state.boards || []).filter(board => {
    if (effectiveAdmin) return true; // Admin vê todos
    return !board.is_closed; // Colaborador vê apenas abertos
  });

  if (visibleBoards.length === 0) {
    if (empty) empty.classList.remove("hidden");
    if (emptyTitle) {
      emptyTitle.textContent = effectiveAdmin ? "Nenhum mural disponível" : "Nenhum mural aberto no momento";
    }
    if (emptyDesc) {
      emptyDesc.textContent = effectiveAdmin
        ? "Crie o primeiro mural para lançar uma ação de marketing, evento ou campanha de interação para a equipe."
        : "Nenhum mural aberto para participação no momento. Assim que o time de marketing disponibilizar uma nova ação ou mural, ele aparecerá aqui para você interagir e compartilhar seus momentos!";
    }
    return;
  }

  if (empty) empty.classList.add("hidden");

  visibleBoards.forEach(board => {
    const cardEl = document.createElement("div");
    cardEl.className = "rounded-2xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer group relative bg-white ring-1 ring-black/5";
    
    // Background header
    let bgStyle = "background: linear-gradient(135deg, #0A2334 0%, #173057 100%);";
    if (board.background_type === "gradient" || board.background_type === "color") {
      bgStyle = `background: ${board.background_value};`;
    } else if (board.background_type === "image" && board.background_value) {
      bgStyle = `background: url('${board.background_value}') center/cover no-repeat;`;
    }

    const isOwnerOrAdmin = state.user && (board.created_by === state.user.email || effectiveAdmin);
    const isClosed = !!board.is_closed;

    cardEl.innerHTML = `
      <div class="h-24 p-3 relative flex items-start gap-2.5 rounded-t-2xl" style="${bgStyle}">
        <div class="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-xl flex-shrink-0">
          ${board.icon || '📌'}
        </div>
        
        <!-- Tags / Badges com quebra limpa -->
        <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap pt-0.5">
          ${board.vote_mode && effectiveAdmin ? '<span class="text-[9px] uppercase font-subtitle-semibold bg-[#D75B36] text-white px-2 py-0.5 rounded-full font-bold shadow-sm flex-shrink-0">Votação</span>' : ''}
          ${board.single_post_mode ? '<span class="text-[9px] uppercase font-subtitle-semibold bg-[#0A2334]/85 text-white/95 border border-white/25 px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1 flex-shrink-0"><i data-lucide="user-check" class="w-2.5 h-2.5 text-[#DC7B52]"></i> 1 Card</span>' : ''}
          ${board.has_event_date ? '<span class="text-[9px] uppercase font-subtitle-semibold bg-[#173057]/85 text-white/95 border border-white/25 px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1 flex-shrink-0"><i data-lucide="calendar" class="w-2.5 h-2.5 text-cyan-300"></i> Data</span>' : ''}
          ${effectiveAdmin ? `
            <span class="text-[9px] uppercase font-subtitle-semibold ${isClosed ? 'bg-gray-900/90 text-amber-300 border border-amber-500/30' : 'bg-emerald-600/90 text-white'} px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1 flex-shrink-0">
              ${isClosed ? '<i data-lucide="lock" class="w-2.5 h-2.5"></i> Fechado' : '<span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> Aberto'}
            </span>
          ` : ''}
        </div>

        <!-- Botão de Ação / Menu no canto superior direito fixo -->
        <div class="flex-shrink-0">
          ${effectiveAdmin ? `
            <div class="relative group/menu">
              <button type="button" class="btn-board-menu w-7 h-7 flex items-center justify-center text-white/90 hover:text-white rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-xs transition-colors cursor-pointer shadow-xs">
                <i data-lucide="more-vertical" class="w-4 h-4"></i>
              </button>
              <div class="hidden group-hover/menu:block absolute right-0 top-8 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-30 transform origin-top-right transition-all">
                <button type="button" class="btn-share-board w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-medium" data-id="${board.id}">
                  <i data-lucide="share-2" class="w-3.5 h-3.5 text-emerald-600"></i> Compartilhar
                </button>
                <button type="button" class="btn-toggle-status-board w-full text-left px-3 py-1.5 text-xs ${isClosed ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'} flex items-center gap-2 cursor-pointer font-medium" data-id="${board.id}">
                  <i data-lucide="${isClosed ? 'unlock' : 'lock'}" class="w-3.5 h-3.5"></i> ${isClosed ? 'Reabrir Mural' : 'Encerrar Mural'}
                </button>
                <button type="button" class="btn-edit-board w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer font-medium" data-id="${board.id}">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5 text-[#173057]"></i> Editar Mural
                </button>
                <div class="my-1 border-t border-gray-100"></div>
                <button type="button" class="btn-delete-board w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium" data-id="${board.id}">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Excluir Mural
                </button>
              </div>
            </div>
          ` : `
            <button type="button" class="btn-share-board w-7 h-7 flex items-center justify-center text-white/90 hover:text-white rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-xs transition-colors cursor-pointer shadow-xs" data-id="${board.id}" title="Compartilhar Link">
              <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
            </button>
          `}
        </div>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between bg-white rounded-b-2xl">
        <div>
          <h3 class="font-subtitle text-base text-[#0A2334] line-clamp-1 group-hover:text-[#D75B36] transition-colors font-bold tracking-wide">${escapeHtml(board.title)}</h3>
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
      if (e.target.closest(".group\\/menu") || e.target.closest(".btn-share-board") || e.target.closest(".btn-toggle-status-board")) return;
      openBoard(board);
    });

    grid.appendChild(cardEl);
  });

  if (window.lucide) lucide.createIcons();

  // Ações de Compartilhar / Alterar Status / Editar / Excluir Mural
  grid.querySelectorAll(".btn-share-board").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openShareModal(btn.dataset.id);
    });
  });

  grid.querySelectorAll(".btn-toggle-status-board").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBoardOpenClose(btn.dataset.id);
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
// CONTROLE DE STATUS DO MURAL (ABERTO VS ENCERRADO)
// ============================================================================
async function toggleBoardOpenClose(boardId) {
  let board = (state.boards || []).find(b => b.id === boardId);
  if (!board && state.activeBoard && state.activeBoard.id === boardId) {
    board = state.activeBoard;
  }
  if (!board) return;

  const newClosedState = !board.is_closed;
  board.is_closed = newClosedState;
  if (state.activeBoard && state.activeBoard.id === boardId) {
    state.activeBoard.is_closed = newClosedState;
  }

  // Persistência local imediata
  localStorage.setItem("az_board_closed_" + boardId, newClosedState ? "true" : "false");

  // Persistência no Supabase (se coluna existir)
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("boards")
        .update({ is_closed: newClosedState })
        .eq("id", boardId);
      if (error) {
        console.warn("Aviso ao persistir status is_closed no Supabase:", error);
      }
    } catch (e) {
      console.warn("Aviso ao atualizar is_closed:", e);
    }
  }

  showToast(
    newClosedState
      ? "Mural encerrado! Novas postagens de colaboradores foram bloqueadas."
      : "Mural reaberto! Colaboradores agora podem postar ideias novamente.",
    "info"
  );

  // Atualiza UI de acordo com o contexto atual
  if (!state.activeBoard) {
    renderBoardsGrid();
  } else {
    updateBoardViewStatusUI();
  }
}

function getUserPostCount() {
  if (!state.user || !state.cards) return 0;
  const userEmail = (state.user.email || "").toLowerCase().trim();
  return state.cards.filter(c => (c.author_email || "").toLowerCase().trim() === userEmail).length;
}

function isUserBlockedBySinglePost() {
  if (!state.activeBoard || !state.activeBoard.single_post_mode) return false;
  // Admins no Modo Admin têm permissão de gerenciamento; na Visão Usuário ou usuários comuns, bloqueia se >= 1
  if (isUserAdmin() && state.viewMode === "admin") return false;
  return getUserPostCount() >= 1;
}

function updateBoardViewStatusUI() {
  if (!state.activeBoard) return;
  const isClosed = !!state.activeBoard.is_closed;
  const isSinglePost = !!state.activeBoard.single_post_mode;
  const effectiveAdmin = isUserAdmin();

  // Banner informativo de Mural Encerrado
  const closedBanner = document.getElementById("board-closed-banner");
  if (closedBanner) {
    closedBanner.classList.toggle("hidden", !isClosed);
  }
  const btnReopenBanner = document.getElementById("btn-reopen-board-banner");
  if (btnReopenBanner) {
    btnReopenBanner.classList.toggle("hidden", !isClosed || !effectiveAdmin);
  }

  // Badge "Encerrado" ao lado do título do mural
  const closedBadge = document.getElementById("board-view-closed-badge");
  if (closedBadge) {
    closedBadge.classList.toggle("hidden", !isClosed);
  }

  // Badge "Votação Ativa"
  const voteBadge = document.getElementById("board-view-vote-badge");
  if (voteBadge) {
    voteBadge.classList.toggle("hidden", !state.activeBoard.vote_mode);
  }

  // Badge "1 Card por Pessoa"
  const singlePostBadge = document.getElementById("board-view-single-post-badge");
  if (singlePostBadge) {
    singlePostBadge.classList.toggle("hidden", !isSinglePost);
  }

  // Botões de Adicionar Card:
  // - Se mural encerrado -> somente Admins
  // - Se modo de participação única e usuário já postou >= 1 card -> bloqueado
  const fabAddCard = document.getElementById("btn-fab-add-card");
  const btnAddCardEmpty = document.getElementById("btn-add-card-empty");
  const blockedBySingle = isUserBlockedBySinglePost();
  const canAddCard = (!isClosed || effectiveAdmin) && !blockedBySingle;

  if (fabAddCard) fabAddCard.classList.toggle("hidden", !canAddCard);
  if (btnAddCardEmpty) btnAddCardEmpty.classList.toggle("hidden", !canAddCard);

  // Banner informativo para o usuário que já atingiu o limite de 1 card
  const singlePostBanner = document.getElementById("board-single-post-user-banner");
  if (singlePostBanner) {
    singlePostBanner.classList.toggle("hidden", !isSinglePost || !blockedBySingle);
  }

  // Atualiza botão flutuante de votação imediatamente
  updateFabVoteButton();

  // Atualiza gaveta retrátil de ferramentas admin (botões de status, votação, apuração)
  updateAdminDrawerContext();
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

function updateAdminDrawerContext() {
  const isRealAdmin = !!(state.user?.isAdmin || state.user?.isMasterAdmin);
  const wrapper = document.getElementById("admin-collapsible-wrapper");
  if (!wrapper) return;

  if (!isRealAdmin) {
    wrapper.classList.add("hidden");
    return;
  }

  // Admin sempre tem a aba flutuante disponível (tanto no dashboard quanto dentro do mural)
  wrapper.classList.remove("hidden");

  const isInsideBoard = !!state.activeBoard;

  const btnBack = document.getElementById("btn-back-to-dashboard");
  const btnCreateDrawer = document.getElementById("btn-create-board-drawer");
  const btnToggleStatus = document.getElementById("btn-toggle-board-status-drawer");
  const btnVote = document.getElementById("btn-vote-board");
  const btnStats = document.getElementById("btn-stats-board");
  const btnLayoutSort = document.getElementById("btn-board-layout-sort");
  const btnSettings = document.getElementById("btn-board-settings");
  const btnShare = document.getElementById("btn-share-board-header");
  const btnExport = document.getElementById("btn-export-png");

  const grpConfig = document.getElementById("admin-group-board-config");
  const grpLifecycle = document.getElementById("admin-group-board-lifecycle");
  const grpShare = document.getElementById("admin-group-board-share");

  if (!isInsideBoard) {
    // Na tela inicial (Dashboard de Murais)
    if (btnBack) btnBack.classList.add("hidden");
    if (btnCreateDrawer) btnCreateDrawer.classList.remove("hidden");
    if (grpConfig) grpConfig.classList.add("hidden");
    if (grpLifecycle) grpLifecycle.classList.add("hidden");
    if (grpShare) grpShare.classList.add("hidden");
    if (btnToggleStatus) btnToggleStatus.classList.add("hidden");
    if (btnVote) btnVote.classList.add("hidden");
    if (btnStats) btnStats.classList.add("hidden");
    if (btnLayoutSort) btnLayoutSort.classList.add("hidden");
    if (btnSettings) btnSettings.classList.add("hidden");
    if (btnShare) btnShare.classList.add("hidden");
    if (btnExport) btnExport.classList.add("hidden");
  } else {
    // No interior de um Mural
    if (btnBack) btnBack.classList.remove("hidden");
    if (btnCreateDrawer) btnCreateDrawer.classList.add("hidden");
    if (grpLifecycle) grpLifecycle.classList.remove("hidden");
    if (grpShare) grpShare.classList.remove("hidden");

    const effectiveAdmin = isUserAdmin();
    const isOwnerOrAdmin = state.user && (state.activeBoard.created_by === state.user.email || effectiveAdmin);

    if (grpConfig) grpConfig.classList.toggle("hidden", !isOwnerOrAdmin);
    if (btnSettings) btnSettings.classList.toggle("hidden", !isOwnerOrAdmin);
    if (btnLayoutSort) btnLayoutSort.classList.toggle("hidden", !isOwnerOrAdmin);

    if (btnToggleStatus) {
      btnToggleStatus.classList.remove("hidden");
      const isClosed = !!state.activeBoard.is_closed;
      const label = document.getElementById("btn-toggle-board-status-label");
      const icon = document.getElementById("btn-toggle-board-status-icon");
      if (label) label.textContent = isClosed ? "Reabrir Mural" : "Encerrar Mural";
      if (icon) {
        icon.setAttribute("data-lucide", isClosed ? "unlock" : "lock");
        icon.className = isClosed ? "w-3.5 h-3.5 text-emerald-400" : "w-3.5 h-3.5 text-amber-400";
      }
      btnToggleStatus.className = isClosed
        ? "px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-emerald-500/40 text-xs font-subtitle-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        : "px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 text-xs font-subtitle-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs";
    }

    if (btnVote) btnVote.classList.toggle("hidden", !state.activeBoard.vote_mode || !effectiveAdmin);
    if (btnStats) btnStats.classList.toggle("hidden", !state.activeBoard.vote_mode || !effectiveAdmin);
    if (btnShare) btnShare.classList.remove("hidden");
    if (btnExport) btnExport.classList.remove("hidden");
  }

  if (window.lucide) lucide.createIcons();
}

function setViewMode(mode) {
  state.viewMode = mode;
  updateViewModeUI();

  if (mode === "admin") {
    showToast("Modo Admin ativado: ferramentas completas visíveis.", "info");
  } else {
    showToast("Visão do Usuário ativada: você está visualizando como um colaborador comum.", "info");
    toggleAdminDrawer(false);
  }

  // Atualiza a tela de acordo com o contexto
  if (!state.activeBoard) {
    renderBoardsGrid();
  } else {
    updateBoardViewStatusUI();
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
      btnAdmin.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold transition-all bg-[#D75B36] text-white shadow-xs flex items-center gap-1.5 cursor-pointer";
    }
    if (btnUser) {
      btnUser.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold text-white/70 hover:text-white transition-all flex items-center gap-1.5 bg-transparent cursor-pointer";
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
      btnAdmin.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold text-white/70 hover:text-white transition-all flex items-center gap-1.5 bg-transparent cursor-pointer";
    }
    if (btnUser) {
      btnUser.className = "px-3 py-1.5 rounded-lg text-xs font-subtitle-semibold transition-all bg-white/20 text-white shadow-xs flex items-center gap-1.5 cursor-pointer";
    }
    if (tabLabel) tabLabel.textContent = "Visão Usuário";
    if (tabIcon) {
      tabIcon.setAttribute("data-lucide", "eye");
      tabIcon.className = "w-3.5 h-3.5 text-white/80";
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

  // Atualiza query param da URL com ?board=<id> de forma transparente
  try {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("board", board.id);
    history.replaceState(null, "", newUrl.toString());
  } catch(e) {}

  // Botões de voltar aos murais: disponíveis para todos os usuários
  const headerLogo = document.getElementById("header-logo-home");
  if (headerLogo) {
    headerLogo.classList.add("cursor-pointer");
    headerLogo.onclick = showDashboardView;
  }
  const btnBack = document.getElementById("btn-back-to-dashboard");
  if (btnBack) {
    btnBack.onclick = showDashboardView;
  }
  const btnCanvasBack = document.getElementById("btn-board-canvas-back");
  if (btnCanvasBack) {
    btnCanvasBack.onclick = showDashboardView;
  }

  // Configurações visuais do mural ativo
  document.getElementById("board-view-icon").textContent = board.icon || "📌";
  document.getElementById("board-view-title").textContent = board.title || "Sem título";
  const descEl = document.getElementById("board-view-desc");
  const descBox = document.getElementById("board-view-desc-box");
  if (descEl) descEl.textContent = board.description || "";
  if (descBox) descBox.classList.toggle("hidden", !board.description || !board.description.trim());

  // Votação: Botão flutuante aparente ao lado do novo card para todos quando ativa
  const voteBadge = document.getElementById("board-view-vote-badge");
  updateFabVoteButton();
  if (voteBadge) voteBadge.classList.toggle("hidden", !board.vote_mode);

  // Status Aberto/Encerrado e botões de adicionar card
  updateBoardViewStatusUI();

  // Garante persistência de data personalizada
  const localEventDate = localStorage.getItem("az_board_has_event_date_" + board.id);
  if (board.has_event_date === undefined || board.has_event_date === null) {
    board.has_event_date = (localEventDate === "true");
  }

  // Configuração de Layout e Ordenação do mural
  state.currentLayout = board.layout_mode || board.layout || localStorage.getItem(`az_board_layout_${board.id}`) || 'masonry';
  state.currentSort = board.sort_mode || board.sort_order || localStorage.getItem(`az_board_sort_${board.id}`) || 'recent';
  const savedPinned = localStorage.getItem(`az_board_pinned_${board.id}`);
  state.keepPinnedTop = savedPinned !== null ? savedPinned === 'true' : true;

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

  // Mantém cabeçalho tradicional oculto para design limpo idêntico ao interior do mural
  const mainHeader = document.getElementById("main-app-header");
  if (mainHeader) mainHeader.classList.add("hidden");

  // Limpa o query param ?board da URL
  try {
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("board");
    history.replaceState(null, "", newUrl.pathname);
  } catch(e) {}

  // Restaura fundo neutro suave moderno para o dashboard (#F4F6F8)
  const bgEl = document.getElementById("board-custom-bg");
  if (bgEl) {
    bgEl.style.background = "#F4F6F8";
  }

  // Desativa qualquer trava de altura da timeline
  document.body.classList.remove("timeline-mode-active");
  const viewBoard = document.getElementById("view-board");
  if (viewBoard) {
    viewBoard.classList.remove("layout-timeline-active", "board-light-theme", "board-orange-theme", "board-dark-theme");
  }

  // Atualiza gaveta admin para o contexto de dashboard
  updateAdminDrawerContext();

  // Re-renderiza o grid de murais aplicando filtros de perfil
  renderBoardsGrid();
}

// Identifica se o fundo é Claro (Light), Laranja/Quente (Orange) ou Escuro (Dark)
function getBackgroundThemeCategory(bgType, bgValue) {
  if (!bgValue) return "dark";
  const val = bgValue.trim().toLowerCase();

  // 1. Categoria Quente / Laranja / Vermelho / Cobre (ex: #D75B36, #DC2626, #7c2d12, Fire Amber)
  const isOrangeExplicit = 
    val === "#d75b36" || val === "#dc7b52" || val === "#7c2d12" || 
    val === "#dc2626" || val === "#ef4444" || val === "#ea580c" || 
    val === "#f97316" || val.includes("fire amber") ||
    (val.includes("#7c2d12") && val.includes("#ea580c"));

  if (isOrangeExplicit) {
    return "orange";
  }

  // 2. Categoria Clara (Branco, Amarelos, Tons Pastéis, Bege, etc.)
  if (bgType === "color") {
    let hex = val.replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map(ch => ch + ch).join("");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance > 160) return "light";
    }
  } else if (bgType === "gradient") {
    const lightIndicators = [
      "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0", "#e0f2fe", 
      "#bae6fd", "#7dd3fc", "#fef3c7", "#fde68a", "#fed7aa", 
      "#fef08a", "#facc15", "#ecfdf5", "#d1fae5", "#a7f3d0", 
      "#bbf7d0", "#f5f3ff", "#ede9fe", "#ddd6fe", "#faf5ef", 
      "#f5ebe1", "#ead8c7", "#f5ebe0", "#fbcfeb", "#fbcfe8"
    ];
    if (lightIndicators.some(ind => val.includes(ind))) {
      return "light";
    }
  }

  return "dark";
}

function isLightBackground(bgType, bgValue) {
  return getBackgroundThemeCategory(bgType, bgValue) === "light";
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

  // Aplica classe de contraste harmônica (board-light-theme, board-orange-theme ou board-dark-theme)
  const themeCat = getBackgroundThemeCategory(board.background_type, board.background_value);
  const viewBoard = document.getElementById("view-board");
  if (viewBoard) {
    viewBoard.classList.remove("board-light-theme", "board-orange-theme", "board-dark-theme");
    viewBoard.classList.add(`board-${themeCat}-theme`);
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

  const voteToggle = document.getElementById("board-vote-mode-toggle");
  if (voteToggle) voteToggle.checked = false;
  const singleToggle = document.getElementById("board-single-post-toggle");
  if (singleToggle) singleToggle.checked = false;
  const eventDateToggle = document.getElementById("board-event-date-toggle");
  if (eventDateToggle) eventDateToggle.checked = false;

  const openToggle = document.getElementById("board-open-toggle");
  if (openToggle) openToggle.checked = true;

  document.getElementById("bg-type-gradient").checked = true;
  handleBackgroundTypeChange("gradient");
  selectGradientPreset(AZ_GRADIENTS[0].value);

  openModal("modal-board");
}

function openEditBoardModal(boardId) {
  let board = state.boards.find(b => b.id === boardId);
  if (!board && state.activeBoard && state.activeBoard.id === boardId) {
    board = state.activeBoard;
  }
  if (!board) return;

  // Garante fallback do localStorage caso venha nulo do banco
  const localSingle = localStorage.getItem("az_board_single_post_" + board.id);
  const isSingle = (board.single_post_mode !== undefined && board.single_post_mode !== null)
    ? !!board.single_post_mode
    : (localSingle === "true");

  const localEventDate = localStorage.getItem("az_board_has_event_date_" + board.id);
  const hasEventDate = (board.has_event_date !== undefined && board.has_event_date !== null)
    ? !!board.has_event_date
    : (localEventDate === "true");

  state.editingBoardId = boardId;
  document.getElementById("modal-board-title").textContent = "Configurações do Mural";
  document.getElementById("board-id-hidden").value = board.id;
  document.getElementById("board-title-input").value = board.title || "";
  document.getElementById("board-desc-input").value = board.description || "";
  document.getElementById("board-icon-current").textContent = board.icon || "📌";
  document.getElementById("board-icon-input").value = board.icon || "📌";
  document.getElementById("board-vote-mode-toggle").checked = !!board.vote_mode;
  const singleToggle = document.getElementById("board-single-post-toggle");
  if (singleToggle) singleToggle.checked = isSingle;

  const eventDateToggle = document.getElementById("board-event-date-toggle");
  if (eventDateToggle) eventDateToggle.checked = hasEventDate;

  const openToggle = document.getElementById("board-open-toggle");
  if (openToggle) openToggle.checked = !board.is_closed;

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
  const singlePostMode = document.getElementById("board-single-post-toggle")?.checked || false;
  const hasEventDate = document.getElementById("board-event-date-toggle")?.checked || false;
  const isOpen = document.getElementById("board-open-toggle")?.checked !== false;
  const isClosed = !isOpen;

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
        localStorage.setItem("az_board_closed_" + id, isClosed ? "true" : "false");
        localStorage.setItem("az_board_single_post_" + id, singlePostMode ? "true" : "false");
        localStorage.setItem("az_board_has_event_date_" + id, hasEventDate ? "true" : "false");
        try {
          const { error } = await supabaseClient.from("boards").update({
            title: title,
            description: desc,
            icon: icon,
            vote_mode: voteMode,
            single_post_mode: singlePostMode,
            has_event_date: hasEventDate,
            background_type: bgType,
            background_value: bgValue,
            is_closed: isClosed
          }).eq("id", id);
          if (error) throw error;
        } catch (dbErr) {
          // Fallback caso a coluna has_event_date, single_post_mode ou is_closed ainda não tenha sido criada no banco
          try {
            await supabaseClient.from("boards").update({
              title: title,
              description: desc,
              icon: icon,
              vote_mode: voteMode,
              single_post_mode: singlePostMode,
              background_type: bgType,
              background_value: bgValue,
              is_closed: isClosed
            }).eq("id", id);
          } catch (e2) {
            await supabaseClient.from("boards").update({
              title: title,
              description: desc,
              icon: icon,
              vote_mode: voteMode,
              background_type: bgType,
              background_value: bgValue
            }).eq("id", id);
          }
        }

        // Atualização instantânea na tela do mural ativo e na lista de murais
        const targetBoardInList = state.boards ? state.boards.find(b => b.id === id) : null;
        if (targetBoardInList) {
          targetBoardInList.title = title;
          targetBoardInList.description = desc;
          targetBoardInList.icon = icon;
          targetBoardInList.vote_mode = voteMode;
          targetBoardInList.single_post_mode = singlePostMode;
          targetBoardInList.has_event_date = hasEventDate;
          targetBoardInList.background_type = bgType;
          targetBoardInList.background_value = bgValue;
          targetBoardInList.is_closed = isClosed;
        }

        if (state.activeBoard && state.activeBoard.id === id) {
          state.activeBoard.title = title;
          state.activeBoard.description = desc;
          state.activeBoard.icon = icon;
          state.activeBoard.vote_mode = voteMode;
          state.activeBoard.single_post_mode = singlePostMode;
          state.activeBoard.has_event_date = hasEventDate;
          state.activeBoard.background_type = bgType;
          state.activeBoard.background_value = bgValue;
          state.activeBoard.is_closed = isClosed;

          document.getElementById("board-view-icon").textContent = icon;
          document.getElementById("board-view-title").textContent = title;
          document.getElementById("board-view-desc").textContent = desc;
          applyBoardBackground(state.activeBoard);
          updateBoardViewStatusUI();
          renderCardsList();
        }
        showToast("Mural atualizado com sucesso!", "success");
      } else {
        // Criação
        let createdBoard = null;
        try {
          const { data, error } = await supabaseClient.from("boards").insert([{
            title: title,
            description: desc,
            icon: icon,
            vote_mode: voteMode,
            single_post_mode: singlePostMode,
            has_event_date: hasEventDate,
            background_type: bgType,
            background_value: bgValue,
            created_by: state.user?.email || MASTER_ADMIN,
            is_closed: isClosed
          }]).select().single();
          if (error) throw error;
          createdBoard = data;
        } catch (dbErr) {
          try {
            const { data, error } = await supabaseClient.from("boards").insert([{
              title: title,
              description: desc,
              icon: icon,
              vote_mode: voteMode,
              single_post_mode: singlePostMode,
              background_type: bgType,
              background_value: bgValue,
              created_by: state.user?.email || MASTER_ADMIN,
              is_closed: isClosed
            }]).select().single();
            if (error) throw error;
            createdBoard = data;
          } catch (e2) {
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
            createdBoard = data;
          }
        }

        if (createdBoard) {
          createdBoard.is_closed = isClosed;
          createdBoard.single_post_mode = singlePostMode;
          createdBoard.has_event_date = hasEventDate;
          localStorage.setItem("az_board_closed_" + createdBoard.id, isClosed ? "true" : "false");
          localStorage.setItem("az_board_single_post_" + createdBoard.id, singlePostMode ? "true" : "false");
          localStorage.setItem("az_board_has_event_date_" + createdBoard.id, hasEventDate ? "true" : "false");
          showToast("Mural criado com sucesso!", "success");
          openBoard(createdBoard);
          setTimeout(() => {
            openShareModal(createdBoard.id);
          }, 500);
        }
      }

      closeModal("modal-board");
      renderBoardsGrid();
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
// ORGANIZAÇÃO DO MURAL: LAYOUT & ORDENAÇÃO (EXCLUSIVO ADMIN)
// ============================================================================
function openLayoutSortModal() {
  if (!state.activeBoard) return;
  const layout = state.currentLayout || 'masonry';
  let sort = state.currentSort || 'recent';
  const keepPinned = state.keepPinnedTop !== false;

  // Mostra opção de ordenar por data do evento apenas se o mural tiver has_event_date ativado
  const hasEventDate = !!state.activeBoard.has_event_date;
  const eventDateContainer = document.getElementById("sort-opt-event-date-container");
  if (eventDateContainer) {
    eventDateContainer.classList.toggle("hidden", !hasEventDate);
  }

  // Se o mural não tem campo de data ativado mas a ordenação anterior era por data, recua para recente
  if (!hasEventDate && (sort === "event-date-asc" || sort === "event-date-desc")) {
    sort = "recent";
  }

  const layoutRadio = document.querySelector(`input[name="opt_board_layout"][value="${layout}"]`);
  if (layoutRadio) layoutRadio.checked = true;

  const sortRadio = document.querySelector(`input[name="opt_board_sort"][value="${sort}"]`);
  if (sortRadio) sortRadio.checked = true;

  const pinnedToggle = document.getElementById("layout-sort-pinned-toggle");
  if (pinnedToggle) pinnedToggle.checked = keepPinned;

  openModal("modal-layout-sort");
}

async function saveBoardLayoutAndSort() {
  if (!state.activeBoard) return;
  const selectedLayout = document.querySelector('input[name="opt_board_layout"]:checked')?.value || 'masonry';
  const selectedSort = document.querySelector('input[name="opt_board_sort"]:checked')?.value || 'recent';
  const keepPinned = document.getElementById("layout-sort-pinned-toggle")?.checked !== false;

  state.currentLayout = selectedLayout;
  state.currentSort = selectedSort;
  state.keepPinnedTop = keepPinned;

  // Persistir localmente para este mural
  localStorage.setItem(`az_board_layout_${state.activeBoard.id}`, selectedLayout);
  localStorage.setItem(`az_board_sort_${state.activeBoard.id}`, selectedSort);
  localStorage.setItem(`az_board_pinned_${state.activeBoard.id}`, String(keepPinned));

  // Tenta persistir no Supabase (se as colunas existirem na tabela boards)
  if (isUserAdmin()) {
    try {
      const payload = {
        layout: selectedLayout,
        layout_mode: selectedLayout,
        sort_order: selectedSort,
        sort_mode: selectedSort
      };
      await supabaseClient.from("boards").update(payload).eq("id", state.activeBoard.id);
    } catch(e) {
      console.warn("Colunas de layout no Supabase, persistido localmente:", e);
    }
  }

  closeModal("modal-layout-sort");
  renderCardsList();

  const layoutLabels = { masonry: "Cascata (Masonry)", grid: "Grade Alinhada", timeline: "Linha do Tempo" };
  const sortLabels = {
    recent: "Mais recentes",
    oldest: "Mais antigos",
    votes: "Mais votados",
    comments: "Mais comentados",
    "alpha-asc": "Alfabética (A-Z)",
    "alpha-desc": "Alfabética (Z-A)",
    random: "Aleatória / Randômica",
    "event-date-asc": "Data do Evento (Antigos 1º)",
    "event-date-desc": "Data do Evento (Recentes 1º)"
  };
  showToast(`Mural organizado: ${layoutLabels[selectedLayout]} • ${sortLabels[selectedSort]}!`, "success");
}

// ============================================================================
// GESTÃO DE CARDS (POSTAGENS DO MURAL)
// ============================================================================
async function loadCards(boardId, isSilent = false) {
  if (!isSilent) showLoader(true);
  try {
    const { data: cards, error } = await supabaseClient
      .from("cards")
      .select("*, votes(id, voter_email), comments(id, author_name, author_email, comment_text, created_at)")
      .eq("board_id", boardId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!isSilent) showLoader(false);
    if (error) throw error;

    state.cards = (cards || []).map(c => {
      if (c.author_avatar && c.author_email) {
        cacheAuthorAvatar(c.author_email, c.author_avatar);
      }
      if (state.user && state.user.avatarUrl && c.author_email === state.user.email && !c.author_avatar) {
        syncCardAuthorAvatar(c.id, state.user.avatarUrl);
      }
      (c.comments || []).forEach(cm => {
        if (cm.author_avatar && cm.author_email) {
          cacheAuthorAvatar(cm.author_email, cm.author_avatar);
        }
      });
      const userVoted = state.user && c.votes ? c.votes.some(v => (v.voter_email || v.user_email) === state.user.email) : false;
      const cardComments = (c.comments || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const localEventDate = localStorage.getItem("az_card_event_date_" + c.id);
      const eventDate = (c.event_date !== undefined && c.event_date !== null) ? c.event_date : (localEventDate || null);
      return {
        ...c,
        event_date: eventDate,
        vote_count: c.votes ? c.votes.length : 0,
        comment_count: cardComments.length,
        comments_preview: cardComments.slice(0, 3),
        has_voted: userVoted
      };
    });

    updateFabVoteButton();
    renderCardsList();
    updateBoardViewStatusUI();
  } catch (err) {
    if (!isSilent) showLoader(false);
    console.error("Erro ao carregar cards:", err);
  }
}

function updateFabVoteButton() {
  const btnFabVote = document.getElementById("btn-fab-vote-board");
  if (!btnFabVote) return;

  if (!state.activeBoard || !state.activeBoard.vote_mode) {
    btnFabVote.classList.add("hidden");
    return;
  }

  btnFabVote.classList.remove("hidden");

  const hasVoted = state.cards && state.cards.some(c => c.has_voted);
  if (hasVoted) {
    btnFabVote.innerHTML = `
      <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-200 flex-shrink-0"></i>
      <span>Voto Registrado (Alterar)</span>
    `;
    btnFabVote.className = "pl-4 pr-5 py-3.5 rounded-full bg-[#0A2334] hover:bg-[#173057] text-white font-subtitle-semibold text-sm shadow-2xl shadow-black/40 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all border border-emerald-400/40 ring-2 ring-emerald-400/30 cursor-pointer";
    btnFabVote.title = "Seu voto está computado! Clique para alterar sua escolha se desejar.";
  } else {
    btnFabVote.innerHTML = `
      <i data-lucide="check-square" class="w-4 h-4 flex-shrink-0"></i>
      <span>Votar na Enquete</span>
    `;
    btnFabVote.className = "pl-4 pr-5 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-subtitle-semibold text-sm shadow-2xl shadow-black/40 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all border border-white/20 cursor-pointer";
    btnFabVote.title = "Votar na Enquete do Mural";
  }
  if (window.lucide) lucide.createIcons();
}

function getSortableTitle(title) {
  if (!title) return "";
  // Remove emojis e pictogramas unicode
  let cleaned = title
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\uFE0F\u200D]/gu, "")
    // Remove símbolos e pontuações iniciais (ex: "[Projeto]", "- Ideia", "# Tag")
    .replace(/^[\s\-_.,:;!?'"()\[\]{}#*~`^/\\|<>@+=§$%&]+/g, "")
    .trim();
  return cleaned || title.trim();
}

// Ajusta o encaixe vertical estrito da Linha do Tempo para NUNCA haver rolagem vertical no viewport
function adjustTimelineVerticalFit() {
  const vb = document.getElementById("view-board");
  if (!vb || vb.classList.contains("hidden") || state.currentLayout !== "timeline" || !state.activeBoard) {
    document.body.classList.remove("timeline-mode-active");
    if (vb) vb.classList.remove("layout-timeline-active");
    return;
  }

  document.body.classList.add("timeline-mode-active");
  vb.classList.add("layout-timeline-active");
}
window.addEventListener("resize", adjustTimelineVerticalFit);

function renderCardsList() {
  const container = document.getElementById("board-cards-container");
  const empty = document.getElementById("empty-cards-msg");
  if (!container) return;

  container.innerHTML = "";

  // 1. Aplica classe do modo de layout selecionado (masonry, grid ou timeline)
  const layout = state.currentLayout || "masonry";
  container.className = `layout-${layout}`;

  // Ajusta encaixe de viewport estrito quando timeline
  adjustTimelineVerticalFit();

  // 2. Filtro de busca
  let list = [...state.cards];
  if (state.currentSearch) {
    const q = state.currentSearch.toLowerCase();
    list = list.filter(c => 
      (c.title || "").toLowerCase().includes(q) ||
      (c.content || "").toLowerCase().includes(q) ||
      (c.author_name || "").toLowerCase().includes(q)
    );
  }

  // 3. Critério de Ordenação configurado (ordem alfabética ignora emojis e símbolos)
  const sort = state.currentSort || "recent";
  const sortFn = (a, b) => {
    switch (sort) {
      case "event-date-asc": {
        const getCardTimestamp = (c) => {
          if (c.event_date) {
            const d = new Date(c.event_date.length === 10 ? c.event_date + 'T00:00:00' : c.event_date);
            if (!isNaN(d.getTime())) return d.getTime();
          }
          return new Date(c.created_at).getTime();
        };
        return getCardTimestamp(a) - getCardTimestamp(b);
      }
      case "event-date-desc": {
        const getCardTimestamp = (c) => {
          if (c.event_date) {
            const d = new Date(c.event_date.length === 10 ? c.event_date + 'T00:00:00' : c.event_date);
            if (!isNaN(d.getTime())) return d.getTime();
          }
          return new Date(c.created_at).getTime();
        };
        return getCardTimestamp(b) - getCardTimestamp(a);
      }
      case "oldest":
        return new Date(a.created_at) - new Date(b.created_at);
      case "votes":
        return (b.vote_count || 0) - (a.vote_count || 0);
      case "comments":
        return (b.comment_count || 0) - (a.comment_count || 0);
      case "alpha-asc": {
        const normA = getSortableTitle(a.title);
        const normB = getSortableTitle(b.title);
        const cmp = normA.localeCompare(normB, 'pt-BR', { sensitivity: 'base', numeric: true });
        return cmp !== 0 ? cmp : (a.title || "").localeCompare(b.title || "", 'pt-BR');
      }
      case "alpha-desc": {
        const normA = getSortableTitle(a.title);
        const normB = getSortableTitle(b.title);
        const cmp = normB.localeCompare(normA, 'pt-BR', { sensitivity: 'base', numeric: true });
        return cmp !== 0 ? cmp : (b.title || "").localeCompare(a.title || "", 'pt-BR');
      }
      case "recent":
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  };

  if (sort === "random") {
    // Embaralha randomicamente (Fisher-Yates) toda vez que o usuário abre ou atualiza o mural
    const shuffleArray = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    if (state.keepPinnedTop !== false) {
      const pinned = list.filter(c => (c.pinned || c.is_pinned));
      const unpinned = list.filter(c => !(c.pinned || c.is_pinned));
      list = [...shuffleArray(pinned), ...shuffleArray(unpinned)];
    } else {
      list = shuffleArray(list);
    }
  } else {
    if (state.keepPinnedTop !== false) {
      const pinned = list.filter(c => (c.pinned || c.is_pinned));
      const unpinned = list.filter(c => !(c.pinned || c.is_pinned));
      pinned.sort(sortFn);
      unpinned.sort(sortFn);
      list = [...pinned, ...unpinned];
    } else {
      list.sort(sortFn);
    }
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
    cardEl.className = `masonry-item glass-card ${themeClass} rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between relative group animate-fade-in`;

    // Renderização de Mídia (Foto ou Vídeo)
    let mediaHtml = "";
    if (card.media_type === "image" && card.media_url) {
      mediaHtml = `
        <div class="mt-2 rounded-xl overflow-hidden cursor-pointer max-h-44 sm:max-h-48 bg-black/5 flex items-center justify-center btn-zoom-media" data-url="${card.media_url}">
          <img src="${card.media_url}" class="w-full h-auto object-cover max-h-44 sm:max-h-48 hover:scale-105 transition-transform duration-300" loading="lazy" alt="${escapeHtml(card.title)}">
        </div>
      `;
    } else if (card.media_type === "youtube" && card.media_url) {
      const ytId = extractYouTubeId(card.media_url);
      if (ytId) {
        mediaHtml = `
          <div class="mt-2.5 rounded-xl overflow-hidden aspect-video bg-black">
            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        `;
      }
    } else if (card.media_type === "video" && card.media_url) {
      mediaHtml = `
        <div class="mt-2.5 rounded-xl overflow-hidden aspect-video bg-black/10 flex items-center justify-center">
          <a href="${card.media_url}" target="_blank" class="px-2.5 py-1.5 bg-white rounded-xl text-xs font-subtitle-semibold text-[#0A2334] shadow flex items-center gap-1.5 hover:bg-gray-50">
            <i data-lucide="play-circle" class="w-3.5 h-3.5 text-[#D75B36]"></i> Assistir no Google Drive
          </a>
        </div>
      `;
    }

    // Prévia de comentários (até 3 primeiros comentários)
    let commentsPreviewHtml = "";
    if (card.comments_preview && card.comments_preview.length > 0) {
      const snippets = card.comments_preview.map(cm => `
        <div class="text-[11px] bg-black/5 hover:bg-black/10 rounded-xl p-2 transition-colors cursor-pointer btn-open-comments" data-id="${card.id}">
          <div class="flex items-center justify-between gap-1.5 mb-0.5">
            <div class="flex items-center gap-1.5 min-w-0">
              ${renderAuthorAvatar(cm.author_email, cm.author_name, cm.author_avatar, "w-4 h-4", "text-[8px]")}
              <span class="font-body-medium text-gray-800 text-[11px] truncate font-medium">${escapeHtml(cm.author_name || 'Colaborador')}</span>
            </div>
            <span class="text-[9px] text-gray-600 flex-shrink-0">${formatDate(cm.created_at)}</span>
          </div>
          <p class="text-gray-600 line-clamp-2 leading-tight pl-5.5">${escapeHtml(cm.comment_text || '')}</p>
        </div>
      `).join("");

      const moreCommentsBtn = card.comment_count > 3
        ? `<button type="button" class="btn-open-comments text-left text-[11px] font-body-medium text-[#D75B36] hover:text-[#b84523] pt-0.5 px-1 flex items-center gap-1 cursor-pointer transition-colors font-medium" data-id="${card.id}">
             <span>Ver todos os ${card.comment_count} comentários</span>
             <i data-lucide="arrow-right" class="w-3 h-3"></i>
           </button>`
        : `<button type="button" class="btn-open-comments text-left text-[10px] font-body-medium text-gray-600 hover:text-[#0A2334] pt-0.5 px-1 flex items-center gap-1 cursor-pointer transition-colors font-medium" data-id="${card.id}">
             <i data-lucide="message-square-plus" class="w-3 h-3 text-[#D75B36]"></i>
             <span>Adicionar comentário...</span>
           </button>`;

      commentsPreviewHtml = `
        <div class="mt-2.5 pt-2 border-t border-gray-100/90 flex flex-col gap-1.5">
          ${snippets}
          ${moreCommentsBtn}
        </div>
      `;
    }

    cardEl.innerHTML = `
      <!-- Cabeçalho do Card (Fixo) -->
      <div class="card-header-section flex-shrink-0 flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-wrap">
          ${(card.pinned || card.is_pinned) ? '<i data-lucide="pin" class="w-3.5 h-3.5 text-[#D75B36] flex-shrink-0 fill-[#D75B36]" title="Fixado no Topo"></i>' : ''}
          <h4 class="font-title text-xs sm:text-sm text-[#0A2334] leading-snug font-semibold line-clamp-2">${escapeHtml(card.title)}</h4>
          ${card.event_date ? `
            <span class="px-2 py-0.5 rounded-full text-[9px] font-subtitle-semibold bg-[#173057]/10 text-[#173057] border border-[#173057]/20 flex items-center gap-1 shadow-2xs flex-shrink-0" title="Data do Evento">
              <i data-lucide="calendar" class="w-2.5 h-2.5 text-[#D75B36]"></i> ${formatEventDate(card.event_date)}
            </span>
          ` : ''}
          ${card.has_voted ? `
            <span class="px-2 py-0.5 rounded-full text-[9px] font-subtitle-semibold bg-emerald-600 text-white font-bold flex items-center gap-1 shadow-xs flex-shrink-0" title="Você votou neste card na enquete">
              <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Seu Voto
            </span>
          ` : ''}
        </div>
        ${isOwnerOrAdmin ? `
          <div class="relative group/menu flex-shrink-0">
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

      <!-- Área de Conteúdo do Card (Rola internamente se exceder) -->
      <div class="card-content-scroll flex-1 min-h-0 overflow-y-auto">
        <!-- Conteúdo de Texto -->
        ${card.content ? `<p class="font-body text-[11px] sm:text-xs text-gray-700 mt-1.5 whitespace-pre-line leading-relaxed">${escapeHtml(card.content)}</p>` : ''}

        <!-- Mídia -->
        ${mediaHtml}

        <!-- Prévia de Comentários Inline -->
        ${commentsPreviewHtml}
      </div>

      <!-- Rodapé do Card (Fixo) -->
      <div class="card-footer-section flex-shrink-0 pt-2 mt-auto border-t border-gray-100/80 flex items-center justify-between text-[11px] text-gray-600">
        <div class="flex items-center gap-1.5 line-clamp-1 min-w-0">
          ${renderAuthorAvatar(card.author_email, card.author_name, card.author_avatar, "w-5 h-5", "text-[9px]")}
          <span class="font-body-medium text-gray-600 truncate text-[10px] sm:text-[11px]">${escapeHtml(card.author_name || 'Colaborador')}</span>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Comentários -->
          <button type="button" class="btn-open-comments flex items-center gap-1.5 text-gray-600 hover:text-[#0A2334] px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all cursor-pointer" data-id="${card.id}" title="${card.comment_count > 0 ? 'Ver comentários' : 'Adicionar comentário'}">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-[#D75B36]"></i>
            <span class="font-subtitle-semibold text-xs text-gray-600">${card.comment_count > 0 ? card.comment_count : 'Comentar'}</span>
          </button>
        </div>
      </div>
    `;

    if (layout === "timeline") {
      const wrapper = document.createElement("div");
      wrapper.className = "timeline-item animate-fade-in";
      
      const isDateSort = sort === "event-date-asc" || sort === "event-date-desc";
      const displayDate = card.event_date 
        ? formatEventDate(card.event_date) 
        : (isDateSort ? "Sem data" : formatDate(card.created_at));

      const badgeTitle = card.event_date 
        ? `Data do Evento: ${formatEventDate(card.event_date)}` 
        : `Postado em: ${formatDate(card.created_at)}`;

      wrapper.innerHTML = `
        <div class="timeline-date-badge" title="${badgeTitle}">
          <i data-lucide="calendar" class="w-3 h-3 text-cyan-300"></i>
          <span>${displayDate}</span>
        </div>
        <div class="timeline-node">
          <i data-lucide="sparkles" class="w-2.5 h-2.5 text-white"></i>
        </div>
        <div class="timeline-stem"></div>
      `;
      wrapper.appendChild(cardEl);
      container.appendChild(wrapper);
    } else {
      container.appendChild(cardEl);
    }
  });

  if (window.lucide) lucide.createIcons();

  // Suporte a scroll lateral horizontal com a roda do mouse na Linha do Tempo
  if (container && !container._hasTimelineWheel) {
    container._hasTimelineWheel = true;
    container.addEventListener("wheel", (e) => {
      if (state.currentLayout === "timeline" && e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY * 1.4;
      }
    }, { passive: false });
  }

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
  if (state.activeBoard?.is_closed && !isUserAdmin()) {
    showToast("Este mural está encerrado para novas participações.", "warning");
    return;
  }

  if (isUserBlockedBySinglePost()) {
    showToast("Este mural opera com participação única (1 card por pessoa) e você já enviou seu post!", "warning");
    return;
  }

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

  // Data do Evento / Foto (se ativada no mural)
  const hasEventDate = !!(state.activeBoard && state.activeBoard.has_event_date);
  const eventDateContainer = document.getElementById("card-event-date-container");
  if (eventDateContainer) eventDateContainer.classList.toggle("hidden", !hasEventDate);
  const eventDateInput = document.getElementById("card-event-date-input");
  if (eventDateInput) eventDateInput.value = "";

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

  // Data do Evento / Foto (se ativada no mural ou se o card já possuir data)
  const hasEventDate = !!(state.activeBoard && state.activeBoard.has_event_date) || !!card.event_date;
  const eventDateContainer = document.getElementById("card-event-date-container");
  if (eventDateContainer) eventDateContainer.classList.toggle("hidden", !hasEventDate);
  const eventDateInput = document.getElementById("card-event-date-input");
  if (eventDateInput) eventDateInput.value = card.event_date || "";

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

  if (state.activeBoard.is_closed && !isUserAdmin()) {
    showToast("Este mural está encerrado para novas postagens.", "error");
    return;
  }

  const id = document.getElementById("card-id-hidden").value;
  const title = document.getElementById("card-title-input").value.trim();
  const content = document.getElementById("card-content-input").value.trim();
  const color = document.getElementById("card-color-hidden").value || "white";
  const eventDate = document.getElementById("card-event-date-input")?.value || null;

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
      // Edição: preserva estritamente o autor original (nome, email e foto/avatar)
      const existing = state.cards.find(c => c.id === id);
      const isOriginalAuthor = existing && state.user?.email && 
        String(existing.author_email).toLowerCase().trim() === String(state.user.email).toLowerCase().trim();

      const updatePayload = {
        title: title,
        content: content,
        card_color: color,
        pinned: isPinned,
        media_type: mediaType
      };
      if (mediaUrl) updatePayload.media_url = mediaUrl;
      if (state.activeBoard?.has_event_date || eventDate) {
        updatePayload.event_date = eventDate || null;
      }
      // Atualiza o avatar apenas se for o próprio autor editando seu próprio card
      if (isOriginalAuthor && state.user?.avatarUrl) {
        updatePayload.author_avatar = state.user.avatarUrl;
      }

      localStorage.setItem("az_card_event_date_" + id, eventDate || "");

      let { error } = await supabaseClient.from("cards").update(updatePayload).eq("id", id);
      if (error && (error.message?.includes("event_date") || error.code === "PGRST204")) {
        delete updatePayload.event_date;
        const retry = await supabaseClient.from("cards").update(updatePayload).eq("id", id);
        error = retry.error;
      }
      if (error && (error.message?.includes("author_avatar") || error.code === "PGRST204")) {
        delete updatePayload.author_avatar;
        const retry = await supabaseClient.from("cards").update(updatePayload).eq("id", id);
        error = retry.error;
      }
      if (error) throw error;
      showToast("Card atualizado!", "success");
    } else {
      // Criação: valida se usuário já atingiu o limite de 1 card
      if (isUserBlockedBySinglePost()) {
        showToast("Você já atingiu o limite de 1 card para este mural.", "warning");
        showLoader(false);
        return;
      }

      const insertPayload = {
        board_id: state.activeBoard.id,
        title: title,
        content: content,
        card_color: color,
        pinned: isPinned,
        media_type: mediaType,
        media_url: mediaUrl,
        event_date: eventDate || null,
        author_name: state.user?.name || "Colaborador",
        author_email: state.user?.email || MASTER_ADMIN,
        author_avatar: state.user?.avatarUrl || ""
      };

      let { data: insertedCards, error } = await supabaseClient.from("cards").insert([insertPayload]).select();
      if (error && (error.message?.includes("event_date") || error.code === "PGRST204")) {
        delete insertPayload.event_date;
        const retry = await supabaseClient.from("cards").insert([insertPayload]).select();
        error = retry.error;
        insertedCards = retry.data;
      }
      if (error && (error.message?.includes("author_avatar") || error.code === "PGRST204")) {
        delete insertPayload.author_avatar;
        const retry = await supabaseClient.from("cards").insert([insertPayload]).select();
        error = retry.error;
        insertedCards = retry.data;
      }
      if (error) throw error;
      if (insertedCards && insertedCards[0] && eventDate) {
        localStorage.setItem("az_card_event_date_" + insertedCards[0].id, eventDate);
      }
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

/**
 * Comprime e redimensiona uma imagem no navegador antes do upload.
 * Reduz fotos pesadas de celulares (5-10MB) para ~150-250KB sem perda visual perceptível,
 * economizando até 95% de banda e acelerando o carregamento dos cards para todos.
 */
async function compressImageFile(file, options = {}) {
  if (!file || !file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const maxWidth = options.maxWidth || 1600;
  const maxHeight = options.maxHeight || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.82;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Se já couber nos limites e for menor que 300KB, mantém original
        if (width <= maxWidth && height <= maxHeight && file.size < 300 * 1024) {
          return resolve(file);
        }

        // Mantém a proporção de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }

          const originalName = file.name || "foto.jpg";
          const newName = originalName.replace(/\.[^.]+$/, "") + ".jpg";
          const compressedFile = new File([blob], newName, {
            type: "image/jpeg",
            lastModified: Date.now()
          });

          console.log(`[AZ Board] Foto comprimida: ${(file.size / 1024).toFixed(0)}KB ➔ ${(compressedFile.size / 1024).toFixed(0)}KB (-${Math.round((1 - compressedFile.size / file.size) * 100)}%)`);
          resolve(compressedFile);
        }, "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Upload direto para o bucket board-media do Supabase Storage
async function uploadImageToSupabaseStorage(file) {
  const fileToUpload = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
  const fileExt = fileToUpload.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const progressBar = document.getElementById("card-upload-progress-bar");
  const progressBox = document.getElementById("card-file-upload-progress");
  if (progressBox) progressBox.classList.remove("hidden");
  if (progressBar) progressBar.style.width = "45%";

  const { data, error } = await supabaseClient.storage
    .from("board-media")
    .upload(filePath, fileToUpload, {
      cacheControl: "31536000",
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

async function openVotingModal() {
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

  // Busca se o usuário já votou neste mural
  let currentVotedCardId = null;
  if (supabaseClient && state.activeBoard) {
    try {
      const { data: userVote } = await supabaseClient
        .from("votes")
        .select("card_id")
        .eq("board_id", state.activeBoard.id)
        .eq("voter_email", state.user.email)
        .maybeSingle();
      if (userVote) {
        currentVotedCardId = userVote.card_id;
      }
    } catch (e) {
      console.warn("Erro ao carregar voto do usuário:", e);
    }
  }

  container.innerHTML = "";

  // Mensagem/aviso no topo do modal se o usuário já tiver votado
  const noticeEl = document.getElementById("vote-modal-notice");
  if (noticeEl) {
    if (currentVotedCardId) {
      noticeEl.innerHTML = `
        <div class="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fade-in">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 flex-shrink-0"></i>
          <div>
            <span class="font-subtitle-semibold font-bold">Você já votou nesta enquete!</span>
            <p class="text-[11px] text-emerald-700 mt-0.5">Seu voto atual está destacado abaixo. Para alterar seu voto, selecione outro card e clique em "Alterar Meu Voto".</p>
          </div>
        </div>
      `;
      noticeEl.classList.remove("hidden");
    } else {
      noticeEl.innerHTML = "";
      noticeEl.classList.add("hidden");
    }
  }

  const btnSubmitVote = document.getElementById("btn-submit-vote");
  if (btnSubmitVote) {
    btnSubmitVote.textContent = currentVotedCardId ? "Alterar Meu Voto" : "Confirmar Meu Voto";
  }

  state.cards.forEach(card => {
    const isCurrentVote = card.id === currentVotedCardId;
    const authorInitial = (card.author_name || "A").charAt(0).toUpperCase();
    const opt = document.createElement("label");
    opt.className = `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
      isCurrentVote 
        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' 
        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    }`;
    opt.innerHTML = `
      <input type="radio" name="vote_selected_card" value="${card.id}" ${isCurrentVote ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 truncate">
            <p class="font-title text-xs text-[#0A2334] font-semibold truncate">${escapeHtml(card.title)}</p>
            ${isCurrentVote ? `
              <span class="px-2 py-0.5 rounded-full text-[9px] font-subtitle-semibold bg-emerald-600 text-white font-bold flex items-center gap-1 shadow-xs flex-shrink-0">
                <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Seu Voto Atual
              </span>
            ` : ''}
          </div>
          <span class="inline-flex items-center gap-1.5 text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-lg border border-gray-200 flex-shrink-0 shadow-xs">
            ${renderAuthorAvatar(card.author_email, card.author_name, card.author_avatar, "w-4 h-4", "text-[8px]")}
            <span class="font-body-medium text-gray-700 truncate max-w-[120px]">${escapeHtml(card.author_name || 'Colaborador')}</span>
          </span>
        </div>
        <p class="font-body text-[11px] text-gray-500 line-clamp-1 mt-1">${escapeHtml(card.content || 'Sem descrição')}</p>
      </div>
    `;
    container.appendChild(opt);
  });

  if (window.lucide) lucide.createIcons();
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
    await supabaseClient.from("votes").delete().match({ board_id: state.activeBoard.id, voter_email: state.user.email });

    // Insere o novo voto
    const { error } = await supabaseClient.from("votes").insert([{
      board_id: state.activeBoard.id,
      card_id: selected,
      voter_email: state.user.email
    }]);
    if (error) throw error;

    closeModal("modal-vote");
    showToast("Seu voto oficial na enquete foi registrado!", "success");
    if (state.activeBoard) await loadCards(state.activeBoard.id, true);
  } catch (err) {
    showToast("Erro ao registrar voto: " + err.message, "error");
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

async function renderVoteStats() {
  const canvas = document.getElementById("vote-chart-canvas");
  const rankingsContainer = document.getElementById("vote-rankings-table");
  const votersBreakdownContainer = document.getElementById("vote-voters-breakdown");
  const totalVotersBadge = document.getElementById("vote-stats-total-voters");
  if (!canvas || !state.cards) return;

  // Carrega todos os votos deste mural do Supabase para apuração detalhada
  let allVotes = [];
  if (supabaseClient && state.activeBoard) {
    try {
      const { data } = await supabaseClient
        .from("votes")
        .select("*")
        .eq("board_id", state.activeBoard.id);
      if (data) allVotes = data;
    } catch(e) {
      console.warn("Erro ao carregar lista de votantes:", e);
    }
  }

  // Agrupa votos por card_id
  const votesByCard = {};
  allVotes.forEach(v => {
    if (!votesByCard[v.card_id]) votesByCard[v.card_id] = [];
    votesByCard[v.card_id].push(v);
  });

  if (totalVotersBadge) {
    totalVotersBadge.textContent = `${allVotes.length} ${allVotes.length === 1 ? 'voto registrado' : 'votos registrados'}`;
  }

  // Ordenar por votos
  const sorted = [...state.cards].map(c => {
    const cardVotes = votesByCard[c.id] || [];
    return {
      ...c,
      vote_count: cardVotes.length,
      voters: cardVotes
    };
  }).sort((a, b) => b.vote_count - a.vote_count);

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
              ${renderAuthorAvatar(card.author_email, card.author_name, card.author_avatar, "w-4 h-4", "text-[8px]")}
              <span class="truncate">Por: ${escapeHtml(card.author_name || 'Colaborador')}</span>
            </div>
          </div>
        </div>
        <span class="font-title text-[#D75B36] font-bold text-xs flex-shrink-0 bg-white px-2 py-0.5 rounded-lg border border-gray-100">${card.vote_count} ${card.vote_count === 1 ? 'voto' : 'votos'}</span>
      `;
      rankingsContainer.appendChild(row);
    });
  }

  // Relação Detalhada: Quem votou em quem
  if (votersBreakdownContainer) {
    votersBreakdownContainer.innerHTML = "";
    const cardsWithVotes = sorted.filter(c => c.vote_count > 0);
    if (cardsWithVotes.length === 0) {
      votersBreakdownContainer.innerHTML = `
        <div class="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Nenhum voto foi registrado ainda nesta enquete.
        </div>
      `;
    } else {
      cardsWithVotes.forEach(card => {
        const item = document.createElement("div");
        item.className = "p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs";
        
        const votersListHtml = card.voters.map(v => {
          const email = v.voter_email || "";
          let vName = email.split("@")[0].replace(/\./g, " ");
          vName = vName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const initial = vName.charAt(0).toUpperCase();
          return `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-200 shadow-xs text-[11px] font-body">
              <span class="w-4 h-4 rounded-full bg-[#173057] text-white flex items-center justify-center font-bold text-[8px] flex-shrink-0">${initial}</span>
              <span class="font-semibold text-gray-800">${escapeHtml(vName)}</span>
              <span class="text-gray-400 text-[10px]">(${escapeHtml(email)})</span>
            </span>
          `;
        }).join("");

        item.innerHTML = `
          <div class="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-200">
            <span class="font-title text-xs text-[#0A2334] font-semibold truncate">${escapeHtml(card.title)}</span>
            <span class="px-2 py-0.5 rounded-md bg-[#D75B36] text-white font-bold text-[10px] flex-shrink-0">
              ${card.vote_count} ${card.vote_count === 1 ? 'voto' : 'votos'}
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${votersListHtml}
          </div>
        `;
        votersBreakdownContainer.appendChild(item);
      });
    }
  }

  // Atualiza cache de apuração para exportação CSV completa
  state.cachedVoteBreakdown = sorted;
  if (window.lucide) lucide.createIcons();
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
  const list = state.cachedVoteBreakdown || state.cards || [];
  let csv = "Posicao,Titulo do Card,Autor do Card,Total de Votos,Quem Votou (Emails)\n";
  list.forEach((c, idx) => {
    const votersStr = (c.voters || []).map(v => v.voter_email).join("; ");
    csv += `"${idx + 1}","${(c.title || '').replace(/"/g, '""')}","${(c.author_name || '').replace(/"/g, '""')}","${c.vote_count || 0}","${votersStr}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `apuracao_votos_${state.activeBoard?.title || 'mural'}.csv`;
  link.click();
  showToast("CSV de apuração detalhado exportado!", "success");
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
    (comments || []).forEach(cm => {
      if (cm.author_avatar && cm.author_email) {
        cacheAuthorAvatar(cm.author_email, cm.author_avatar);
      }
    });
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
        <div class="flex items-center gap-2">
          ${renderAuthorAvatar(c.author_email, c.author_name, c.author_avatar, "w-5 h-5", "text-[9px]")}
          <span class="font-body-medium text-gray-800 text-xs font-medium">${escapeHtml(c.author_name || 'Colaborador')}</span>
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
      <p class="font-body text-gray-600 pl-7 leading-relaxed">${escapeHtml(c.comment_text || c.content)}</p>
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
    const commentPayload = {
      card_id: state.activeCardForComments,
      comment_text: content,
      author_name: state.user?.name || "Colaborador",
      author_email: state.user?.email || MASTER_ADMIN,
      author_avatar: state.user?.avatarUrl || ""
    };

    let { error } = await supabaseClient.from("comments").insert([commentPayload]);
    if (error && (error.message?.includes("author_avatar") || error.code === "PGRST204")) {
      delete commentPayload.author_avatar;
      const retry = await supabaseClient.from("comments").insert([commentPayload]);
      error = retry.error;
    }
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
  document.getElementById("btn-logout")?.addEventListener("click", signOut);
  document.getElementById("btn-logout-drawer")?.addEventListener("click", signOut);
  document.getElementById("btn-dashboard-logout")?.addEventListener("click", signOut);

  // Gaveta Retrátil de Admin & Alternador de Visão
  document.getElementById("btn-admin-tab-toggle")?.addEventListener("click", () => toggleAdminDrawer());
  document.getElementById("btn-view-mode-admin")?.addEventListener("click", () => setViewMode("admin"));
  document.getElementById("btn-view-mode-user")?.addEventListener("click", () => setViewMode("user"));
  document.getElementById("btn-manage-admins-drawer")?.addEventListener("click", openAdminManagementModal);

  // Navegação
  document.getElementById("header-logo-home")?.addEventListener("click", showDashboardView);
  document.getElementById("btn-back-to-dashboard")?.addEventListener("click", showDashboardView);
  document.getElementById("btn-board-canvas-back")?.addEventListener("click", showDashboardView);

  // Criação & Configuração de Mural
  document.getElementById("btn-create-board-hero")?.addEventListener("click", openNewBoardModal);
  document.getElementById("btn-create-board-empty")?.addEventListener("click", openNewBoardModal);
  document.getElementById("btn-create-board-drawer")?.addEventListener("click", openNewBoardModal);
  document.getElementById("btn-toggle-board-status-drawer")?.addEventListener("click", () => {
    if (state.activeBoard) toggleBoardOpenClose(state.activeBoard.id);
  });
  document.getElementById("btn-reopen-board-banner")?.addEventListener("click", () => {
    if (state.activeBoard) toggleBoardOpenClose(state.activeBoard.id);
  });
  document.getElementById("btn-board-settings")?.addEventListener("click", () => {
    if (state.activeBoard) openEditBoardModal(state.activeBoard.id);
  });
  document.getElementById("btn-board-layout-sort")?.addEventListener("click", openLayoutSortModal);
  document.getElementById("btn-save-layout-sort")?.addEventListener("click", saveBoardLayoutAndSort);

  // Alternância instantânea ao mudar o modo de votação no modal (atualização na hora)
  document.getElementById("board-vote-mode-toggle")?.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    const boardId = document.getElementById("board-id-hidden")?.value || state.activeBoard?.id;
    
    if (state.activeBoard && (!boardId || state.activeBoard.id === boardId)) {
      state.activeBoard.vote_mode = isChecked;
      updateBoardViewStatusUI();
    }
    if (boardId) {
      const bObj = (state.boards || []).find(b => b.id === boardId);
      if (bObj) bObj.vote_mode = isChecked;
      try {
        await supabaseClient.from("boards").update({ vote_mode: isChecked }).eq("id", boardId);
      } catch (err) {
        console.warn("Auto-sync vote_mode failed:", err);
      }
    }
  });

  // Alternância instantânea ao mudar o modo de participação única no modal
  document.getElementById("board-single-post-toggle")?.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    const boardId = document.getElementById("board-id-hidden")?.value || state.activeBoard?.id;

    if (state.activeBoard && (!boardId || state.activeBoard.id === boardId)) {
      state.activeBoard.single_post_mode = isChecked;
      updateBoardViewStatusUI();
    }
    if (boardId) {
      const bObj = (state.boards || []).find(b => b.id === boardId);
      if (bObj) bObj.single_post_mode = isChecked;
      localStorage.setItem("az_board_single_post_" + boardId, isChecked ? "true" : "false");
      try {
        await supabaseClient.from("boards").update({ single_post_mode: isChecked }).eq("id", boardId);
      } catch (err) {
        console.warn("Auto-sync single_post_mode failed:", err);
      }
    }
  });

  // Alternância instantânea ao mudar o campo de data do evento no modal
  document.getElementById("board-event-date-toggle")?.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    const boardId = document.getElementById("board-id-hidden")?.value || state.activeBoard?.id;

    if (state.activeBoard && (!boardId || state.activeBoard.id === boardId)) {
      state.activeBoard.has_event_date = isChecked;
      renderCardsList();
    }
    if (boardId) {
      const bObj = (state.boards || []).find(b => b.id === boardId);
      if (bObj) bObj.has_event_date = isChecked;
      localStorage.setItem("az_board_has_event_date_" + boardId, isChecked ? "true" : "false");
      try {
        await supabaseClient.from("boards").update({ has_event_date: isChecked }).eq("id", boardId);
      } catch (err) {
        console.warn("Auto-sync has_event_date failed:", err);
      }
    }
  });

  // Criação de Card & Votação Flutuante
  document.getElementById("btn-add-card-header")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-add-card-empty")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-fab-add-card")?.addEventListener("click", openNewCardModal);
  document.getElementById("btn-fab-vote-board")?.addEventListener("click", openVotingModal);

  // Ações do Mural & Compartilhamento
  document.getElementById("btn-share-board-canvas")?.addEventListener("click", () => {
    if (state.activeBoard) openShareModal(state.activeBoard.id);
  });
  document.getElementById("btn-share-board-header")?.addEventListener("click", () => {
    if (state.activeBoard) openShareModal(state.activeBoard.id);
  });
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

  document.getElementById("card-file-input")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Redimensiona e comprime automaticamente no navegador
    const optimized = await compressImageFile(file);
    state.pendingMediaFile = optimized;

    const reader = new FileReader();
    reader.onload = (evt) => {
      document.getElementById("card-media-preview-container")?.classList.remove("hidden");
      const kb = (optimized.size / 1024).toFixed(0);
      document.getElementById("card-media-preview").innerHTML = `
        <div class="relative inline-block group">
          <img src="${evt.target.result}" class="max-h-36 object-contain rounded shadow">
          <span class="absolute bottom-1 right-1 bg-black/75 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 shadow-sm">
            <i data-lucide="zap" class="w-2.5 h-2.5 text-emerald-400"></i> ${kb} KB otimizada
          </span>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    };
    reader.readAsDataURL(optimized);
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
    const isLight = isLightBackground("color", c.value);
    item.innerHTML = `
      <div class="w-6 h-6 rounded-lg shadow-sm flex-shrink-0 flex items-center justify-center border border-black/15 ${isLight ? 'text-gray-900' : 'text-white'}" style="background-color: ${c.value}">
        <i data-lucide="check" class="w-3.5 h-3.5 opacity-0 check-icon stroke-[2.5]"></i>
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

  const fileToUpload = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
  const fileExt = fileToUpload.name.split('.').pop();
  const fileName = `bg_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `backgrounds/${fileName}`;

  const progressBox = document.getElementById("board-bg-upload-progress");
  const progressBar = document.getElementById("board-bg-progress-bar");
  if (progressBox) progressBox.classList.remove("hidden");
  if (progressBar) progressBar.style.width = "40%";

  try {
    const { error } = await supabaseClient.storage
      .from("board-media")
      .upload(filePath, fileToUpload, {
        cacheControl: "31536000",
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

function formatEventDate(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const parts = val.split("-");
    const d = parts[2];
    const m = parts[1];
    const y = parts[0];
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch (e) {
    return String(val);
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
