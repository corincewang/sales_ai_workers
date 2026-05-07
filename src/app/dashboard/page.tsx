"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";

import { warmBatchInsights } from "./actions";

const PAGE_SIZE = 20;
const WARM_FIRST = 10;
const SCROLL_NEAR_BOTTOM_PX = 80;

type ContractorListItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  zipCode: string;
  certificationLevel: string | null;
};

type ListMeta = { skip: number; limit: number; total: number; hasMore: boolean };

type LeadInsightDto = {
  id: string;
  summary: string;
  companyType: string;
  priorityScore: number;
  talkingPoints: unknown;
  recommendedProducts: unknown;
  risks: unknown;
  generatedAt: string;
  modelVersion: string | null;
  promptVersion: string | null;
};

type ContractorDetail = ContractorListItem & {
  phone: string | null;
  website: string | null;
  address: string | null;
  dedupeKey: string;
  lastSeenAt: string;
  latestInsight: LeadInsightDto | null;
};

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function buildListParams(
  zip: string,
  excludeSeed: boolean,
  skip: number,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("skip", String(skip));
  if (zip.trim()) params.set("zip", zip.trim());
  if (excludeSeed) params.set("excludeSeed", "true");
  return params;
}

/** Avoid `res.json()` on HTML error pages (returns clearer errors in dev). */
async function parseApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 220);
    throw new Error(
      !res.ok
        ? `HTTP ${res.status} (${snippet || res.statusText})`
        : `Expected JSON, got: ${snippet}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid JSON (HTTP ${res.status}): ${text.replace(/\s+/g, " ").trim().slice(0, 160)}`,
    );
  }
}

