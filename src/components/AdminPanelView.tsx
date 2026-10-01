import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Trophy,
  Database,
  TrendingUp,
  UserCheck,
  UserX,
  Search,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  Lock,
  HardDrive,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { User, Tournament } from '../types';

interface AdminPanelViewProps {
  currentUser: User;
  tournaments: Tournament[];
  onSelectTournament: (t: Tournament) => void;
  onBackToApp: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  tournaments,
  onSelectTournament,
  onBackToApp,
  onLogout,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'TOURNAMENTS' | 'DATABASE'>('OVERVIEW');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchUsersAndStats = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      if (!usersRes.ok || !statsRes.ok) throw new Error(usersData.error || statsData.error || 'Failed to load admin data');
      if (usersData.success) {
        setUsersList(usersData.users);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      setActionMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndStats();
  }, []);

  const handleToggleUser = async (userId: string, currentRole: string) => {
    if (currentRole === 'ADMIN') {
      alert('Cannot block Super Administrator account.');
      return;
    }
    try {
      const res = await fetch('/api/admin/toggle-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user');
      if (data.success) {
        setActionMessage(`User status updated to ${data.status}`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchUsersAndStats();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleExportBackup = () => {
    void dbService.exportBackup().then(ok => { if (!ok) setActionMessage('Backup download failed'); });
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/db/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        });
        const data = await res.json();
        if (data.success) {
          alert('Database restored successfully from backup!');
          fetchUsersAndStats();
          onRefreshData();
        } else {
          alert(data.error || 'Restore failed');
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Super Admin Control Center</h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">
                  Root Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-slate-200 font-semibold">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsersAndStats}
              disabled={loading}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/80 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Manage Tournaments</span>
            </button>
            <button onClick={onLogout} className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold">Sign Out</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-2 border-t border-slate-800/50 pt-1 pb-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'OVERVIEW'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Platform Overview
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'USERS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Organizers & Users ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('TOURNAMENTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'TOURNAMENTS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            All Tournaments ({tournaments.length})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-fadeIn">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Total Organizers</span>
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{stats?.usersCount ?? usersList.length}</div>
                <p className="text-[11px] text-slate-500 mt-1">Registered league hosts</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Total Tournaments</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{stats?.tournamentsCount ?? tournaments.length}</div>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  {stats?.liveTournamentsCount ?? 0} currently Live
                </p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Teams & Rosters</span>
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{stats?.teamsCount ?? 0}</div>
                <p className="text-[11px] text-slate-500 mt-1">Franchises created</p>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Total Player Pool</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">{stats?.playersCount ?? 0}</div>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  {stats?.soldPlayersCount ?? 0} successfully sold
                </p>
              </div>
            </div>

            {/* Quick Summary Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Recently Registered Users
                  </h3>
                  <button
                    onClick={() => setActiveTab('USERS')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>
                <div className="space-y-2.5">
                  {usersList.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400 border border-slate-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{user.name}</p>
                          <p className="text-[11px] text-slate-400 break-all">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            user.role === 'ADMIN'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {user.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {user.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Engine Status */}
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Database & Architecture Status
                </h3>
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="font-mono text-emerald-400 font-bold">PostgreSQL</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Storage:</span>
                    <span className="font-mono text-slate-300 text-[11px]">Coolify managed database</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Backup method:</span>
                    <span className="font-mono text-cyan-400 font-semibold">Manual JSON export</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Multi-Organizer Isolation:</span>
                    <span className="font-mono text-emerald-400 font-semibold">Active (Per-User Scoped)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Live updates:</span>
                    <span className="font-mono text-amber-400 font-semibold">Every 2 seconds</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & ORGANIZERS */}
        {activeTab === 'USERS' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or organizer..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <div className="text-xs text-slate-400">
                Total Registered: <strong className="text-white">{filteredUsers.length}</strong>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Tournaments</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{user.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.role === 'ADMIN'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white">{user.tournamentsCount ?? 0}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {user.role !== 'ADMIN' ? (
                              <button
                                onClick={() => handleToggleUser(user.id, user.role)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                  user.status === 'ACTIVE'
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {user.status === 'ACTIVE' ? 'Block Access' : 'Activate'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Protected</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALL TOURNAMENTS */}
        {activeTab === 'TOURNAMENTS' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div>
                <h3 className="font-bold text-white text-sm">Platform Tournaments</h3>
                <p className="text-xs text-slate-400">View and inspect all tournaments across all organizers.</p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold">
                {tournaments.length} Tournaments Total
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournaments.map((tourney) => (
                <div
                  key={tourney.id}
                  className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-amber-500/40 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {tourney.logoUrl ? (
                          <img src={tourney.logoUrl} alt={tourney.name} className="w-full h-full object-cover" />
                        ) : (
                          <Trophy className="w-6 h-6 text-amber-400" />
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                          tourney.status === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                            : tourney.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        {tourney.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base group-hover:text-amber-400 transition">
                      {tourney.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tourney.season} • {tourney.year}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Organizer:</span>
                        <span className="text-slate-200 font-mono text-[11px]">
                          {tourney.creatorEmail || 'Platform Admin'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Price:</span>
                        <span className="text-white font-semibold">
                          ₹{tourney.defaultBasePrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Venue:</span>
                        <span className="text-slate-300">{tourney.city || tourney.ground || 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        onSelectTournament(tourney);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <span>View Public Summary</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DATABASE & BACKUPS */}
        {activeTab === 'DATABASE' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl">
              <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                ACID Database Engine Management
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Tournament records are stored in PostgreSQL; auction commands commit atomically.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Backup export card */}
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/20">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">Export Full Platform JSON Backup</h4>
                    <p className="text-xs text-slate-400">
                      Downloads tournament records, teams, players, tournament rules and live auction state. Account passwords and sessions are excluded.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="mt-4 w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup File
                  </button>
                </div>

                {/* Backup restore card */}
                <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 border border-cyan-500/20">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">Restore Database from Backup</h4>
                    <p className="text-xs text-slate-400">
                      Select a valid Cricket Auction Pro backup file (.json) to merge records into PostgreSQL on the original installation.
                    </p>
                  </div>
                  <label className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload & Restore Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
