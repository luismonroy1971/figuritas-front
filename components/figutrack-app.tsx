import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch, extractMessage } from "@/lib/api";

type Role = "admin" | "usuario";
type FilterKey = "all" | "missing" | "repeated";
type ViewKey = "catalogo" | "coleccion" | "matches" | "perfil" | "admin";

type User = {
  id: number;
  name: string;
  email: string | null;
  celular: string | null;
  rol: Role;
};

type Progress = {
  owned: number;
  total: number;
  missing: number;
  repeated: number;
  percentage: number;
};

type Album = {
  id: number;
  nombre: string;
  editorial: string;
  edicion: string | null;
  anio: number | null;
  descripcion: string | null;
  portada_url: string | null;
  total_stickers: number;
  activo: boolean;
  is_collecting?: boolean;
  fecha_inicio?: string | null;
  progress: Progress | null;
};

type StickerState = {
  tiene: boolean;
  repetidas: number;
  status: "missing" | "owned" | "repeated";
};

type StickerItem = {
  id: number;
  codigo: string;
  nombre: string | null;
  categoria: string | null;
  tipo: string;
  imagen_url: string | null;
  state: StickerState;
};

type StickerTab = {
  key: string;
  label: string;
  count: number;
  stickers: StickerItem[];
};

type ControlPayload = {
  album: {
    id: number;
    nombre: string;
    editorial: string;
    edicion: string | null;
    anio: number | null;
    descripcion: string | null;
    portada_url: string | null;
  };
  progress: Progress;
  filters: Record<FilterKey, string>;
  tabs: StickerTab[];
};

type MatchSticker = {
  id: number;
  codigo: string;
  nombre: string | null;
  categoria: string | null;
  tipo: string;
  repetidas: number;
};

type MatchItem = {
  user: {
    id: number;
    name: string;
  };
  they_offer: MatchSticker[];
  i_offer: MatchSticker[];
  score: number;
  summary: string;
};

type ContactPayload = {
  user: {
    id: number;
    name: string;
    email: string | null;
    celular: string | null;
    whatsapp_url: string | null;
    email_url: string | null;
  };
  privacy_notice: string;
};

type AdminStats = {
  totals: {
    users: number;
    albums: number;
    active_albums: number;
    stickers: number;
  };
  top_missing_stickers: Array<{
    id: number;
    codigo: string;
    nombre: string | null;
    album_nombre: string;
    missing_count: number;
  }>;
};

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
};

type CsvImportSummary = {
  imported: number;
  cleared: number;
  skipped: number;
  not_found_codes: string[];
};

type CsvImportResponse = {
  message: string;
  summary: CsvImportSummary;
  progress: Progress;
};

type ShareLinkResponse = {
  message: string;
  share_key: string;
  share_path: string;
  album: {
    id: number;
    nombre: string;
  };
};

type AlbumForm = {
  nombre: string;
  editorial: string;
  edicion: string;
  anio: string;
  descripcion: string;
  portada_url: string;
  total_stickers: string;
  activo: boolean;
};

type StickerForm = {
  codigo: string;
  nombre: string;
  categoria: string;
  tipo: string;
  imagen_url: string;
};

const emptyAlbumForm: AlbumForm = {
  nombre: "",
  editorial: "",
  edicion: "",
  anio: "",
  descripcion: "",
  portada_url: "",
  total_stickers: "",
  activo: true,
};

const emptyStickerForm: StickerForm = {
  codigo: "",
  nombre: "",
  categoria: "",
  tipo: "normal",
  imagen_url: "",
};

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-400";
const lightInputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700";
const miniButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60";

