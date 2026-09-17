import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth0 } from "@auth0/auth0-react";
import { 
  ShieldAlert, 
  Code2, 
  FileCode, 
  Terminal, 
  Cpu, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Bug, 
  RefreshCw, 
  Check, 
  Copy, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Sun, 
  Moon,
  Sparkles
} from 'lucide-react';

interface LogEntry {
  id: string;
  time: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

interface Vulnerability {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  line: number;
  description: string;
  recommendation: string;
  vulnerableCode: string;
  fixedCode: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'users' | 'editor'>('editor');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
  } = useAuth0();


  // Dynamic Live Metrics
  const [metrics, setMetrics] = useState({
    threatsBlocked: 378,
    activeScans: 16,
    sastHealth: 'Operational',
    systemLoad: '28%'
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'LOG-6086', time: '3:46:16 AM', type: 'Realtime Alert', severity: 'CRITICAL', message: 'Real-time WebSocket / SSE threat signal processed by Sentinel Engine.' },
    { id: 'LOG-9332', time: '3:45:55 AM', type: 'Realtime Alert', severity: 'HIGH', message: 'Semgrep static rule triggered on SQLi pattern.' },
    { id: 'LOG-1375', time: '3:45:46 AM', type: 'Realtime Alert', severity: 'CRITICAL', message: 'Hardcoded secret detected by Bandit parser.' },
  ]);

  // Code Editor State
  const [code, setCode] = useState<string>(`// Sample Code for Security Evaluation
function handleUserLogin(req, res) {
    let username = req.body.username;
    let password = req.body.password;

    const SECRET_KEY = "123456789_super_secret";
    let query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";
    
    db.query(query, (err, result) => {
        if (err) throw err;
        res.send(result);
    });
}`);

  const [isScanning, setIsScanning] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([
    {
      id: 'VULN-01',
      type: 'SQL Injection (CWE-89)',
      severity: 'High',
      line: 8,
      description: 'Unsanitized user input string formatted directly into SQL query.',
      recommendation: 'Use prepared statements or parameterized queries to sanitize input.',
      vulnerableCode: `let query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";`,
      fixedCode: `let query = "SELECT * FROM users WHERE user = ? AND pass = ?";\ndb.query(query, [username, password], callback);`
    }
  ]);

  // Real-time Live SSE Stream Sync
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8000/api/reports/sse/metrics');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(prev => ({
          ...prev,
          threatsBlocked: data.threatsBlocked,
          activeScans: data.activeScans,
          systemLoad: data.systemLoad
        }));

        if (data.log) {
          setLogs(prev => [data.log, ...prev.slice(0, 15)]);
        }
      } catch (e) {
        console.warn("SSE event parsing fallback.");
      }
    };

    return () => eventSource.close();
  }, []);

  // Run Real / Simulated Audit
  const handleScanCode = () => {
    setIsScanning(true);
    
    setTimeout(() => {
      setVulnerabilities([
        {
          id: 'VULN-01',
          type: 'SQL Injection (CWE-89)',
          severity: 'High',
          line: 8,
          description: 'Unsanitized user input string formatted directly into raw SQL query string.',
          recommendation: 'Use parameterized queries or prepared statements to sanitize inputs.',
          vulnerableCode: `let query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'";`,
          fixedCode: `let query = "SELECT * FROM users WHERE user = ? AND pass = ?";\ndb.query(query, [username, password], callback);`
        },
        {
          id: 'VULN-02',
          type: 'Hardcoded Credential (CWE-798)',
          severity: 'High',
          line: 6,
          tool: 'Bandit',
          description: 'Hardcoded sensitive credential / secret token discovered inside source code.',
          recommendation: 'Store sensitive secrets in environment variables (.env).',
          vulnerableCode: `const SECRET_KEY = "123456789_super_secret";`,
          fixedCode: `const SECRET_KEY = process.env.SECRET_KEY;`
        }
      ] as any);

      setMetrics(prev => ({ ...prev, threatsBlocked: prev.threatsBlocked + 1 }));
      setIsScanning(false);
    }, 1200);
  };

  // Auto Fix Click Functionality
  const applyFix = (vuln: Vulnerability) => {
    setCode(prev => prev.replace(vuln.vulnerableCode, vuln.fixedCode));
    setVulnerabilities(prev => prev.filter(v => v.id !== vuln.id));
    
    // Add event log
    const newFixLog: LogEntry = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toLocaleTimeString(),
      type: 'Auto-Fix',
      severity: 'LOW',
      message: `Applied automated AI patch for ${vuln.type}`
    };
    setLogs(prev => [newFixLog, ...prev]);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060911] text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060911] text-white">
        <h1 className="text-4xl font-bold mb-4">CodeVolt Sentinel</h1>
        <p className="text-gray-400 mb-8">AI Powered Secure Code Review Platform</p>
        <div className="flex gap-4">
          <button
            onClick={() => loginWithRedirect()}
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg font-semibold"
          >
            Login
          </button>
          <button
            onClick={() =>
              loginWithRedirect({
                authorizationParams: { screen_hint: "signup" },
              })
            }
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${darkMode ? 'bg-[#060911] text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`w-64 border-r flex flex-col justify-between p-5 ${darkMode ? 'bg-[#0b0f19] border-gray-800/80' : 'bg-white border-gray-200'}`}>
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-tr from-cyan-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-md tracking-wider">CODEVOLT</h1>
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest">SENTINEL</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-2 font-semibold text-xs">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'overview' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Metrics
            </button>

            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'logs' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Realtime Logs Table
            </button>

            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'users' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800/30'}`}
            >
              <Users className="w-4 h-4" />
              User Management
            </button>

            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition mt-4 ${activeTab === 'editor' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 font-bold shadow-lg shadow-indigo-500/10' : 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 text-cyan-400 hover:text-white'}`}
            >
              <Code2 className="w-4 h-4 text-cyan-400" />
              Run Code Review
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="border-t border-gray-800/80 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-black text-xs">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs font-bold">{user?.name}</p>
              <p className="text-[10px] text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin },
              })
            }
            className="text-gray-400 hover:text-red-400 transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER */}
        <header className={`border-b sticky top-0 z-30 px-8 py-4 flex items-center justify-between backdrop-blur-md ${darkMode ? 'bg-[#080c14]/80 border-gray-800/80' : 'bg-white/80 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg tracking-wide">Sentinel Security Control Center</h2>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live SSE Active
            </span>
          </div>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border transition ${darkMode ? 'bg-gray-900 border-gray-800 text-amber-400' : 'bg-gray-100 border-gray-300 text-indigo-600'}`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* BODY CONTENT */}
        <main className="p-8 flex flex-col gap-8 max-w-[1600px] w-full mx-auto">
          
          {/* REALTIME METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <span className="text-xs text-gray-400 font-medium">Threats Blocked</span>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">{metrics.threatsBlocked}</h3>
              <p className="text-[10px] text-emerald-400 mt-1 font-semibold">↑ Real-time SSE Sync</p>
            </div>

            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <span className="text-xs text-gray-400 font-medium">Active Concurrent Scans</span>
              <h3 className="text-2xl font-black text-indigo-400 mt-1">{metrics.activeScans}</h3>
              <p className="text-[10px] text-gray-400 mt-1">Semgrep + Bandit Workers</p>
            </div>

            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <span className="text-xs text-gray-400 font-medium">SAST Pipeline Health</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{metrics.sastHealth}</h3>
              <p className="text-[10px] text-emerald-500 mt-1 font-semibold">FastAPI Engine 100%</p>
            </div>

            <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <span className="text-xs text-gray-400 font-medium">CPU Workload</span>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{metrics.systemLoad}</h3>
              <p className="text-[10px] text-gray-400 mt-1">Docker Instance Load</p>
            </div>
          </div>

          {/* VIEW 1: CODE EDITOR & REVIEW (DEFAULT ACTIVE) */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Code Editor Panel */}
              <div className={`lg:col-span-7 border p-5 rounded-2xl flex flex-col gap-4 shadow-xl ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" /> Source Workspace Editor
                  </span>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopyCode}
                      className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>

                    <button 
                      onClick={handleScanCode} 
                      disabled={isScanning} 
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running SAST...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" /> Run Security Audit
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 bg-gray-950 p-4 rounded-xl font-mono text-xs text-gray-200 border border-gray-800/80 overflow-hidden flex">
                  <div className="select-none text-gray-600 text-right pr-4 border-r border-gray-800/80 leading-6">
                    {code.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    className="w-full h-80 bg-transparent pl-4 text-gray-200 resize-none focus:outline-none font-mono text-xs leading-6"
                    spellCheck="false"
                  />
                </div>
              </div>

              {/* Right Vulnerability Report Panel */}
              <div className={`lg:col-span-5 border p-5 rounded-2xl flex flex-col gap-4 shadow-xl ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Audit Findings & AI Fixes
                  </span>
                  <span className="text-[11px] bg-red-950/80 border border-red-800 text-red-400 px-2 py-0.5 rounded font-bold">
                    {vulnerabilities.length} Issues
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                  {vulnerabilities.length === 0 ? (
                    <div className="p-8 text-center text-emerald-400 flex flex-col items-center gap-2">
                      <ShieldCheck className="w-10 h-10" />
                      <p className="text-xs font-bold">Code is Clean! No Vulnerabilities Found.</p>
                    </div>
                  ) : (
                    vulnerabilities.map((v) => (
                      <div key={v.id} className="bg-gray-950 p-4 rounded-xl border border-gray-800/90 flex flex-col gap-3 shadow-lg">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Bug className="w-3.5 h-3.5 text-red-400" /> {v.type}
                          </span>
                          <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold">
                            {v.severity} • Line {v.line}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">{v.description}</p>

                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex flex-col gap-2">
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Secure Recommendation
                          </span>
                          <p className="text-xs text-gray-300 font-mono">{v.recommendation}</p>

                          <button 
                            onClick={() => applyFix(v)} 
                            className="mt-1 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                          >
                            <Zap className="w-3.5 h-3.5" /> Auto-Apply Fix
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: DASHBOARD METRICS & CHARTS */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className={`lg:col-span-8 p-6 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-sm font-bold mb-4">Real-time Vulnerability Detection Stream</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { time: '12:00', threatCount: 12 },
                        { time: '12:05', threatCount: 19 },
                        { time: '12:10', threatCount: 3 },
                        { time: '12:15', threatCount: 25 },
                        { time: '12:20', threatCount: 14 },
                        { time: '12:25', threatCount: 8 }
                      ]}>
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                        <YAxis stroke="#6b7280" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937' }} />
                        <Area type="monotone" dataKey="threatCount" stroke="#06b6d4" fill="#06b6d420" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`lg:col-span-4 p-6 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-sm font-bold mb-4">Vulnerabilities by Severity</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Critical', count: 4 },
                        { name: 'High', count: 12 },
                        { name: 'Medium', count: 18 },
                        { name: 'Low', count: 8 },
                      ]}>
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                        <YAxis stroke="#6b7280" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f2937' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: REALTIME LOGS TABLE */}
          {activeTab === 'logs' && (
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Realtime Security Event Logs Table</h3>
                <span className="text-xs text-cyan-400 font-mono">Live WebSocket Streaming</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4">LOG ID</th>
                    <th className="py-3 px-4">TIME</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">SEVERITY</th>
                    <th className="py-3 px-4">MESSAGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-cyan-500/5 transition">
                      <td className="py-3 px-4 font-mono font-bold text-gray-300">{log.id}</td>
                      <td className="py-3 px-4 text-gray-400">{log.time}</td>
                      <td className="py-3 px-4 font-semibold text-cyan-400">{log.type}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' : 
                          log.severity === 'HIGH' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 
                          'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 4: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#0e1422] border-gray-800' : 'bg-white border-gray-200'}`}>
              <h3 className="text-sm font-bold mb-4">User Management Table</h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="py-3 px-4">NAME</th>
                    <th className="py-3 px-4">ROLE</th>
                    <th className="py-3 px-4">EMAIL</th>
                    <th className="py-3 px-4">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  <tr>
                    <td className="py-3 px-4 font-bold">Praveen Kumar</td>
                    <td className="py-3 px-4 text-cyan-400">Project Admin</td>
                    <td className="py-3 px-4 text-gray-400">23cse349.praveenkumar@giet.edu</td>
                    <td className="py-3 px-4"><span className="text-emerald-400 font-bold">Active</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Prasanjit Swain</td>
                    <td className="py-3 px-4 text-cyan-400">Security Developer</td>
                    <td className="py-3 px-4 text-gray-400">23cse398.prasanjitswain@giet.edu</td>
                    <td className="py-3 px-4"><span className="text-emerald-400 font-bold">Active</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold">Sneha Kumari</td>
                    <td className="py-3 px-4 text-cyan-400">Security Analyst</td>
                    <td className="py-3 px-4 text-gray-400">23cse436.snehakumari@giet.edu</td>
                    <td className="py-3 px-4"><span className="text-emerald-400 font-bold">Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
