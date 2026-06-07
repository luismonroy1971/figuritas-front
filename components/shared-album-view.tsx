import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, extractMessage } from "@/lib/api";

type SharedStickerState = {
  tiene: boolean;
  repetidas: number;
  status: "missing" | "owned" | "repeated";
};

type SharedSticker = {
  id: number;
  codigo: string;
  nombre: string | null;
  categoria: string | null;
  tipo: string;
  imagen_url: string | null;
  state: SharedStickerState;
};

type SharedTab = {
  key: string;
  label: string;
  count: number;
  stickers: SharedSticker[];
};

type QuickGroup = {
  key: string;
  shortCode: string;
  emoji: string;
  title: string;
  numbers: string[];
};

type SharedAlbumPayload = {
  owner: {
    name: string;
  };
  album: {
    id: number;
    nombre: string;
    editorial: string;
    edicion: string | null;
    anio: number | null;
    descripcion: string | null;
    portada_url: string | null;
  };
  progress: {
    owned: number;
    total: number;
    missing: number;
    repeated: number;
    percentage: number;
  };
  last_updated_at: string | null;
  tabs: SharedTab[];
};

export default function SharedAlbumView({
  shareKey,
  albumId,
}: {
  shareKey: string;
  albumId: number;
}) {
  const [payload, setPayload] = useState<SharedAlbumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.href : "",
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<SharedAlbumPayload>(
          `/compartir/${encodeURIComponent(shareKey)}/albumes/${albumId}`,
        );

        if (cancelled) {
          return;
        }

        setPayload(response);
      } catch (requestError) {
        if (!cancelled) {
          setError(extractMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [albumId, shareKey]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const allTab = useMemo<SharedTab | null>(() => {
    if (!payload) {
      return null;
    }

    return {
      key: "all",
      label: "Todo el album",
      count: payload.tabs.reduce((total, tab) => total + tab.count, 0),
      stickers: payload.tabs.flatMap((tab) => tab.stickers),
    };
  }, [payload]);

  const allAlbumSummary = useMemo(
    () => buildQuickSummary(allTab?.stickers ?? []),
    [allTab],
  );

  const shareText = useMemo(() => {
    if (!payload) {
      return "";
    }

    return `Te comparto mi lista de ${payload.album.nombre} en FiguTrack. Me faltan ${payload.progress.missing} figuritas y tengo ${payload.progress.repeated} repetidas para intercambiar.`;
  }, [payload]);

  const whatsappUrl = useMemo(() => {
    if (!currentUrl || !shareText) {
      return "#";
    }

    return `https://wa.me/?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`;
  }, [currentUrl, shareText]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl || window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadCsv() {
    if (!payload) {
      return;
    }

    const rows = [
      ["codigo", "categoria", "nombre", "tiene", "repetidas", "estado"],
      ...payload.tabs.flatMap((tab) =>
        tab.stickers.map((sticker) => [
          sticker.codigo,
          sticker.categoria ?? "General",
          sticker.nombre ?? "",
          sticker.state.tiene ? "si" : "no",
          String(sticker.state.repetidas),
          sticker.state.status === "repeated"
            ? "repetida"
            : sticker.state.status === "owned"
              ? "tiene"
              : "falta",
        ]),
      ),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `lista-compartida-${slugify(payload.album.nombre)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-40 animate-pulse rounded-[32px] bg-slate-200" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-[32px] bg-slate-200" />
            <div className="h-96 animate-pulse rounded-[32px] bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 text-center shadow-sm">
          <div className="text-sm uppercase tracking-[0.24em] text-rose-500">
            Enlace no disponible
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            No se pudo abrir la lista compartida
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {error ?? "La lista que buscas ya no existe o el enlace es incorrecto."}
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              to="/"
            >
              Ir a FiguTrack
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-2xl shadow-slate-300">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] text-blue-200">
                Figuritas App - Lista
              </div>
              <h1 className="mt-3 text-3xl font-semibold">{payload.album.nombre}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                {payload.owner.name} comparte sus faltantes y repetidas para este álbum.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {payload.album.editorial}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {payload.album.edicion ?? "Edición estándar"}
                </span>
                {payload.album.anio ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {payload.album.anio}
                  </span>
                ) : null}
              </div>
              {payload.last_updated_at ? (
                <p className="mt-4 text-xs text-slate-400">
                  Última actualización:{" "}
                  {new Intl.DateTimeFormat("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(payload.last_updated_at))}
                </p>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard label="Completadas" value={`${payload.progress.owned}/${payload.progress.total}`} />
                <StatCard label="Faltantes" value={payload.progress.missing} />
                <StatCard label="Repetidas" value={payload.progress.repeated} />
                <StatCard label="Avance" value={`${payload.progress.percentage}%`} />
              </div>
              <div className="mt-5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                  style={{ width: `${Math.min(Math.max(payload.progress.percentage, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="print-hidden rounded-[32px] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Comparte esta vista</h2>
              <p className="mt-2 text-sm text-slate-500">
                Envía este enlace a otros coleccionistas para que vean qué le falta y qué tiene repetido.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">
                Es una vista pública: cualquiera con la URL puede abrirla.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? "Enlace copiado" : "Copiar enlace"}
              </button>
              <a
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                Compartir por WhatsApp
              </a>
              <button
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                onClick={handleDownloadCsv}
                type="button"
              >
                Exportar CSV
              </button>
              <button
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                onClick={handlePrint}
                type="button"
              >
                Guardar en PDF
              </button>
              <Link
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                to="/"
              >
                Abrir FiguTrack
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] text-blue-600">
                Lectura rápida
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Usa {payload.album.nombre}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Resumen completo del álbum agrupado por selección y secciones especiales.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {payload.owner.name} comparte {payload.progress.missing} faltantes y{" "}
              {payload.progress.repeated} repetidas
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <QuickSummaryCard
              emptyText="No hay faltantes registrados en el álbum completo."
              groups={allAlbumSummary.missing}
              total={payload.progress.missing}
              tone="missing"
            />
            <QuickSummaryCard
              emptyText="No hay repetidas registradas en el álbum completo."
              groups={allAlbumSummary.repeated}
              total={payload.progress.repeated}
              tone="repeated"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl bg-white/8 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function QuickSummaryCard({
  groups,
  tone,
  emptyText,
  total,
}: {
  groups: QuickGroup[];
  tone: "missing" | "repeated";
  emptyText: string;
  total: number;
}) {
  return (
    <div
      className={`rounded-[28px] border p-5 ${
        tone === "missing"
          ? "border-rose-200 bg-rose-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {tone === "missing" ? "Me faltan" : "Repetidas"}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{total}</div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            tone === "missing"
              ? "bg-rose-500 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {tone === "missing" ? "Lectura rápida" : "Intercambio"}
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyShareState text={emptyText} />
      ) : (
        <QuickGroupList groups={groups} tone={tone} />
      )}
    </div>
  );
}

function EmptyShareState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function QuickGroupList({
  groups,
  tone,
}: {
  groups: QuickGroup[];
  tone: "missing" | "repeated";
}) {
  return (
    <div className="mt-5 space-y-3">
      {groups.map((group) => (
        <div
          key={group.key}
          className={`rounded-2xl border px-4 py-3 ${
            tone === "missing"
              ? "border-rose-200 bg-white/80"
              : "border-amber-200 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-lg">
                {group.emoji}
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  {group.shortCode} {group.emoji}
                </div>
                <div className="text-xs text-slate-500">{group.title}</div>
              </div>
            </div>
            <div className="font-mono text-sm text-slate-700 sm:text-right">
              {group.numbers.join(", ")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "album"
  );
}

function buildQuickSummary(stickers: SharedSticker[]) {
  const missing = new Map<string, QuickGroup>();
  const repeated = new Map<string, QuickGroup>();

  for (const sticker of stickers) {
    const number = extractStickerNumber(sticker.codigo);
    if (!number) {
      continue;
    }

    const meta = resolveGroupMeta(sticker);
    const target =
      sticker.state.status === "missing"
        ? missing
        : sticker.state.status === "repeated"
          ? repeated
          : null;

    if (!target) {
      continue;
    }

    const existing = target.get(meta.key);
    if (existing) {
      existing.numbers.push(number);
      continue;
    }

    target.set(meta.key, {
      key: meta.key,
      shortCode: meta.shortCode,
      emoji: meta.emoji,
      title: meta.title,
      numbers: [number],
    });
  }

  return {
    missing: [...missing.values()],
    repeated: [...repeated.values()],
  };
}

function resolveGroupMeta(sticker: SharedSticker) {
  const prefix = extractStickerPrefix(sticker.codigo);
  const category = sticker.categoria ?? "General";
  const countryName = extractCountryName(sticker.nombre);
  const stickerName = sticker.nombre ?? "";

  if (prefix === "FWC") {
    if (
      /world cup history/i.test(category) ||
      /1934|1950|1954|1962|1974|1986|1994|2002|2006|2014|2022/i.test(stickerName)
    ) {
      return {
        key: "FWC-history",
        shortCode: "FWC",
        emoji: "📜",
        title: "World Cup History",
      };
    }

    if (
      /host countries|cities/i.test(category) ||
      /canada|mexico|usa/i.test(stickerName)
    ) {
      return {
        key: "FWC-hosts",
        shortCode: "FWC",
        emoji: "🌎",
        title: "Host Countries & Cities",
      };
    }

    return {
      key: "FWC-main",
      shortCode: "FWC",
      emoji: "🏆",
      title: "World Cup",
    };
  }

  return {
    key: prefix,
    shortCode: prefix,
    emoji: flagForCountryName(countryName),
    title: countryName ?? category,
  };
}

function extractStickerPrefix(code: string) {
  const match = code.match(/^([A-Za-z]+)/);
  return match?.[1]?.toUpperCase() ?? code.toUpperCase();
}

function extractStickerNumber(code: string) {
  const match = code.match(/[A-Za-z]+(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function extractCountryName(name: string | null) {
  if (!name) {
    return null;
  }

  const parts = name.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1]?.trim() ?? null : null;
}

function flagForCountryName(countryName: string | null) {
  if (!countryName) {
    return "🏳️";
  }

  return COUNTRY_FLAGS[countryName] ?? COUNTRY_FLAGS[countryName.replace(/\./g, "")] ?? "🏳️";
}

const COUNTRY_FLAGS: Record<string, string> = {
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Bosnia and Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cape Verde": "🇨🇻",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  Curacao: "🇨🇼",
  Czechia: "🇨🇿",
  "DR Congo": "🇨🇩",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "🏴",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: "🏴",
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  USA: "🇺🇸",
  Uzbekistan: "🇺🇿",
  "Côte d'Ivoire": "🇨🇮",
  "Cote d'Ivoire": "🇨🇮",
};
