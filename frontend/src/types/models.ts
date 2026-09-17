export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  tool: 'semgrep' | 'bandit' | 'platform';
  category: string;
  file_path: string;
  line_number: number;
  severity: Severity;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  fix_recommendation: string;
  code?: string | null;
}

export interface ScanResult {
  scan_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  source: string;
  findings: Finding[];
  summary: Record<string, number>;
  error?: string | null;
}