export default function DashboardPage() {
  /** Empty = all ZIPs. Scraped Coveo rows often are not ZIP 10013 even when search is centered there. */
  const [zip, setZip] = useState("");
  const [excludeSeed, setExcludeSeed] = useState(true);
  const [list, setList] = useState<ContractorListItem[]>([]);
  const [listMeta, setListMeta] = useState<ListMeta | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [warmStatus, setWarmStatus] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContractorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  /** Prevents duplicate next-page fetches when scroll fires repeatedly before React re-renders. */
  const loadMoreLockedRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setGenerateMessage(null);
    try {
      const res = await fetch(
        `/api/contractors/${encodeURIComponent(id)}?include=latestInsight`,
      );
      const json = await parseApiJson<{ data?: ContractorDetail; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setDetail(json.data ?? null);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "detail");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const reloadList = useCallback(async () => {
    loadMoreLockedRef.current = false;
    setListLoading(true);
    setListLoadingMore(false);
    setListError(null);
    setSelectedId(null);
    setDetail(null);
    setWarmStatus(null);
    setListMeta(null);
    try {
      const params = buildListParams(zip, excludeSeed, 0);
      const res = await fetch(`/api/contractors?${params}`);
      const json = await parseApiJson<{
        data?: ContractorListItem[];
        meta?: ListMeta;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      const rows = json.data ?? [];
      setList(rows);
      setListMeta(
        json.meta ?? {
          skip: 0,
          limit: PAGE_SIZE,
          total: rows.length,
          hasMore: false,
        },
      );

      const warmIds = rows.slice(0, WARM_FIRST).map((c) => c.id);
      if (warmIds.length > 0) {
        setWarmStatus("Pre-generating insights for first 10 leads (server)…");
        void warmBatchInsights(warmIds).then((r) => {
            if (!r.ok) {
              setWarmStatus(`Insight warm-up failed: ${r.error}`);
              return;
            }
            setWarmStatus(
              `Insight warm-up: ${r.summary.ok} generated, ${r.summary.skipped} already had, ${r.summary.error} errors.`,
            );
            const sid = selectedIdRef.current;
            if (sid && warmIds.includes(sid)) void loadDetail(sid);
          });
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load contractors");
      setList([]);
      setListMeta(null);
    } finally {
      setListLoading(false);
    }
  }, [zip, excludeSeed, loadDetail]);

  const loadMore = useCallback(async () => {
    if (listLoading || listLoadingMore || !listMeta?.hasMore || loadMoreLockedRef.current) {
      return;
    }
    loadMoreLockedRef.current = true;
    setListLoadingMore(true);
    setListError(null);
    try {
      const nextSkip = list.length;
      const params = buildListParams(zip, excludeSeed, nextSkip);
      const res = await fetch(`/api/contractors?${params}`);
      const json = await parseApiJson<{
        data?: ContractorListItem[];
        meta?: ListMeta;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      const chunk = json.data ?? [];
      setList((prev) => [...prev, ...chunk]);
      if (json.meta) setListMeta(json.meta);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      loadMoreLockedRef.current = false;
      setListLoadingMore(false);
    }
  }, [zip, excludeSeed, list.length, listLoading, listLoadingMore, listMeta?.hasMore]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  function handleListScroll(e: UIEvent<HTMLUListElement>) {
    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_NEAR_BOTTOM_PX;
    if (nearBottom) void loadMore();
  }

  async function handleGenerate() {
    if (!selectedId) return;
    setGenerateLoading(true);
    setGenerateMessage(null);
    try {
      const res = await fetch(`/api/contractors/${encodeURIComponent(selectedId)}/insights`, {
        method: "POST",
      });
      const json = await parseApiJson<{ error?: string; code?: string; data?: { id: string } }>(res);
      if (!res.ok) {
        setGenerateMessage(json.error ?? `${json.code ?? "error"} (${res.status})`);
        return;
      }
      setGenerateMessage(`Saved insight ${json.data?.id ?? ""}. Refreshing…`);
      await loadDetail(selectedId);
      setGenerateMessage("Insight generated and loaded.");
    } catch (e) {
      setGenerateMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenerateLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Roofing distributor — account planning
            </p>
            <h1 className="text-lg font-semibold">Lead insights</h1>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            API index
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500">ZIP (optional)</span>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="All"
                className="w-28 rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={excludeSeed}
                onChange={(e) => setExcludeSeed(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600"
              />
              Hide demo seed rows
            </label>
            <button
              type="button"
              onClick={() => void reloadList()}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Load list
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Paginated ({PAGE_SIZE}/page). Scroll the list to preload the next page. First {WARM_FIRST} leads
            kick off server insight generation after the initial load.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Scraped contractors use their listing postal code (often outside 10013). Leave ZIP blank for all
            Coveo imports; use the checkbox to drop prisma seed fictitious leads.
          </p>

          {listError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{listError}</p>
          )}
          {warmStatus && (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{warmStatus}</p>
          )}
          {listLoading && (
            <p className="mt-3 text-sm text-zinc-500">Loading contractors…</p>
          )}

          {!listLoading && !listError && listMeta && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing {list.length} of {listMeta.total}
              {listMeta.hasMore ? " · scroll for more" : ""}
              {listLoadingMore ? " · loading…" : ""}
            </p>
          )}

          {!listLoading && !listError && (
            <ul
              className="mt-2 max-h-[min(60vh,480px)] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800"
              onScroll={handleListScroll}
            >
              {list.length === 0 && (
                <li className="py-3 text-sm text-zinc-500">No contractors match filters.</li>
              )}
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full flex-col items-start gap-0.5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                      selectedId === c.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-zinc-500">
                      {[c.city, c.state, c.zipCode].filter(Boolean).join(", ") ||
                        c.zipCode}
                      {c.certificationLevel ? ` · ${c.certificationLevel}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedId && (
            <p className="text-sm text-zinc-500">Select a contractor to view insight.</p>
          )}
          {selectedId && detailLoading && (
            <p className="text-sm text-zinc-500">Loading detail…</p>
          )}
          {detailError && (
            <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
          )}
          {detail && !detailLoading && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{detail.name}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {[detail.address, detail.city, detail.state, detail.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {detail.phone && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{detail.phone}</p>
                )}
                {detail.website && (
                  <a
                    href={detail.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {detail.website}
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={generateLoading}
                  onClick={() => void handleGenerate()}
                  className="rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  {generateLoading ? "Generating…" : "Generate / refresh insight"}
                </button>
              </div>
              {generateMessage && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{generateMessage}</p>
              )}

              <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  AI insight (latest)
                </h3>
                {!detail.latestInsight && (
                  <p className="mt-2 text-sm text-zinc-500">
                    No insight yet — click generate (uses OpenAI + saves to DB).
                  </p>
                )}
                {detail.latestInsight && (
                  <div className="mt-3 space-y-3 text-sm">
                    <p>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Priority score:{" "}
                      </span>
                      <span className="text-lg font-semibold tabular-nums">
                        {detail.latestInsight.priorityScore}
                      </span>
                      <span className="text-zinc-500"> / 100</span>
                    </p>
                    <p>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Type:{" "}
                      </span>
                      {detail.latestInsight.companyType}
                    </p>
                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">Summary</p>
                      <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {detail.latestInsight.summary}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">
                        Talking points
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-400">
                        {asStringList(detail.latestInsight.talkingPoints).map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Model {detail.latestInsight.modelVersion ?? "—"} · prompt{" "}
                      {detail.latestInsight.promptVersion ?? "—"} ·{" "}
                      {new Date(detail.latestInsight.generatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