export default function FiguTrackApp() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [view, setView] = useState<ViewKey>("catalogo");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirmation, setShowRegisterPasswordConfirmation] =
    useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirmation, setShowNewPasswordConfirmation] =
    useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [savingStickerId, setSavingStickerId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Album[]>([]);
  const [myAlbums, setMyAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [control, setControl] = useState<ControlPayload | null>(null);
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  const [stickerSearch, setStickerSearch] = useState("");
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [contact, setContact] = useState<ContactPayload | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminAlbums, setAdminAlbums] = useState<Album[]>([]);
  const [adminSelectedAlbumId, setAdminSelectedAlbumId] = useState<
    number | null
  >(null);
  const [adminStickers, setAdminStickers] = useState<StickerItem[]>([]);
  const [editingAlbumId, setEditingAlbumId] = useState<number | null>(null);
  const [editingStickerId, setEditingStickerId] = useState<number | null>(null);
  const [albumForm, setAlbumForm] = useState<AlbumForm>(emptyAlbumForm);
  const [stickerForm, setStickerForm] = useState<StickerForm>(emptyStickerForm);
  const [bulkCantidad, setBulkCantidad] = useState("12");
  const [bulkCategoria, setBulkCategoria] = useState("General");
  const [bulkTipo, setBulkTipo] = useState("normal");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvClearBefore, setCsvClearBefore] = useState(false);
  const [csvInputKey, setCsvInputKey] = useState(0);
  const [csvImportSummary, setCsvImportSummary] = useState<CsvImportSummary | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creatingShareLink, setCreatingShareLink] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    celular: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    celular: "",
    password: "",
    password_confirmation: "",
  });

  const selectedAlbum = useMemo(
    () => myAlbums.find((album) => album.id === selectedAlbumId) ?? null,
    [myAlbums, selectedAlbumId],
  );

  const activeTab = useMemo(
    () => control?.tabs.find((tab) => tab.key === activeTabKey) ?? control?.tabs[0] ?? null,
    [activeTabKey, control],
  );

  const searchableStickers = useMemo(() => {
    if (!control) {
      return [] as StickerItem[];
    }

    const query = stickerSearch.trim();
    if (query !== "") {
      return control.tabs.flatMap((tab) => tab.stickers);
    }

    return activeTab?.stickers ?? [];
  }, [activeTab, control, stickerSearch]);

  const visibleStickers = useMemo(() => {
    if (!searchableStickers.length) {
      return [] as StickerItem[];
    }

    const normalizedSearch = stickerSearch.trim().toLowerCase();

    return searchableStickers.filter((sticker) => {
      if (
        normalizedSearch &&
        !sticker.codigo.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (filterKey === "missing") {
        return sticker.state.status === "missing";
      }

      if (filterKey === "repeated") {
        return sticker.state.status === "repeated";
      }

      return true;
    });
  }, [filterKey, searchableStickers, stickerSearch]);

  const selectedAdminAlbum = useMemo(
    () => adminAlbums.find((album) => album.id === adminSelectedAlbumId) ?? null,
    [adminAlbums, adminSelectedAlbumId],
  );

  const shareWhatsappUrl = useMemo(() => {
    if (!shareUrl || !control) {
      return null;
    }

    const text = `Te comparto mi lista de ${control.album.nombre} en FiguTrack. Me faltan ${control.progress.missing} figuritas y tengo ${control.progress.repeated} repetidas para intercambiar. ${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [control, shareUrl]);

  const shareQrUrl = useMemo(() => {
    if (!shareUrl) {
      return null;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  function notify(
    title: string,
    description?: string,
    tone: Toast["tone"] = "info",
  ) {
    setToasts((current) => [
      ...current,
      { id: Date.now() + Math.random(), title, description, tone },
    ]);
  }

  function syncUserForms(nextUser: User | null) {
    if (!nextUser) {
      setProfileForm({ name: "", email: "", celular: "" });
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      return;
    }

    setProfileForm({
      name: nextUser.name,
      email: nextUser.email ?? "",
      celular: nextUser.celular ?? "",
    });
  }

  useEffect(() => {
    if (toasts.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 3400);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("figutrack_token");

    if (!storedToken) {
      void Promise.resolve().then(() => {
        setBootstrapping(false);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const session = await apiFetch<{ user: User }>("/me", {
          token: storedToken,
        });

        if (cancelled) {
          return;
        }

        setToken(storedToken);
        setUser(session.user);
        syncUserForms(session.user);
        setView(session.user.rol === "admin" ? "admin" : "catalogo");

        const [catalogResponse, myAlbumsResponse] = await Promise.all([
          apiFetch<{ data: Album[] }>("/albumes", { token: storedToken }),
          apiFetch<{ data: Album[] }>("/mis-albumes", { token: storedToken }),
        ]);

        if (cancelled) {
          return;
        }

        setCatalog(catalogResponse.data);
        setMyAlbums(myAlbumsResponse.data);

        const nextAlbumId = myAlbumsResponse.data[0]?.id ?? null;
        setSelectedAlbumId(nextAlbumId);

        if (nextAlbumId) {
          const controlResponse = await apiFetch<ControlPayload>(
            `/mis-albumes/${nextAlbumId}/figuritas`,
            { token: storedToken },
          );

          if (cancelled) {
            return;
          }

          setControl(controlResponse);
          setActiveTabKey(controlResponse.tabs[0]?.key ?? null);
        } else {
          setControl(null);
          setMatches([]);
        }

        if (session.user.rol === "admin") {
          const [stats, albumsResponse] = await Promise.all([
            apiFetch<AdminStats>("/admin/stats", { token: storedToken }),
            apiFetch<{ data: Album[] }>("/admin/albumes", {
              token: storedToken,
            }),
          ]);

          if (cancelled) {
            return;
          }

          setAdminStats(stats);
          setAdminAlbums(albumsResponse.data);

          const nextAdminAlbumId = albumsResponse.data[0]?.id ?? null;
          setAdminSelectedAlbumId(nextAdminAlbumId);

          if (nextAdminAlbumId) {
            const stickersResponse = await apiFetch<{ data: StickerItem[] }>(
              `/admin/albumes/${nextAdminAlbumId}/figuritas`,
              {
                token: storedToken,
              },
            );

            if (cancelled) {
              return;
            }

            setAdminStickers(stickersResponse.data);
          }
        }
      } catch {
        window.localStorage.removeItem("figutrack_token");
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchCatalog(authToken: string): Promise<Album[]> {
    setLoadingCatalog(true);
    try {
      const response = await apiFetch<{ data: Album[] }>("/albumes", {
        token: authToken,
      });
      return response.data;
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function fetchMyAlbums(authToken: string): Promise<Album[]> {
    setLoadingCollection(true);
    try {
      const response = await apiFetch<{ data: Album[] }>("/mis-albumes", {
        token: authToken,
      });
      return response.data;
    } finally {
      setLoadingCollection(false);
    }
  }

  async function refreshCollections(authToken: string) {
    const [catalogData, collectionData] = await Promise.all([
      fetchCatalog(authToken),
      fetchMyAlbums(authToken),
    ]);

    setCatalog(catalogData);
    setMyAlbums(collectionData);
    return collectionData;
  }

  async function loadControl(authToken: string, albumId: number) {
    setLoadingCollection(true);
    try {
      const response = await apiFetch<ControlPayload>(
        `/mis-albumes/${albumId}/figuritas`,
        {
          token: authToken,
        },
      );
      setControl(response);
      setActiveTabKey(response.tabs[0]?.key ?? null);
      setShareUrl(null);
    } finally {
      setLoadingCollection(false);
    }
  }

  async function loadMatches(authToken: string, albumId: number) {
    setLoadingMatches(true);
    try {
      const response = await apiFetch<{ data: MatchItem[] }>(
        `/albumes/${albumId}/matches`,
        {
          token: authToken,
        },
      );
      setMatches(response.data);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadAdminStickers(authToken: string, albumId: number) {
    const response = await apiFetch<{ data: StickerItem[] }>(
      `/admin/albumes/${albumId}/figuritas`,
      {
        token: authToken,
      },
    );
    setAdminStickers(response.data);
  }

  async function loadAdminData(authToken: string) {
    setLoadingAdmin(true);
    try {
      const [stats, albumsResponse] = await Promise.all([
        apiFetch<AdminStats>("/admin/stats", { token: authToken }),
        apiFetch<{ data: Album[] }>("/admin/albumes", { token: authToken }),
      ]);

      setAdminStats(stats);
      setAdminAlbums(albumsResponse.data);

      const firstAlbumId = albumsResponse.data[0]?.id ?? null;
      const nextAlbumId = adminSelectedAlbumId ?? firstAlbumId;
      setAdminSelectedAlbumId(nextAlbumId);

      if (nextAlbumId) {
        await loadAdminStickers(authToken, nextAlbumId);
      }
    } finally {
      setLoadingAdmin(false);
    }
  }

  async function hydrateApp(authToken: string, nextUser: User) {
    const [catalogData, collectionData] = await Promise.all([
      fetchCatalog(authToken),
      fetchMyAlbums(authToken),
    ]);

    setCatalog(catalogData);
    setMyAlbums(collectionData);

    const nextAlbumId = collectionData[0]?.id ?? null;
    setSelectedAlbumId(nextAlbumId);

    if (nextAlbumId) {
      await loadControl(authToken, nextAlbumId);
    } else {
      setControl(null);
      setMatches([]);
    }

    if (nextUser.rol === "admin") {
      await loadAdminData(authToken);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAuth(true);

    try {
      const response = await apiFetch<{ token: string; user: User }>("/login", {
        method: "POST",
        body: loginForm,
      });

      window.localStorage.setItem("figutrack_token", response.token);
      setToken(response.token);
      setUser(response.user);
      setView(response.user.rol === "admin" ? "admin" : "catalogo");
      await hydrateApp(response.token, response.user);
      notify("Sesión iniciada", `Bienvenido, ${response.user.name}.`, "success");
    } catch (error) {
      notify("No se pudo iniciar sesión", extractMessage(error), "error");
    } finally {
      setSubmittingAuth(false);
      setBootstrapping(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAuth(true);

    try {
      const response = await apiFetch<{ token: string; user: User }>(
        "/register",
        {
          method: "POST",
          body: registerForm,
        },
      );

      window.localStorage.setItem("figutrack_token", response.token);
      setToken(response.token);
      setUser(response.user);
      setView("catalogo");
      await hydrateApp(response.token, response.user);
      notify(
        "Cuenta creada",
        "Ya puedes seleccionar un álbum y empezar a registrar figuritas.",
        "success",
      );
    } catch (error) {
      notify(
        "No se pudo completar el registro",
        extractMessage(error),
        "error",
      );
    } finally {
      setSubmittingAuth(false);
      setBootstrapping(false);
    }
  }

  async function handleLogout() {
    if (!token) {
      return;
    }

    try {
      await apiFetch("/logout", { method: "POST", token });
    } catch {
      // Token invalid or expired.
    }

    window.localStorage.removeItem("figutrack_token");
    setToken(null);
    setUser(null);
    syncUserForms(null);
    setCatalog([]);
    setMyAlbums([]);
    setControl(null);
    setMatches([]);
    setContact(null);
    setSelectedAlbumId(null);
    setShareUrl(null);
    setAdminAlbums([]);
    setAdminStickers([]);
    setAdminStats(null);
    setView("catalogo");
    notify("Sesión cerrada", "Tu token local se eliminó correctamente.", "info");
  }

  async function handleAddAlbum(albumId: number) {
    if (!token) {
      return;
    }

    try {
      await apiFetch(`/mis-albumes/${albumId}`, {
        method: "POST",
        token,
      });

      await refreshCollections(token);
      setView("coleccion");
      setSelectedAlbumId(albumId);
      await loadControl(token, albumId);
      notify("Álbum agregado", "Ya forma parte de tu colección.", "success");
    } catch (error) {
      notify("No se pudo agregar el álbum", extractMessage(error), "error");
    }
  }

  async function handleSelectAlbum(albumId: number) {
    if (!token) {
      return;
    }

    setSelectedAlbumId(albumId);
    setView("coleccion");
    setMatches([]);
    setShareUrl(null);

    try {
      await loadControl(token, albumId);
    } catch (error) {
      notify("No se pudo cargar el álbum", extractMessage(error), "error");
    }
  }

  async function handleOpenMatches(albumId: number) {
    if (!token) {
      return;
    }

    setSelectedAlbumId(albumId);
    setView("matches");

    try {
      if (!control || selectedAlbumId !== albumId) {
        await loadControl(token, albumId);
      }
      await loadMatches(token, albumId);
    } catch (error) {
      notify("No se pudieron cargar las coincidencias", extractMessage(error), "error");
    }
  }

  function updateStickerLocal(
    stickerId: number,
    updater: (sticker: StickerItem) => StickerItem,
  ) {
    setControl((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        tabs: current.tabs.map((tab) => ({
          ...tab,
          stickers: tab.stickers.map((sticker) =>
            sticker.id === stickerId ? updater(sticker) : sticker,
          ),
        })),
      };
    });
  }

  async function patchStickerState(
    sticker: StickerItem,
    payload: Partial<StickerState>,
  ) {
    if (!token || !selectedAlbumId) {
      return;
    }

    const previous = sticker.state;
    const optimistic: StickerState = {
      tiene: payload.tiene ?? previous.tiene,
      repetidas: payload.repetidas ?? previous.repetidas,
      status:
        (payload.repetidas ?? previous.repetidas) > 0
          ? "repeated"
          : payload.tiene === false
            ? "missing"
            : payload.tiene ?? previous.tiene
              ? "owned"
              : "missing",
    };

    updateStickerLocal(sticker.id, (current) => ({
      ...current,
      state: optimistic,
    }));
    setSavingStickerId(sticker.id);

    try {
      const response = await apiFetch<{ state: StickerState; progress: Progress }>(
        `/figuritas/${sticker.id}/estado`,
        {
          method: "PATCH",
          token,
          body: payload,
        },
      );

      updateStickerLocal(sticker.id, (current) => ({
        ...current,
        state: response.state,
      }));
      setControl((current) =>
        current ? { ...current, progress: response.progress } : current,
      );
      setMyAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbumId
            ? { ...album, progress: response.progress }
            : album,
        ),
      );
    } catch (error) {
      updateStickerLocal(sticker.id, (current) => ({
        ...current,
        state: previous,
      }));
      notify("No se pudo guardar el cambio", extractMessage(error), "error");
    } finally {
      setSavingStickerId(null);
    }
  }

  async function handleToggleOwned(sticker: StickerItem) {
    await patchStickerState(sticker, { tiene: !sticker.state.tiene });
  }

  async function handleRepeatedChange(sticker: StickerItem, delta: number) {
    const next = Math.max(0, sticker.state.repetidas + delta);
    await patchStickerState(sticker, { repetidas: next });
  }

  async function handleRevealContact(matchUserId: number) {
    if (!token || !selectedAlbumId) {
      return;
    }

    try {
      const response = await apiFetch<ContactPayload>(
        `/usuarios/${matchUserId}/contacto?album_id=${selectedAlbumId}`,
        {
          token,
        },
      );
      setContact(response);
    } catch (error) {
      notify("No se pudo obtener el contacto", extractMessage(error), "error");
    }
  }

  async function handleImportCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedAlbumId || !csvFile) {
      return;
    }

    setImportingCsv(true);

    try {
      const formData = new FormData();
      formData.append("archivo", csvFile);
      formData.append("limpiar_antes", csvClearBefore ? "1" : "0");

      const response = await apiFetch<CsvImportResponse>(
        `/mis-albumes/${selectedAlbumId}/importar-csv`,
        {
          method: "POST",
          token,
          body: formData,
        },
      );

      setCsvImportSummary(response.summary);
      await loadControl(token, selectedAlbumId);
      setMyAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbumId
            ? { ...album, progress: response.progress }
            : album,
        ),
      );
      setCsvFile(null);
      setCsvClearBefore(false);
      setCsvInputKey((current) => current + 1);

      notify(
        "Importación completada",
        `${response.summary.imported} figuritas actualizadas desde el CSV.`,
        "success",
      );
    } catch (error) {
      notify("No se pudo importar el CSV", extractMessage(error), "error");
    } finally {
      setImportingCsv(false);
    }
  }

  function handleDownloadCsvTemplate() {
    if (!control) {
      return;
    }

    const rows = [
      ["codigo", "tiene", "repetidas"],
      ...control.tabs.flatMap((tab) =>
        tab.stickers.map((sticker) => [sticker.codigo, "", ""]),
      ),
    ];

    const csvContent = rows
      .map((row) => row.map((value) => csvEscape(value)).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const albumSlug = control.album.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    link.href = url;
    link.download = `plantilla-${albumSlug || "album"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async function handleCreateShareLink() {
    if (!token || !selectedAlbumId) {
      return;
    }

    setCreatingShareLink(true);

    try {
      const response = await apiFetch<ShareLinkResponse>(
        `/mis-albumes/${selectedAlbumId}/compartir`,
        {
          token,
        },
      );

      const nextShareUrl = new URL(response.share_path, window.location.origin).toString();
      setShareUrl(nextShareUrl);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextShareUrl);
      }

      notify(
        "Enlace listo para compartir",
        "La URL pública se copió al portapapeles.",
        "success",
      );
    } catch (error) {
      notify("No se pudo generar el enlace", extractMessage(error), "error");
    } finally {
      setCreatingShareLink(false);
    }
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSavingProfile(true);

    try {
      const response = await apiFetch<{ user: User }>("/perfil", {
        method: "PUT",
        token,
        body: profileForm,
      });

      setUser(response.user);
      syncUserForms(response.user);
      syncUserForms(response.user);
      syncUserForms(response.user);
      notify("Perfil actualizado", "Tus datos se guardaron correctamente.", "success");
    } catch (error) {
      notify("No se pudo actualizar el perfil", extractMessage(error), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSavingPassword(true);

    try {
      await apiFetch<{ message: string }>("/perfil/password", {
        method: "PUT",
        token,
        body: passwordForm,
      });

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowNewPasswordConfirmation(false);
      notify("Clave actualizada", "Tu contraseña se cambió correctamente.", "success");
    } catch (error) {
      notify("No se pudo cambiar la clave", extractMessage(error), "error");
    } finally {
      setSavingPassword(false);
    }
  }

  function beginAlbumEdit(album?: Album) {
    if (!album) {
      setEditingAlbumId(null);
      setAlbumForm(emptyAlbumForm);
      return;
    }

    setEditingAlbumId(album.id);
    setAlbumForm({
      nombre: album.nombre,
      editorial: album.editorial,
      edicion: album.edicion ?? "",
      anio: album.anio ? String(album.anio) : "",
      descripcion: album.descripcion ?? "",
      portada_url: album.portada_url ?? "",
      total_stickers: album.total_stickers ? String(album.total_stickers) : "",
      activo: album.activo,
    });
  }

  async function handleSaveAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    try {
      const payload = {
        ...albumForm,
        anio: albumForm.anio ? Number(albumForm.anio) : null,
        total_stickers: albumForm.total_stickers
          ? Number(albumForm.total_stickers)
          : 0,
      };

      if (editingAlbumId) {
        await apiFetch(`/admin/albumes/${editingAlbumId}`, {
          method: "PUT",
          token,
          body: payload,
        });
        notify(
          "álbum actualizado",
          "Los cambios se guardaron correctamente.",
          "success",
        );
      } else {
        await apiFetch("/admin/albumes", {
          method: "POST",
          token,
          body: payload,
        });
        notify(
          "álbum creado",
          "El nuevo álbum ya está disponible en el panel.",
          "success",
        );
      }

      beginAlbumEdit();
      await loadAdminData(token);
      await refreshCollections(token);
    } catch (error) {
      notify("No se pudo guardar el álbum", extractMessage(error), "error");
    }
  }

  async function handleDeleteAlbum() {
    if (!token || !editingAlbumId) {
      return;
    }

    try {
      await apiFetch(`/admin/albumes/${editingAlbumId}`, {
        method: "DELETE",
        token,
      });
      notify(
        "álbum eliminado",
        "El álbum y sus figuritas se eliminaron del sistema.",
        "success",
      );
      beginAlbumEdit();
      setAdminSelectedAlbumId(null);
      setAdminStickers([]);
      await loadAdminData(token);
      await refreshCollections(token);
    } catch (error) {
      notify("No se pudo eliminar el álbum", extractMessage(error), "error");
    }
  }

  function beginStickerEdit(sticker?: StickerItem) {
    if (!sticker) {
      setEditingStickerId(null);
      setStickerForm(emptyStickerForm);
      return;
    }

    setEditingStickerId(sticker.id);
    setStickerForm({
      codigo: sticker.codigo,
      nombre: sticker.nombre ?? "",
      categoria: sticker.categoria ?? "",
      tipo: sticker.tipo,
      imagen_url: sticker.imagen_url ?? "",
    });
  }

  async function handleSaveSticker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !adminSelectedAlbumId) {
      return;
    }

    try {
      if (editingStickerId) {
        await apiFetch(
          `/admin/albumes/${adminSelectedAlbumId}/figuritas/${editingStickerId}`,
          {
            method: "PUT",
            token,
            body: stickerForm,
          },
        );
        notify(
          "Figurita actualizada",
          "El cambio ya aparece en el control del álbum.",
          "success",
        );
      } else {
        await apiFetch(`/admin/albumes/${adminSelectedAlbumId}/figuritas`, {
          method: "POST",
          token,
          body: stickerForm,
        });
        notify(
          "Figurita creada",
          "La figurita se agregó al álbum seleccionado.",
          "success",
        );
      }

      beginStickerEdit();
      await loadAdminStickers(token, adminSelectedAlbumId);
      await loadAdminData(token);
      await refreshCollections(token);
    } catch (error) {
      notify("No se pudo guardar la figurita", extractMessage(error), "error");
    }
  }

  async function handleDeleteSticker() {
    if (!token || !adminSelectedAlbumId || !editingStickerId) {
      return;
    }

    try {
      await apiFetch(
        `/admin/albumes/${adminSelectedAlbumId}/figuritas/${editingStickerId}`,
        {
          method: "DELETE",
          token,
        },
      );
      notify(
        "Figurita eliminada",
        "La lista del álbum ya se actualizó.",
        "success",
      );
      beginStickerEdit();
      await loadAdminStickers(token, adminSelectedAlbumId);
      await loadAdminData(token);
      await refreshCollections(token);
    } catch (error) {
      notify("No se pudo eliminar la figurita", extractMessage(error), "error");
    }
  }

  async function handleBulkGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !adminSelectedAlbumId) {
      return;
    }

    try {
      await apiFetch(`/admin/albumes/${adminSelectedAlbumId}/figuritas/generar`, {
        method: "POST",
        token,
        body: {
          cantidad: Number(bulkCantidad),
          categoria: bulkCategoria,
          tipo: bulkTipo,
        },
      });
      notify(
        "Generación completada",
        "Las figuritas se crearon de forma masiva.",
        "success",
      );
      await loadAdminStickers(token, adminSelectedAlbumId);
      await loadAdminData(token);
      await refreshCollections(token);
    } catch (error) {
      notify("No se pudo generar la serie", extractMessage(error), "error");
    }
  }

  if (bootstrapping) {
    return <LoadingScreen />;
  }

  if (!user || !token) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#1d4ed8,_#0f172a_55%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10 lg:flex-row lg:items-center lg:justify-between">
          <section className="max-w-2xl space-y-8">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm text-blue-100 backdrop-blur">
              FiguTrack · Control profesional de figuritas
            </span>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Organiza, completa e intercambia tu álbum con una experiencia de
                nivel premium.
              </h1>
              <p className="max-w-xl text-base text-blue-100 sm:text-lg">
                Registro con correo o celular, control rápido con tabs, autosave
                instantáneo y matches listos para contactar.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                title="Flujo completo"
                description="Registro, selección de álbum, control con tabs, match y contacto sin salir del dashboard."
              />
              <FeatureCard
                title="Control tactil"
                description="Celda grande, cambio por un toque y repetidas con acciones más y menos optimizadas para celular."
              />
              <FeatureCard
                title="Privacidad inteligente"
                description="Los datos de contacto solo aparecen cuando existe un match válido dentro del mismo álbum."
              />
            </div>
          </section>

          <section className="w-full max-w-xl rounded-[32px] border border-white/15 bg-slate-950/60 p-6 shadow-2xl shadow-blue-950/40 backdrop-blur">
            <div className="flex rounded-2xl bg-white/5 p-1 text-sm">
              <button
                className={tabClass(authMode === "login")}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Iniciar sesión
              </button>
              <button
                className={tabClass(authMode === "register")}
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Crear cuenta
              </button>
            </div>

            {authMode === "login" ? (
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <FieldLabel label="Correo o celular">
                  <input
                    className={inputClass}
                    placeholder="correo@ejemplo.com o +51999999999"
                    value={loginForm.identifier}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        identifier: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
                <FieldLabel label="Contraseña">
                  <PasswordInput
                    className={inputClass}
                    placeholder="********"
                    value={loginForm.password}
                    visible={showLoginPassword}
                    onToggleVisibility={() =>
                      setShowLoginPassword((current) => !current)
                    }
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
                <button
                  className={primaryButtonClass}
                  disabled={submittingAuth}
                  type="submit"
                >
                  {submittingAuth ? "Ingresando..." : "Entrar a FiguTrack"}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleRegister}>
                <FieldLabel label="Nombre o apodo">
                  <input
                    className={inputClass}
                    placeholder="Tu nombre coleccionista"
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Correo">
                    <input
                      className={inputClass}
                      placeholder="correo@ejemplo.com"
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Celular">
                    <input
                      className={inputClass}
                      placeholder="+51999999999"
                      value={registerForm.celular}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          celular: event.target.value,
                        }))
                      }
                    />
                  </FieldLabel>
                </div>
                <p className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                  Debes ingresar al menos un dato de contacto (correo o
                  celular). Estos datos servirán para que otros coleccionistas
                  puedan contactarte para intercambios.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldLabel label="Contraseña">
                    <PasswordInput
                      className={inputClass}
                      placeholder="Mínimo 8 caracteres"
                      value={registerForm.password}
                      visible={showRegisterPassword}
                      onToggleVisibility={() =>
                        setShowRegisterPassword((current) => !current)
                      }
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Confirmar contraseña">
                    <PasswordInput
                      className={inputClass}
                      placeholder="Repite tu contraseña"
                      value={registerForm.password_confirmation}
                      visible={showRegisterPasswordConfirmation}
                      onToggleVisibility={() =>
                        setShowRegisterPasswordConfirmation(
                          (current) => !current,
                        )
                      }
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password_confirmation: event.target.value,
                        }))
                      }
                    />
                  </FieldLabel>
                </div>
                <button
                  className={primaryButtonClass}
                  disabled={submittingAuth}
                  type="submit"
                >
                  {submittingAuth ? "Creando cuenta..." : "Crear cuenta y entrar"}
                </button>
              </form>
            )}
          </section>
        </div>
        <ToastStack toasts={toasts} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full rounded-[28px] bg-slate-950 p-5 text-white shadow-2xl shadow-slate-300 lg:w-80">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] text-blue-200">
                FiguTrack
              </div>
              <div className="mt-2 text-2xl font-semibold">Dashboard</div>
            </div>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-100">
              {user.rol === "admin" ? "Administrador" : "Coleccionista"}
            </span>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-300">Sesión activa</div>
            <div className="mt-1 text-lg font-semibold">{user.name}</div>
            <div className="mt-2 space-y-1 text-sm text-slate-300">
              {user.email ? <div>{user.email}</div> : null}
              {user.celular ? <div>{user.celular}</div> : null}
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <SidebarButton
              active={view === "catalogo"}
              label="Catálogo"
              onClick={() => setView("catalogo")}
            />
            <SidebarButton
              active={view === "coleccion"}
              label="Mis álbumes"
              onClick={() => setView("coleccion")}
            />
            <SidebarButton
              active={view === "matches"}
              label="Matches"
              onClick={() => setView("matches")}
            />
            <SidebarButton
              active={view === "perfil"}
              label="Mi perfil"
              onClick={() => setView("perfil")}
            />
            {user.rol === "admin" ? (
              <SidebarButton
                active={view === "admin"}
                label="Admin"
                onClick={() => setView("admin")}
              />
            ) : null}
          </nav>

          <div className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            <div className="font-semibold text-white">Álbum activo</div>
            <div className="mt-2">
              {selectedAlbum?.nombre ?? "Selecciona uno desde tu colección"}
            </div>
            {selectedAlbum?.progress ? (
              <div className="mt-4 space-y-3">
                <ProgressBar progress={selectedAlbum.progress.percentage} />
                <div className="flex justify-between text-xs text-blue-100">
                  <span>
                    {selectedAlbum.progress.owned}/{selectedAlbum.progress.total}
                  </span>
                  <span>{selectedAlbum.progress.repeated} repetidas</span>
                </div>
              </div>
            ) : null}
          </div>

          <button
            className="mt-8 w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            onClick={handleLogout}
            type="button"
          >
            Cerrar sesión
          </button>
        </aside>

        <section className="flex-1 space-y-6">
          <header className="rounded-[28px] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">
                  Colección sin fricción
                </div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  {view === "catalogo" && "Explora álbumes disponibles"}
                  {view === "coleccion" && "Control rápido de figuritas"}
                  {view === "matches" && "Matches para intercambio"}
                  {view === "perfil" && "Gestiona tu perfil"}
                  {view === "admin" && "Centro de administración"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Todo sincroniza contra Laravel Sanctum usando{" "}
                  <span className="font-mono">{API_URL}</span>.
                </p>
              </div>
              <div className="grid gap-3 rounded-3xl bg-slate-950 px-4 py-3 text-white sm:grid-cols-3">
                <MetricChip
                  label="Álbumes activos"
                  value={catalog.filter((album) => album.activo).length}
                />
                <MetricChip label="En colección" value={myAlbums.length} />
                <MetricChip label="Matches" value={matches.length} />
              </div>
            </div>
          </header>

          {view === "perfil" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard
                title="Mis datos"
                description="Actualiza tu nombre y tus datos de contacto para que otros coleccionistas puedan ubicarte."
              >
                <form className="grid gap-4" onSubmit={handleUpdateProfile}>
                  <FieldLabelLight label="Nombre o apodo">
                    <input
                      className={lightInputClass}
                      value={profileForm.name}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </FieldLabelLight>
                  <FieldLabelLight label="Correo">
                    <input
                      className={lightInputClass}
                      placeholder="correo@ejemplo.com"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </FieldLabelLight>
                  <FieldLabelLight label="Celular">
                    <input
                      className={lightInputClass}
                      placeholder="+51999999999"
                      value={profileForm.celular}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          celular: event.target.value,
                        }))
                      }
                    />
                  </FieldLabelLight>
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Debes mantener al menos un dato de contacto activo: correo o celular.
                  </p>
                  <button
                    className={primaryButtonClass}
                    disabled={savingProfile}
                    type="submit"
                  >
                    {savingProfile ? "Guardando..." : "Guardar perfil"}
                  </button>
                </form>
              </SectionCard>

              <SectionCard
                title="Seguridad"
                description="Cambia tu clave cuando lo necesites. Debes ingresar tu contraseña actual."
              >
                <form className="grid gap-4" onSubmit={handleUpdatePassword}>
                  <FieldLabelLight label="Clave actual">
                    <PasswordInput
                      className={lightInputClass}
                      placeholder="Tu contraseña actual"
                      value={passwordForm.current_password}
                      visible={showCurrentPassword}
                      onToggleVisibility={() =>
                        setShowCurrentPassword((current) => !current)
                      }
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          current_password: event.target.value,
                        }))
                      }
                      buttonClassName="text-slate-400 hover:text-slate-700"
                    />
                  </FieldLabelLight>
                  <FieldLabelLight label="Nueva clave">
                    <PasswordInput
                      className={lightInputClass}
                      placeholder="Mínimo 8 caracteres"
                      value={passwordForm.password}
                      visible={showNewPassword}
                      onToggleVisibility={() =>
                        setShowNewPassword((current) => !current)
                      }
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      buttonClassName="text-slate-400 hover:text-slate-700"
                    />
                  </FieldLabelLight>
                  <FieldLabelLight label="Confirmar nueva clave">
                    <PasswordInput
                      className={lightInputClass}
                      placeholder="Repite tu nueva contraseña"
                      value={passwordForm.password_confirmation}
                      visible={showNewPasswordConfirmation}
                      onToggleVisibility={() =>
                        setShowNewPasswordConfirmation((current) => !current)
                      }
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          password_confirmation: event.target.value,
                        }))
                      }
                      buttonClassName="text-slate-400 hover:text-slate-700"
                    />
                  </FieldLabelLight>
                  <button
                    className={primaryButtonClass}
                    disabled={savingPassword}
                    type="submit"
                  >
                    {savingPassword ? "Actualizando..." : "Cambiar clave"}
                  </button>
                </form>
              </SectionCard>
            </div>
          ) : null}

          {view === "catalogo" ? (
            <SectionCard
              title="Catálogo de álbumes"
              description="Agrega álbumes a tu colección y empieza a registrar figuritas de inmediato."
            >
              {loadingCatalog ? <GridSkeleton /> : null}
              {!loadingCatalog && catalog.length === 0 ? (
                <EmptyState
                  title="Sin álbumes activos"
                  description="Crea o activa álbumes desde el panel administrador."
                />
              ) : null}
              {!loadingCatalog ? (
                <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                  {catalog.map((album) => (
                    <AlbumShowcaseCard
                      key={album.id}
                      album={album}
                      onAdd={() => handleAddAlbum(album.id)}
                      onOpen={() => handleSelectAlbum(album.id)}
                    />
                  ))}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {view === "coleccion" ? (
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <SectionCard
                title="Mis álbumes"
                description="Selecciona un álbum para abrir su tablero de control."
              >
                <div className="space-y-4">
                  {myAlbums.length === 0 ? (
                    <EmptyState
                      title="Aún no coleccionas álbumes"
                      description="Ve al catálogo y agrega uno para iniciar el flujo completo."
                    />
                  ) : null}
                  {myAlbums.map((album) => (
                    <button
                      key={album.id}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        album.id === selectedAlbumId
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-200"
                      }`}
                      onClick={() => handleSelectAlbum(album.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-950">
                            {album.nombre}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {album.editorial} · {album.edicion ?? "Edición estándar"}
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white">
                          {album.progress?.percentage ?? 0}%
                        </span>
                      </div>
                      {album.progress ? (
                        <div className="mt-4 space-y-2">
                          <ProgressBar progress={album.progress.percentage} />
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              {album.progress.owned}/{album.progress.total}
                            </span>
                            <span>{album.progress.repeated} repetidas</span>
                          </div>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title={control?.album.nombre ?? "Control de figuritas"}
                description="Toca la tarjeta para marcar si la tienes. Usa más y menos para gestionar repetidas con autosave inmediato."
              >
                {loadingCollection ? <ControlSkeleton /> : null}
                {!loadingCollection && !control ? (
                  <EmptyState
                    title="Selecciona un álbum"
                    description="Abre cualquiera de tu colección para ver tabs, progreso y control visual."
                  />
                ) : null}
                {!loadingCollection && control ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 rounded-3xl bg-slate-950 p-5 text-white md:grid-cols-4">
                      <StatCard
                        label="Completadas"
                        value={`${control.progress.owned}/${control.progress.total}`}
                      />
                      <StatCard
                        label="Faltantes"
                        value={control.progress.missing}
                      />
                      <StatCard
                        label="Repetidas"
                        value={control.progress.repeated}
                      />
                      <StatCard
                        label="Avance"
                        value={`${control.progress.percentage}%`}
                      />
                    </div>

                    <ProgressBar progress={control.progress.percentage} tall />

                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-slate-950">
                            Importar desde CSV
                          </div>
                          <p className="max-w-2xl text-sm text-slate-600">
                            Sube un archivo con una de estas variantes:
                            <span className="font-mono text-xs text-slate-800">
                              {" "}
                              `codigo`
                            </span>
                            ,
                            <span className="font-mono text-xs text-slate-800">
                              {" "}
                              `codigo,repetidas`
                            </span>
                            {" "}o
                            <span className="font-mono text-xs text-slate-800">
                              {" "}
                              `codigo,tiene,repetidas`
                            </span>
                            .
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            Ejemplos: `FWC001` | `FWC002,2` | `FWC003,si,1`
                          </p>
                          <button
                            className={secondaryButtonClass}
                            onClick={handleDownloadCsvTemplate}
                            type="button"
                          >
                            Descargar plantilla CSV
                          </button>
                        </div>

                        <form
                          className="flex w-full max-w-xl flex-col gap-3"
                          onSubmit={handleImportCsv}
                        >
                          <input
                            key={csvInputKey}
                            accept=".csv,text/csv"
                            className={`${lightInputClass} file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800`}
                            onChange={(event) =>
                              setCsvFile(event.target.files?.[0] ?? null)
                            }
                            type="file"
                          />
                          <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <input
                              checked={csvClearBefore}
                              className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              onChange={(event) => setCsvClearBefore(event.target.checked)}
                              type="checkbox"
                            />
                            <span>
                              Eliminar antes de importar las figuritas guardadas del usuario
                              activo en este álbum.
                            </span>
                          </label>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              className={primaryButtonClass}
                              disabled={importingCsv || !csvFile}
                              type="submit"
                            >
                              {importingCsv ? "Importando..." : "Importar CSV"}
                            </button>
                          </div>
                        </form>
                      </div>

                      {csvImportSummary ? (
                        <div className="mt-4 grid gap-3 lg:grid-cols-4">
                          <SummaryChip
                            label="Actualizadas"
                            value={csvImportSummary.imported}
                          />
                          <SummaryChip
                            label="Limpiadas"
                            value={csvImportSummary.cleared}
                          />
                          <SummaryChip
                            label="Saltadas"
                            value={csvImportSummary.skipped}
                          />
                          <SummaryChip
                            label="No encontradas"
                            value={csvImportSummary.not_found_codes.length}
                          />
                          {csvImportSummary.not_found_codes.length ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:col-span-4">
                              Códigos no encontrados:{" "}
                              <span className="font-mono text-xs">
                                {csvImportSummary.not_found_codes.slice(0, 12).join(", ")}
                              </span>
                              {csvImportSummary.not_found_codes.length > 12
                                ? " ..."
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-slate-950">
                            Compartir lista pública
                          </div>
                          <p className="max-w-2xl text-sm text-slate-600">
                            Genera una pantalla para compartir con otros usuarios las figuritas
                            que te faltan y las que tienes repetidas en este álbum.
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">
                            Cualquiera con este enlace puede verlo sin iniciar sesión.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            className={primaryButtonClass}
                            disabled={creatingShareLink}
                            onClick={handleCreateShareLink}
                            type="button"
                          >
                            {creatingShareLink ? "Generando..." : "Copiar enlace compartido"}
                          </button>
                          {shareUrl ? (
                            <a
                              className={secondaryButtonClass}
                              href={shareUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Abrir vista compartida
                            </a>
                          ) : null}
                        </div>
                      </div>

                      {shareUrl ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              Enlace público
                            </div>
                            <div className="mt-2 break-all font-mono text-sm text-slate-700">
                              {shareUrl}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                              {shareWhatsappUrl ? (
                                <a
                                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                  href={shareWhatsappUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Enviar por WhatsApp
                                </a>
                              ) : null}
                              <a
                                className={secondaryButtonClass}
                                href={shareUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Ver pantalla pública
                              </a>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                              QR del enlace
                            </div>
                            {shareQrUrl ? (
                              <img
                                alt="Código QR del enlace compartido"
                                className="mx-auto mt-3 h-40 w-40 rounded-2xl border border-slate-200 bg-white p-2"
                                src={shareQrUrl}
                              />
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(control.filters) as Array<
                        [FilterKey, string]
                      >).map(([key, label]) => (
                        <button
                          key={key}
                          className={pillClass(filterKey === key)}
                          onClick={() => setFilterKey(key)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        className={secondaryButtonClass}
                        onClick={() =>
                          selectedAlbumId
                            ? handleOpenMatches(selectedAlbumId)
                            : undefined
                        }
                        type="button"
                      >
                        Ver coincidencias del álbum
                      </button>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            Buscar por código
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            Escribe un texto como `MEX`, `FWC` o `BRA1` para filtrar figuritas
                            por coincidencia en el código.
                          </p>
                        </div>
                        <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                          <input
                            className={lightInputClass}
                            onChange={(event) => setStickerSearch(event.target.value)}
                            placeholder="Ejemplo: MEX"
                            type="search"
                            value={stickerSearch}
                          />
                          {stickerSearch ? (
                            <button
                              className={secondaryButtonClass}
                              onClick={() => setStickerSearch("")}
                              type="button"
                            >
                              Limpiar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {control.tabs.map((tab) => (
                        <button
                          key={tab.key}
                          className={pillClass(
                            (activeTab?.key ?? control.tabs[0]?.key) === tab.key,
                          )}
                          onClick={() => setActiveTabKey(tab.key)}
                          type="button"
                        >
                          {tab.label} · {tab.count}
                        </button>
                      ))}
                    </div>

                    {visibleStickers.length === 0 ? (
                      <EmptyState
                        title="Nada que mostrar con este filtro"
                        description={
                          stickerSearch
                            ? "No hay figuritas cuyo código coincida con la búsqueda. Prueba con otro texto como MEX o FWC."
                            : "Cambia de tab o vuelve a ver todas las figuritas."
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {visibleStickers.map((sticker) => (
                          <StickerCard
                            key={sticker.id}
                            sticker={sticker}
                            busy={savingStickerId === sticker.id}
                            onToggle={() => handleToggleOwned(sticker)}
                            onDecrease={() => handleRepeatedChange(sticker, -1)}
                            onIncrease={() => handleRepeatedChange(sticker, 1)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </SectionCard>
            </div>
          ) : null}

          {view === "matches" ? (
            <SectionCard
              title="Coincidencias del álbum"
              description="Cruza tus repetidas con lo que otros coleccionistas necesitan y viceversa."
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {myAlbums.map((album) => (
                  <button
                    key={album.id}
                    className={pillClass(album.id === selectedAlbumId)}
                    onClick={() => handleOpenMatches(album.id)}
                    type="button"
                  >
                    {album.nombre}
                  </button>
                ))}
              </div>
              {loadingMatches ? <GridSkeleton /> : null}
              {!loadingMatches && matches.length === 0 ? (
                <EmptyState
                  title="Todavía no hay coincidencias"
                  description="Suma repetidas o completa faltantes para que el motor de match encuentre oportunidades."
                />
              ) : null}
              {!loadingMatches ? (
                <div className="grid gap-5 xl:grid-cols-2">
                  {matches.map((match) => (
                    <div
                      key={match.user.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-slate-950">
                            {match.user.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            Score de relevancia: {match.score}
                          </div>
                        </div>
                        <button
                          className={primaryButtonClass}
                          onClick={() => handleRevealContact(match.user.id)}
                          type="button"
                        >
                          Ver contacto
                        </button>
                      </div>
                      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {match.summary}
                      </p>
                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <MatchList
                          title="Te puede ofrecer"
                          items={match.they_offer}
                          tone="blue"
                        />
                        <MatchList
                          title="Tú puedes ofrecer"
                          items={match.i_offer}
                          tone="emerald"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {view === "admin" && user.rol === "admin" ? (
            <div className="space-y-6">
              <SectionCard
                title="Resumen administrativo"
                description="Controla catálogo, figuritas y datos globales desde una sola vista."
              >
                {loadingAdmin ? <GridSkeleton /> : null}
                {!loadingAdmin && adminStats ? (
                  <div className="grid gap-4 lg:grid-cols-4">
                    <StatCard label="Usuarios" value={adminStats.totals.users} />
                    <StatCard label="Álbumes" value={adminStats.totals.albums} />
                    <StatCard
                      label="Activos"
                      value={adminStats.totals.active_albums}
                    />
                    <StatCard
                      label="Figuritas"
                      value={adminStats.totals.stickers}
                    />
                  </div>
                ) : null}
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <SectionCard
                  title="Álbumes"
                  description="Crea, edita o elimina álbumes del catálogo."
                >
                  <div className="space-y-3">
                    <button
                      className={secondaryButtonClass}
                      onClick={() => beginAlbumEdit()}
                      type="button"
                    >
                      Nuevo álbum
                    </button>
                    {adminAlbums.map((album) => (
                      <button
                        key={album.id}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          album.id === adminSelectedAlbumId
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200"
                        }`}
                        onClick={async () => {
                          setAdminSelectedAlbumId(album.id);
                          beginAlbumEdit(album);
                          if (token) {
                            await loadAdminStickers(token, album.id);
                          }
                        }}
                        type="button"
                      >
                        <div className="text-base font-semibold text-slate-950">
                          {album.nombre}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {album.editorial} · {album.total_stickers} figuritas
                        </div>
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <div className="space-y-6">
                  <SectionCard
                    title={editingAlbumId ? "Editar álbum" : "Crear álbum"}
                    description="Mantiene el catálogo listo para nuevos coleccionistas."
                  >
                    <form
                      className="grid gap-4 lg:grid-cols-2"
                      onSubmit={handleSaveAlbum}
                    >
                      <FieldLabelLight label="Nombre">
                        <input
                          className={lightInputClass}
                          value={albumForm.nombre}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              nombre: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Editorial">
                        <input
                          className={lightInputClass}
                          value={albumForm.editorial}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              editorial: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Edición">
                        <input
                          className={lightInputClass}
                          value={albumForm.edicion}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              edicion: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Año">
                        <input
                          className={lightInputClass}
                          value={albumForm.anio}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              anio: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Portada URL">
                        <input
                          className={lightInputClass}
                          value={albumForm.portada_url}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              portada_url: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Total figuritas">
                        <input
                          className={lightInputClass}
                          value={albumForm.total_stickers}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              total_stickers: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <FieldLabelLight label="Descripción">
                        <textarea
                          className={`${lightInputClass} min-h-28`}
                          value={albumForm.descripcion}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              descripcion: event.target.value,
                            }))
                          }
                        />
                      </FieldLabelLight>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                        <input
                          checked={albumForm.activo}
                          onChange={(event) =>
                            setAlbumForm((current) => ({
                              ...current,
                              activo: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        álbum activo y visible en catálogo
                      </label>
                      <div className="flex flex-wrap gap-3 lg:col-span-2">
                        <button className={primaryButtonClass} type="submit">
                          {editingAlbumId ? "Guardar cambios" : "Crear álbum"}
                        </button>
                        <button
                          className={secondaryButtonClass}
                          onClick={() => beginAlbumEdit()}
                          type="button"
                        >
                          Limpiar
                        </button>
                        {editingAlbumId ? (
                          <button
                            className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                            onClick={handleDeleteAlbum}
                            type="button"
                          >
                            Eliminar álbum
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </SectionCard>

                  <SectionCard
                    title="Figuritas del álbum"
                    description={
                      selectedAdminAlbum
                        ? `Gestionando ${selectedAdminAlbum.nombre}`
                        : "Selecciona un álbum para administrar sus figuritas."
                    }
                  >
                    {!selectedAdminAlbum ? (
                      <EmptyState
                        title="Selecciona un álbum"
                        description="Al elegir uno podrás crear figuritas sueltas o generar series completas."
                      />
                    ) : (
                      <div className="space-y-6">
                        <form
                          className="grid gap-4 lg:grid-cols-2"
                          onSubmit={handleSaveSticker}
                        >
                          <FieldLabelLight label="Código">
                            <input
                              className={lightInputClass}
                              value={stickerForm.codigo}
                              onChange={(event) =>
                                setStickerForm((current) => ({
                                  ...current,
                                  codigo: event.target.value,
                                }))
                              }
                            />
                          </FieldLabelLight>
                          <FieldLabelLight label="Nombre">
                            <input
                              className={lightInputClass}
                              value={stickerForm.nombre}
                              onChange={(event) =>
                                setStickerForm((current) => ({
                                  ...current,
                                  nombre: event.target.value,
                                }))
                              }
                            />
                          </FieldLabelLight>
                          <FieldLabelLight label="Categoría">
                            <input
                              className={lightInputClass}
                              value={stickerForm.categoria}
                              onChange={(event) =>
                                setStickerForm((current) => ({
                                  ...current,
                                  categoria: event.target.value,
                                }))
                              }
                            />
                          </FieldLabelLight>
                          <FieldLabelLight label="Tipo">
                            <select
                              className={lightInputClass}
                              value={stickerForm.tipo}
                              onChange={(event) =>
                                setStickerForm((current) => ({
                                  ...current,
                                  tipo: event.target.value,
                                }))
                              }
                            >
                              <option value="normal">Normal</option>
                              <option value="especial">Especial</option>
                              <option value="brillante">Brillante</option>
                            </select>
                          </FieldLabelLight>
                          <FieldLabelLight label="Imagen URL">
                            <input
                              className={lightInputClass}
                              value={stickerForm.imagen_url}
                              onChange={(event) =>
                                setStickerForm((current) => ({
                                  ...current,
                                  imagen_url: event.target.value,
                                }))
                              }
                            />
                          </FieldLabelLight>
                          <div className="flex flex-wrap gap-3 lg:col-span-2">
                            <button className={primaryButtonClass} type="submit">
                              {editingStickerId
                                ? "Guardar figurita"
                                : "Crear figurita"}
                            </button>
                            <button
                              className={secondaryButtonClass}
                              onClick={() => beginStickerEdit()}
                              type="button"
                            >
                              Limpiar
                            </button>
                            {editingStickerId ? (
                              <button
                                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                                onClick={handleDeleteSticker}
                                type="button"
                              >
                                Eliminar figurita
                              </button>
                            ) : null}
                          </div>
                        </form>

                        <form
                          className="grid gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 lg:grid-cols-4"
                          onSubmit={handleBulkGenerate}
                        >
                          <FieldLabelLight label="Cantidad">
                            <input
                              className={lightInputClass}
                              value={bulkCantidad}
                              onChange={(event) =>
                                setBulkCantidad(event.target.value)
                              }
                            />
                          </FieldLabelLight>
                          <FieldLabelLight label="Categoría">
                            <input
                              className={lightInputClass}
                              value={bulkCategoria}
                              onChange={(event) =>
                                setBulkCategoria(event.target.value)
                              }
                            />
                          </FieldLabelLight>
                          <FieldLabelLight label="Tipo">
                            <select
                              className={lightInputClass}
                              value={bulkTipo}
                              onChange={(event) => setBulkTipo(event.target.value)}
                            >
                              <option value="normal">Normal</option>
                              <option value="especial">Especial</option>
                              <option value="brillante">Brillante</option>
                            </select>
                          </FieldLabelLight>
                          <div className="flex items-end">
                            <button
                              className={`${primaryButtonClass} w-full`}
                              type="submit"
                            >
                              Generar serie
                            </button>
                          </div>
                        </form>

                        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                          {adminStickers.map((sticker) => (
                            <button
                              key={sticker.id}
                              className={`rounded-2xl border p-4 text-left transition ${
                                editingStickerId === sticker.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 bg-white hover:border-blue-200"
                              }`}
                              onClick={() => beginStickerEdit(sticker)}
                              type="button"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-950">
                                    {sticker.codigo}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {sticker.nombre ?? "Sin nombre"}
                                  </div>
                                </div>
                                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-white">
                                  {sticker.tipo}
                                </span>
                              </div>
                              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                                {sticker.categoria ?? "General"}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>
              </div>

              {adminStats?.top_missing_stickers.length ? (
                <SectionCard
                  title="Figuritas más faltantes"
                  description="Indicador simple para detectar huecos comunes en la colección."
                >
                  <div className="grid gap-3 lg:grid-cols-2">
                    {adminStats.top_missing_stickers.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="font-semibold text-slate-950">
                          {item.codigo} · {item.nombre ?? "Sin nombre"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.album_nombre}
                        </div>
                        <div className="mt-3 text-sm font-medium text-rose-600">
                          Ausente en {item.missing_count} registros
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {contact ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-blue-600">
                  Contacto habilitado
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  {contact.user.name}
                </h3>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                onClick={() => setContact(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {contact.privacy_notice}
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              {contact.user.email ? (
                <div>
                  Correo:{" "}
                  <span className="font-medium text-slate-900">
                    {contact.user.email}
                  </span>
                </div>
              ) : null}
              {contact.user.celular ? (
                <div>
                  Celular:{" "}
                  <span className="font-medium text-slate-900">
                    {contact.user.celular}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {contact.user.whatsapp_url ? (
                <a
                  className={primaryButtonClass}
                  href={contact.user.whatsapp_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  WhatsApp
                </a>
              ) : null}
              {contact.user.email_url ? (
                <a className={secondaryButtonClass} href={contact.user.email_url}>
                  Enviar correo
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} />
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 text-center backdrop-blur">
        <div className="text-sm uppercase tracking-[0.3em] text-blue-200">
          FiguTrack
        </div>
        <div className="mt-3 text-2xl font-semibold">
          Cargando dashboard...
        </div>
      </div>
    </main>
  );
}

function SidebarButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-blue-500 text-white"
          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-2xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <div className="text-lg font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm text-blue-100">{description}</p>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-300">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function AlbumShowcaseCard({
  album,
  onAdd,
  onOpen,
}: {
  album: Album;
  onAdd: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div
        className="h-44 bg-slate-200 bg-cover bg-center"
        style={{
          backgroundImage: album.portada_url
            ? `linear-gradient(180deg, rgba(15,23,42,0.10), rgba(15,23,42,0.55)), url(${album.portada_url})`
            : undefined,
        }}
      />
      <div className="space-y-4 p-5">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-blue-600">
            {album.editorial}
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-950">
            {album.nombre}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {album.edicion ?? "Edición estándar"} · {album.total_stickers}{" "}
            figuritas
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {album.descripcion ?? "Sin descripción adicional."}
        </p>
        {album.progress ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Tu avance</span>
              <span>{album.progress.percentage}%</span>
            </div>
            <div className="mt-3">
              <ProgressBar progress={album.progress.percentage} />
            </div>
          </div>
        ) : null}
        {album.is_collecting ? (
          <button className={primaryButtonClass} onClick={onOpen} type="button">
            Abrir control
          </button>
        ) : (
          <button className={primaryButtonClass} onClick={onAdd} type="button">
            Agregar a mi colección
          </button>
        )}
      </div>
    </div>
  );
}

function StickerCard({
  sticker,
  busy,
  onToggle,
  onIncrease,
  onDecrease,
}: {
  sticker: StickerItem;
  busy: boolean;
  onToggle: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const isOwned = sticker.state.status === "owned";
  const isRepeated = sticker.state.status === "repeated";
  const base = isRepeated
    ? "border-amber-300 bg-amber-50"
    : isOwned
      ? "border-emerald-300 bg-emerald-50"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-3xl border p-3 shadow-sm transition ${base}`}>
      <button className="w-full text-left" disabled={busy} onClick={onToggle} type="button">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold text-slate-950">
              {sticker.codigo}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
              {sticker.categoria ?? "General"}
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
              isRepeated
                ? "bg-amber-500 text-white"
                : isOwned
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {isRepeated ? `x${sticker.state.repetidas}` : isOwned ? "Tengo" : "Falta"}
          </span>
        </div>
        <div className="mt-3 min-h-10 text-sm text-slate-600">
          {sticker.nombre ?? "Figurita sin nombre cargado"}
        </div>
      </button>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button className={miniButtonClass} disabled={busy} onClick={onDecrease} type="button">
          -
        </button>
        <div className="text-sm font-medium text-slate-700">
          {busy ? "Guardando..." : `${sticker.state.repetidas} repetidas`}
        </div>
        <button className={miniButtonClass} disabled={busy} onClick={onIncrease} type="button">
          +
        </button>
      </div>
    </div>
  );
}

function MatchList({
  title,
  items,
  tone,
}: {
  title: string;
  items: MatchSticker[];
  tone: "blue" | "emerald";
}) {
  const toneClass =
    tone === "blue" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">
            Sin coincidencias en esta dirección.
          </div>
        ) : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">{item.codigo}</span>
            {item.nombre ? ` · ${item.nombre}` : ""}
            {item.repetidas > 0 ? ` · x${item.repetidas}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="text-xl font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-white/8 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-300">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function ProgressBar({ progress, tall = false }: { progress: number; tall?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-full bg-slate-200 ${tall ? "h-4" : "h-3"}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function PasswordInput({
  className,
  placeholder,
  value,
  visible,
  onToggleVisibility,
  onChange,
  buttonClassName,
}: {
  className: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onToggleVisibility: () => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  buttonClassName?: string;
}) {
  return (
    <div className="relative">
      <input
        className={`${className} pr-14`}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        className={`absolute inset-y-0 right-0 flex w-12 items-center justify-center transition ${
          buttonClassName ?? "text-slate-300 hover:text-white"
        }`}
        type="button"
        onClick={onToggleVisibility}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function FieldLabelLight({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  );
}

function ControlSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-4 animate-pulse rounded-full bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-3xl border px-4 py-3 shadow-lg ${
            toast.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-sm">{toast.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function tabClass(active: boolean) {
  return `flex-1 rounded-2xl px-4 py-3 font-medium transition ${
    active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
  }`;
}

function pillClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition ${
    active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
  }`;
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12C3.8 8.5 7.4 6 12 6C16.6 6 20.2 8.5 22 12C20.2 15.5 16.6 18 12 18C7.4 18 3.8 15.5 2 12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M10.6 6.2C11.05 6.07 11.52 6 12 6C16.6 6 20.2 8.5 22 12C21.13 13.69 19.87 15.13 18.34 16.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M14.83 14.83C14.11 15.55 13.09 16 12 16C9.79 16 8 14.21 8 12C8 10.91 8.45 9.89 9.17 9.17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.11 6.11C4.39 7.23 3 8.92 2 12C3.8 15.5 7.4 18 12 18C13.73 18 15.32 17.65 16.71 17.03"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
