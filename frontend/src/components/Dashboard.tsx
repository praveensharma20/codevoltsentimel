import type { Finding, ScanResult, Severity } from '../types/models';
import { downloadReport } from '../api/client';

const severities: Array<Severity | 'all'> = ['all', 'critical', 'high', 'medium', 'low', 'info'];

export function Dashboard({ result, token, severity, setSeverity, query, setQuery }: { result: ScanResult | null; token: string; severity: Severity | 'all'; setSeverity: (value: Severity | 'all') => void; query: string; setQuery: (value: string) => void }) {
  if (!result) return <section className="empty">Run a scan to populate the security dashboard.</section>;
  const findings = result.findings.filter((finding) => matches(finding, severity, query));
  return <section className="dashboard">
    <header className="dashboard-header">
      <div><p className="eyebrow">Scan {result.scan_id}</p><h2>{result.source}</h2></div>
      <div className="exports"><button onClick={() => downloadReport(token, result.scan_id, 'json')}>Export JSON</button><button onClick={() => downloadReport(token, result.scan_id, 'csv')}>Export CSV</button></div>
    </header>
    <div className="cards">{severities.slice(1).map((level) => <button key={level} onClick={() => setSeverity(level)}><strong>{result.summary[level] ?? 0}</strong><span>{level}</span></button>)}</div>
    <div className="filters"><select value={severity} onChange={(event) => setSeverity(event.target.value as Severity | 'all')}>{severities.map((level) => <option key={level}>{level}</option>)}</select><input placeholder="Filter by file, category, or explanation" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="findings">{findings.map((finding) => <article className={`finding ${finding.severity}`} key={finding.id}><div><span className="badge">{finding.severity}</span><span>{finding.tool} · {finding.category} · {finding.confidence} confidence</span></div><h3>{finding.file_path}:{finding.line_number}</h3><p>{finding.explanation}</p><p><strong>Fix:</strong> {finding.fix_recommendation}</p>{finding.code && <pre>{finding.code}</pre>}</article>)}</div>
  </section>;
}

function matches(finding: Finding, severity: Severity | 'all', query: string) {
  const haystack = `${finding.file_path} ${finding.category} ${finding.explanation} ${finding.fix_recommendation}`.toLowerCase();
  return (severity === 'all' || finding.severity === severity) && haystack.includes(query.toLowerCase());
}
