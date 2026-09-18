import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { downloadReport, listScans } from "../api/client";
import type { ScanResult } from "../types/models";

export default function ScanHistory({ token }: { token: string }) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setError("");
      setScans(await listScans(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load scan history");
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-[#0e1422] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold">Scan History</h3>
        </div>
        <button type="button" onClick={() => void refresh()} className="p-2 rounded-lg bg-gray-900 border border-gray-700" aria-label="Refresh scan history">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!error && scans.length === 0 && <p className="text-xs text-gray-400">No scans yet. Run a code, upload, or GitHub scan.</p>}
      {scans.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="py-2 pr-4">SOURCE</th>
                <th className="py-2 pr-4">STATUS</th>
                <th className="py-2 pr-4">FINDINGS</th>
                <th className="py-2">REPORT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {scans.map((scan) => (
                <tr key={scan.scan_id}>
                  <td className="py-3 pr-4 max-w-[420px] truncate">{scan.source}</td>
                  <td className="py-3 pr-4 capitalize">{scan.status}</td>
                  <td className="py-3 pr-4">{scan.findings.length}</td>
                  <td className="py-3">
                    <button type="button" onClick={() => void downloadReport(token, scan.scan_id, "json")} className="text-cyan-400 hover:underline">
                      JSON
                    </button>
                    <span className="text-gray-600 px-2">|</span>
                    <button type="button" onClick={() => void downloadReport(token, scan.scan_id, "csv")} className="text-cyan-400 hover:underline">
                      CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
