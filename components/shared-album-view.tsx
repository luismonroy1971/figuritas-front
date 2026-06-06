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
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
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
        setActiveTabKey(response.tabs[0]?.key ?? null);
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

  const activeTab = useMemo(
    () => payload?.tabs.find((tab) => tab.key === activeTabKey) ?? payload?.tabs[0] ?? null,
    [activeTabKey, payload],
  );

  const missingStickers = useMemo(
    () => activeTab?.stickers.filter((sticker) => sticker.state.status === "missing") ?? [],
    [activeTab],
  );

  const repeatedStickers = useMemo(
    () => activeTab?.stickers.filter((sticker) => sticker.state.status === "repeated") ?? [],
    [activeTab],
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

  const qrImageUrl = useMemo(() => {
    if (!currentUrl) {
      return "";
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}`;
  }, [currentUrl]);

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
                Lista compartida
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

        <section className="print-hidden grid gap-6 rounded-[32px] bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Enlace premium</h2>
            <p className="mt-2 text-sm text-slate-500">
              Comparte este enlace, envíalo por WhatsApp o deja que lo escaneen desde el QR.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                URL pública
              </div>
              <div className="mt-2 break-all font-mono text-sm text-slate-700">
                {currentUrl}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Código QR
            </div>
            {qrImageUrl ? (
              <img
                alt="Código QR del enlace compartido"
                className="mx-auto mt-3 h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3"
                src={qrImageUrl}
              />
            ) : null}
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {payload.tabs.map((tab) => (
              <button
                key={tab.key}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  (activeTab?.key ?? payload.tabs[0]?.key) === tab.key
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => setActiveTabKey(tab.key)}
                type="button"
              >
                {tab.label} · {tab.count}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Faltantes</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Figuritas que aún necesita en {activeTab?.label ?? "esta categoría"}.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
                {missingStickers.length}
              </span>
            </div>

            {missingStickers.length === 0 ? (
              <EmptyShareState text="No hay faltantes en esta categoría." />
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {missingStickers.map((sticker) => (
                  <SharedStickerCard key={sticker.id} sticker={sticker} tone="missing" />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Repetidas</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Figuritas disponibles para intercambiar en {activeTab?.label ?? "esta categoría"}.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                {repeatedStickers.length}
              </span>
            </div>

            {repeatedStickers.length === 0 ? (
              <EmptyShareState text="No hay repetidas en esta categoría." />
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {repeatedStickers.map((sticker) => (
                  <SharedStickerCard key={sticker.id} sticker={sticker} tone="repeated" />
                ))}
              </div>
            )}
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

function SharedStickerCard({
  sticker,
  tone,
}: {
  sticker: SharedSticker;
  tone: "missing" | "repeated";
}) {
  const toneClass =
    tone === "missing"
      ? "border-rose-200 bg-rose-50"
      : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-950">{sticker.codigo}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
            {sticker.categoria ?? "General"}
          </div>
        </div>
        {tone === "repeated" ? (
          <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold uppercase text-white">
            x{sticker.state.repetidas}
          </span>
        ) : (
          <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-semibold uppercase text-white">
            Falta
          </span>
        )}
      </div>
      <div className="mt-3 text-sm text-slate-700">
        {sticker.nombre ?? "Figurita sin nombre cargado"}
      </div>
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
