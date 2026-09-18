import { useRef, useState } from "react";
import { Github, UploadCloud } from "lucide-react";
import { githubScan, uploadScan } from "../api/client";
import type { ScanResult } from "../types/models";

interface Props {
  token: string;
  onResult: (result: ScanResult) => void;
}

export default function ScanSources({ token, onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<ScanResult>) => {
    setBusy(true);
    setError("");
    try {
      onResult(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-gray-800 bg-[#0e1422] p-5">
        <div className="flex items-center gap-2 mb-3">
          <UploadCloud className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm">Upload Source Archive</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">ZIP, TAR, TAR.GZ or TGZ files are scanned without executing submitted code.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.tar,.gz,.tgz"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) run(() => uploadScan(token, file));
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-xs font-bold hover:border-cyan-500 disabled:opacity-50"
        >
          {busy ? "Scanning..." : "Choose Archive"}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-[#0e1422] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Github className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-sm">Scan GitHub Repository</h3>
        </div>
        <div className="grid gap-2">
          <input
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs outline-none focus:border-cyan-500"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch (optional)"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            disabled={busy || !repositoryUrl.trim()}
            onClick={() => run(() => githubScan(token, repositoryUrl.trim(), branch.trim() || undefined))}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Scanning..." : "Scan Repository"}
          </button>
        </div>
      </div>

      {error && <p className="lg:col-span-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
