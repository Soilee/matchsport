import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Users, CreditCard, Activity, TrendingUp, Search, Bell, Settings, LogOut, Dumbbell, Layout, CheckSquare, UserPlus, ShieldCheck, Key, Trash2, Edit, DollarSign, Menu, X } from 'lucide-react';
import './App.css';

const API_URL = 'https://matchsport.onrender.com/api';
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00-22:00
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Pzt', tue: 'Sal', wed: 'Çar', thu: 'Per', fri: 'Cum', sat: 'Cmt', sun: 'Paz' };

function getHeatColor(value, max) {
  if (!max || !value) return 'rgba(255,255,255,0.04)';
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.25) return `rgba(74, 222, 128, ${0.2 + ratio * 2})`;
  if (ratio < 0.5) return `rgba(250, 204, 21, ${0.3 + ratio})`;
  if (ratio < 0.75) return `rgba(251, 146, 60, ${0.4 + ratio * 0.6})`;
  return `rgba(239, 68, 68, ${0.5 + ratio * 0.5})`;
}

const ACTION_LABELS = {
  PAYMENT_COMPLETED: '💰 Ödeme Onaylandı', USER_CREATED: '👤 Kullanıcı Oluşturuldu',
  USER_UPDATED: '✏️ Kullanıcı Güncellendi', USER_DELETED: '🗑️ Kullanıcı Silindi',
  MEMBERSHIP_EXTENDED: '📅 Üyelik Uzatıldı', MEMBERSHIP_UPDATED: '🔄 Üyelik Güncellendi',
  ROLE_CHANGED: '🛡️ Rol Değiştirildi', PASSWORD_RESET: '🔑 Şifre Sıfırlandı',
  DIET_ASSIGNED: '🥗 Diyet Atandı', ANNOUNCEMENT_CREATED: '📢 Duyuru Yayınlandı',
  USER_REGISTERED: '📝 Üye Kaydedildi', USER_UPDATED_BY_ADMIN: '✏️ Admin Güncelledi'
};

const HeatmapComponent = ({ data }) => {
  const grid = {};
  let maxVal = 1;
  (data || []).forEach(d => {
    const key = `${d.day_of_week}-${d.hour_of_day}`;
    grid[key] = (grid[key] || 0) + (d.current_count || 0);
    if (grid[key] > maxVal) maxVal = grid[key];
  });
  // Normalize by count
  const counts = {};
  (data || []).forEach(d => { const k = `${d.day_of_week}-${d.hour_of_day}`; counts[k] = (counts[k] || 0) + 1; });
  Object.keys(grid).forEach(k => { if (counts[k] > 1) grid[k] = Math.round(grid[k] / counts[k]); });
  maxVal = Math.max(...Object.values(grid), 1);

  return (
    <div className="heatmap-container">
      <div className="heatmap-title"><Activity size={18} color="#FF9500" /> Saatlik Yoğunluk Haritası</div>
      <div className="heatmap-grid">
        <div className="heatmap-label"></div>
        {HOURS.map(h => <div key={h} className="heatmap-label">{String(h).padStart(2, '0')}</div>)}
        {DAYS.map(day => (
          <React.Fragment key={day}>
            <div className="heatmap-label">{DAY_LABELS[day]}</div>
            {HOURS.map(h => {
              const val = grid[`${day}-${h}`] || 0;
              return (
                <div key={h} className="heatmap-cell" style={{ background: getHeatColor(val, maxVal) }}>
                  <div className="heatmap-tooltip">{DAY_LABELS[day]} {h}:00 — {val} kişi</div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Az</span>
        {[0.1, 0.3, 0.5, 0.7, 0.95].map((r, i) => (
          <div key={i} className="heatmap-legend-cell" style={{ background: getHeatColor(r * 10, 10) }} />
        ))}
        <span>Çok</span>
      </div>
    </div>
  );
};

const App = () => {
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, totalRevenue: 0, occupancy: 0 });
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [modal, setModal] = useState({ show: false, type: '', data: null });
  const [formData, setFormData] = useState({});
  const [heatmapData, setHeatmapData] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [financeData, setFinanceData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const token = localStorage.getItem('token');
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchData();
    const sub = supabase.channel('schema-db-changes').on('postgres_changes', { event: '*', schema: 'public' }, fetchData).subscribe();
    const interval = setInterval(fetchLiveOccupancy, 30000);
    return () => { supabase.removeChannel(sub); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (activeView === 'finance' && isAdmin) fetchFinance();
    if (activeView === 'audit' && isAdmin) fetchAuditLogs();
  }, [activeView]);

  async function fetchLiveOccupancy() {
    try {
      const res = await fetch(`${API_URL}/occupancy/live`, { headers });
      const d = await res.json();
      setLiveCount(d.current_count || 0);
    } catch (e) { /* silent */ }
  }

  async function fetchFinance() {
    try {
      const res = await fetch(`${API_URL}/admin/finance`, { headers });
      setFinanceData(await res.json());
    } catch (e) { console.error(e); }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs?limit=50`, { headers });
      setAuditLogs(await res.json());
    } catch (e) { console.error(e); }
  }

  async function fetchData() {
    try {
      if (!token) { setLoading(false); return; }
      setLoading(true);
      const response = await fetch(`${API_URL}/dashboard`, { headers });
      const dashRes = await response.json();
      if (dashRes.error) {
        if (dashRes.error.includes('token')) localStorage.removeItem('token');
        setLoading(false); return;
      }
      setCurrentUser(dashRes.user);
      setHeatmapData(dashRes.heatmap || []);
      setLiveCount(dashRes.liveOccupancy || 0);

      const [membersRes, tasksRes, trainersRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact' }).eq('role', 'member'),
        supabase.from('daily_tasks').select('*').order('created_at', { ascending: false }),
        fetch(`${API_URL}/admin/users?role=trainer`, { headers }).then(r => r.json())
      ]);
      const { data: memberList } = await supabase.from('users').select('*, memberships(*)').eq('role', 'member');

      setStats({
        totalMembers: dashRes.adminStats?.totalMembers || 0,
        activeMembers: dashRes.adminStats?.activeMembers || 0,
        totalRevenue: dashRes.adminStats?.totalRevenue || 0,
        occupancy: dashRes.occupancy?.current_count || 0
      });
      setMembers(memberList || []);
      setTasks(tasksRes.data || []);
      setTrainers(Array.isArray(trainersRes) ? trainersRes : []);
      setLoading(false);
    } catch (error) { console.error('Error:', error); setLoading(false); }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
    const { error } = await supabase.from('memberships').update({ status: newStatus }).eq('user_id', userId);
    if (!error) fetchData();
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`"${user.full_name}" silinecek. Emin misiniz?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}`, { method: 'DELETE', headers });
      const d = await res.json();
      if (d.error) alert('Hata: ' + d.error);
      else { alert('Kullanıcı silindi'); fetchData(); }
    } catch (e) { alert('Silme hatası'); }
  };

  const openModal = (type, data = null) => { setModal({ show: true, type, data }); setFormData({}); };
  const closeModal = () => setModal({ show: false, type: '', data: null });

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.type === 'measurement') {
        const { error } = await supabase.from('body_measurements').insert({
          user_id: modal.data.id, weight_kg: parseFloat(formData.weight), body_fat_pct: parseFloat(formData.fat),
          chest_cm: parseFloat(formData.chest) || null, waist_cm: parseFloat(formData.waist) || null,
          arm_cm: parseFloat(formData.arm) || null, leg_cm: parseFloat(formData.leg) || null,
          measured_at: new Date().toISOString().split('T')[0]
        });
        if (error) throw error;
      } else if (modal.type === 'add-days') {
        const res = await fetch(`${API_URL}/admin/add-days`, { method: 'POST', headers, body: JSON.stringify({ user_id: modal.data.id, days: parseInt(formData.days) }) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      } else if (modal.type === 'diet') {
        await fetch(`${API_URL}/admin/assign-diet`, { method: 'POST', headers, body: JSON.stringify({ user_id: modal.data.id, plan_name: formData.plan_name, description: formData.description || '', meals: [] }) });
      } else if (modal.type === 'announcement') {
        await fetch(`${API_URL}/admin/announcements`, { method: 'POST', headers, body: JSON.stringify({ ...formData }) });
      } else if (modal.type === 'task') {
        await fetch(`${API_URL}/admin/tasks`, { method: 'POST', headers, body: JSON.stringify({ ...formData }) });
      } else if (modal.type === 'add-trainer' || modal.type === 'add-member') {
        const role = modal.type === 'add-trainer' ? 'trainer' : 'member';
        const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers, body: JSON.stringify({ ...formData, role }) });
        const d = await res.json(); if (d.error) throw new Error(d.error);
      } else if (modal.type === 'reset-password') {
        const res = await fetch(`${API_URL}/admin/reset-password`, { method: 'POST', headers, body: JSON.stringify({ user_id: modal.data.id, new_password: formData.password }) });
        const d = await res.json(); if (d.error) throw new Error(d.error);
      } else if (modal.type === 'payment') {
        const res = await fetch(`${API_URL}/admin/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: modal.data.id,
            amount: parseFloat(formData.amount),
            payment_method: formData.payment_method || 'cash',
            package_type: formData.package_type || '1_month',
            notes: formData.notes || '',
            total_price: formData.total_price ? parseFloat(formData.total_price) : parseFloat(formData.amount),
            payment_type: formData.payment_type || 'cash_full',
            installment_count: parseInt(formData.installment_count || '1')
          })
        });
        const d = await res.json(); if (d.error) throw new Error(d.error);
      } else if (modal.type === 'change-role') {
        const res = await fetch(`${API_URL}/admin/users/${modal.data.id}/role`, { method: 'PUT', headers, body: JSON.stringify({ role: formData.role }) });
        const d = await res.json(); if (d.error) throw new Error(d.error);
      }
      alert('İşlem Başarılı!'); closeModal(); fetchData();
      if (activeView === 'finance') fetchFinance();
      if (activeView === 'audit') fetchAuditLogs();
    } catch (error) { alert('Hata: ' + error.message); }
  };

  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.innerText = 'Giriş Yapılıyor...';

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        window.location.reload();
      } else {
        setLoginError(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        btn.disabled = false;
        btn.innerText = 'Giriş Yap';
      }
    } catch (err) {
      setLoginError('Sunucu bağlantı hatası.');
      const btn = e.target.querySelector('button');
      btn.disabled = false;
      btn.innerText = 'Giriş Yap';
    }
  };

  // LOGIN
  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <Dumbbell color="#FF3B30" size={48} style={{ marginBottom: '1rem' }} />
            <h2>MATCHLESS</h2>
            <p>Premium Yönetim Paneli Girişi</p>
          </div>
          <form className="modal-form" onSubmit={handleLogin}>
            {loginError && <div style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', padding: '0.8rem', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(255, 59, 48, 0.2)' }}>{loginError}</div>}
            <div className="form-group"><label>E-posta</label><input type="text" name="email" placeholder="admin@matchsport.com" required /></div>
            <div className="form-group"><label>Şifre</label><input type="password" name="password" placeholder="••••••••" required /></div>
            <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !currentUser) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity color="#FF3B30" size={48} /></div>;
  }

  const roleLabel = isSuperAdmin ? 'SuperAdmin' : currentUser?.role === 'admin' ? 'Admin' : 'Eğitmen';

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo"><Dumbbell color="#FF3B30" size={28} /><span>MATCHLESS</span></div>
        <nav className="nav-links">
          <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}><Layout size={20} /> Panel</button>
          <button className={`nav-item ${activeView === 'members' ? 'active' : ''}`} onClick={() => setActiveView('members')}><Users size={20} /> Üyeler</button>
          <button className={`nav-item ${activeView === 'trainers' ? 'active' : ''}`} onClick={() => setActiveView('trainers')}><ShieldCheck size={20} /> Eğitmenler</button>
          <button className={`nav-item ${activeView === 'tasks' ? 'active' : ''}`} onClick={() => setActiveView('tasks')}><CheckSquare size={20} /> Görevler</button>
          <button className={`nav-item ${activeView === 'announcements' ? 'active' : ''}`} onClick={() => setActiveView('announcements')}><Bell size={20} /> Duyurular</button>
          {isAdmin && (<>
            <button className={`nav-item ${activeView === 'finance' ? 'active' : ''}`} onClick={() => setActiveView('finance')}><CreditCard size={20} /> Finansal</button>
            <button className={`nav-item ${activeView === 'audit' ? 'active' : ''}`} onClick={() => setActiveView('audit')}><Activity size={20} /> Aktivite Kayıtları</button>
          </>)}
        </nav>
        <div className="nav-links" style={{ marginTop: 'auto' }}>
          <button className="nav-item" style={{ color: '#FF3B30' }} onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}><LogOut size={20} /> Çıkış Yap</button>
        </div>
      </aside>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <main className="content">
        <header className="content-header">
          <div className="header-left">
            <h1>{activeView === 'dashboard' ? 'Dashboard' : activeView === 'members' ? 'Üye Yönetimi' : activeView === 'trainers' ? 'Eğitmen Yönetimi' : activeView === 'tasks' ? 'Görev Yönetimi' : activeView === 'finance' ? 'Finansal Yönetim' : activeView === 'audit' ? 'Aktivite Kayıtları' : 'Ayarlar'}</h1>
            <p className="subtitle">Hoş geldin, {currentUser?.full_name || 'Yönetici'} ({roleLabel})</p>
          </div>
          <div className="header-actions">
            <div className="live-badge"><div className="live-dot"></div>Salonda: {liveCount} Kişi</div>
          </div>
        </header>

        {/* DASHBOARD */}
        {activeView === 'dashboard' && (<>
          <div className="stats-grid">
            <StatCard icon={<Users color="var(--primary)" />} label="Toplam Üye" value={stats.totalMembers} sub="Kayıtlı sporcular" />
            <StatCard icon={<ShieldCheck color="#34C759" />} label="Aktif Üyeler" value={stats.activeMembers} sub="Üyeliği devam eden" />
            {isAdmin && <StatCard icon={<TrendingUp color="#34C759" />} label="Toplam Gelir" value={`₺${stats.totalRevenue.toLocaleString()}`} sub="Tüm zamanlar" />}
            <StatCard icon={<Activity color="#FF9500" />} label="Anlık Doluluk" value={`${liveCount} Kişi`} sub="Salondaki kişi sayısı" />
          </div>
          <HeatmapComponent data={heatmapData} />
        </>)}

        {/* MEMBERS */}
        {activeView === 'members' && (
          <div className="table-container enterprise-table">
            <div className="section-header">
              <h3>Tüm Üyeler ({members.length})</h3>
              <button className="btn-primary" onClick={() => openModal('add-member')}>+ Yeni Üye Ekle</button>
            </div>
            <table><thead><tr><th>Ad Soyad</th><th>Paket</th><th>Kalan Süre</th><th>Durum</th><th>İşlemler</th></tr></thead>
              <tbody>{members.map(m => (
                <tr key={m.id}>
                  <td><div style={{ fontWeight: 700 }}>{m.full_name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{m.email}</div></td>
                  <td><div style={{ fontWeight: 600 }}>{m.memberships?.[0]?.package_type || 'Standart'}</div></td>
                  <td>{m.memberships?.[0]?.remaining_days || 0} <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>gün</span></td>
                  <td><span className={`badge badge-${m.memberships?.[0]?.status || 'expired'}`}>{m.memberships?.[0]?.status === 'active' ? 'AKTİF' : m.memberships?.[0]?.status === 'frozen' ? 'DONDURULDU' : 'BİTTİ'}</span></td>
                  <td><div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <button className="btn-action" style={{ color: '#FF9F0A' }} onClick={() => handleStatusToggle(m.id, m.memberships?.[0]?.status)}>{m.memberships?.[0]?.status === 'frozen' ? 'Aktif' : 'Dondur'}</button>
                    <button className="btn-action" style={{ color: '#34C759' }} onClick={() => openModal('payment', m)}>💰 Ödeme</button>
                    <button className="btn-action" onClick={() => openModal('add-days', m)}>📅 Gün Ekle</button>
                    <button className="btn-action" onClick={() => openModal('measurement', m)}>📐 Ölçüm</button>
                    <button className="btn-action" onClick={() => openModal('reset-password', m)}><Key size={14} /></button>
                    {isAdmin && <button className="btn-danger" onClick={() => handleDeleteUser(m)}><Trash2 size={14} /></button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* TRAINERS */}
        {activeView === 'trainers' && (
          <div className="table-container enterprise-table">
            <div className="section-header">
              <h3>Eğitmen ve Personel ({trainers.length})</h3>
              {isAdmin && <button className="btn-primary" onClick={() => openModal('add-trainer')}>+ Yeni Eğitmen</button>}
            </div>
            <table><thead><tr><th>Ad Soyad</th><th>E-posta</th><th>Telefon</th><th>Durum</th><th>İşlemler</th></tr></thead>
              <tbody>{trainers.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.full_name}</strong></td><td>{t.email}</td><td>{t.phone || '-'}</td>
                  <td><span className="badge badge-active">AKTİF</span></td>
                  <td><div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn-action" onClick={() => openModal('diet', t)}>Diyet</button>
                    <button className="btn-action" onClick={() => openModal('nutrition-view', t)}>Beslenme</button>
                    {isAdmin && <button className="btn-action" style={{ color: '#007AFF' }} onClick={() => openModal('change-role', t)}>Rol</button>}
                    {isAdmin && <button className="btn-danger" onClick={() => handleDeleteUser(t)}><Trash2 size={14} /></button>}
                  </div></td>
                </tr>
              ))}{trainers.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Henüz eğitmen kaydı yok.</td></tr>}</tbody>
            </table>
          </div>
        )}

        {/* TASKS */}
        {activeView === 'tasks' && (
          <div className="table-container enterprise-table">
            <div className="section-header"><h3>Mobil Görev Havuzu</h3><button className="btn-primary" onClick={() => openModal('task')}>+ Yeni Görev</button></div>
            <table><thead><tr><th>Başlık</th><th>Kategori</th><th>Puan</th><th>Tarih</th></tr></thead>
              <tbody>{tasks.map(t => (
                <tr key={t.id}><td><strong>{t.title}</strong></td><td><span className="badge badge-active">{t.category || 'antrenman'}</span></td><td>{t.points} XP</td><td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{new Date(t.created_at).toLocaleDateString('tr-TR')}</td></tr>
              ))}{tasks.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>Yayında görev yok.</td></tr>}</tbody>
            </table>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {activeView === 'announcements' && (
          <div className="table-container enterprise-table">
            <div className="section-header"><h3>Genel Bildirimler</h3><button className="btn-primary" onClick={() => openModal('announcement')}>+ Yeni Duyuru</button></div>
            <div style={{ padding: '2rem' }}>
              <div style={{ background: 'rgba(52,199,89,0.1)', borderLeft: '4px solid #34C759', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <strong>Sistem Notu:</strong> Duyurular üyelerin mobil uygulamasına bildirim olarak düşer.
              </div>
            </div>
          </div>
        )}

        {/* FINANCE */}
        {activeView === 'finance' && isAdmin && (
          <>
            <div className="finance-grid">
              <div className="finance-card"><div className="fc-label">Bu Ayki Toplam Kazanç</div><div className="fc-value" style={{ color: '#34C759' }}>₺{(financeData?.currentMonth?.total || 0).toLocaleString()}</div><div className="fc-sub">{financeData?.currentMonth?.count || 0} işlem</div></div>
              <div className="finance-card"><div className="fc-label">Ortalama Ödeme</div><div className="fc-value">₺{(financeData?.currentMonth?.avg || 0).toLocaleString()}</div><div className="fc-sub">Bu ay ortalaması</div></div>
              <div className="finance-card"><div className="fc-label">Beklenen Ödemeler</div><div className="fc-value" style={{ color: '#FF9F0A' }}>{(financeData?.pendingPayments || []).length}</div><div className="fc-sub">Süresi dolan / dolacak üyeler</div></div>
            </div>
            {(financeData?.pendingPayments || []).length > 0 && (
              <div className="table-container enterprise-table">
                <div className="section-header"><h3>Beklenen Ödemeler</h3></div>
                <table><thead><tr><th>Üye</th><th>E-posta</th><th>Telefon</th><th>Bitiş Tarihi</th><th>Kalan Gün</th><th>Durum</th></tr></thead>
                  <tbody>{(financeData?.pendingPayments || []).map(p => (
                    <tr key={p.user_id}><td><strong>{p.full_name}</strong></td><td>{p.email}</td><td>{p.phone || '-'}</td>
                      <td>{p.end_date}</td><td>{p.remaining_days}</td>
                      <td><span className={`badge badge-${p.membership_status === 'active' ? 'frozen' : 'expired'}`}>{p.urgency === 'expired' ? 'SÜRESİ DOLMUŞ' : 'DOLMAK ÜZERE'}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* AUDIT LOGS */}
        {activeView === 'audit' && isAdmin && (
          <div className="table-container enterprise-table">
            <div className="section-header"><h3>Sistem Logları</h3><button className="btn-action" onClick={fetchAuditLogs}>🔄 Yenile</button></div>
            <div className="audit-list">
              {auditLogs.map(log => (
                <div key={log.id} className="audit-item">
                  <div className="audit-icon" style={{ background: 'rgba(255,159,10,0.1)', color: '#FF9F0A' }}>
                    {(ACTION_LABELS[log.action] || log.action).charAt(0)}
                  </div>
                  <div className="audit-info">
                    <div className="audit-action">{ACTION_LABELS[log.action] || log.action}</div>
                    <div className="audit-meta">
                      {log.actor ? `${log.actor.full_name} (${log.actor.role})` : 'Sistem'}
                      {log.target ? ` → ${log.target.full_name}` : ''}
                      {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && ` • ${JSON.stringify(log.details).slice(0, 80)}`}
                    </div>
                  </div>
                  <div className="audit-time">{new Date(log.created_at).toLocaleString('tr-TR')}</div>
                </div>
              ))}
              {auditLogs.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Henüz kayıt yok.</div>}
            </div>
          </div>
        )}
      </main>

      {/* MODAL SYSTEM */}
      {modal.show && (
        <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && closeModal()}>
          <div className="modal-content">
            <header className="modal-header">
              <h3>{modal.type === 'measurement' ? 'Ölçüm Ekle' : modal.type === 'add-days' ? 'Üyelik Uzat' : modal.type === 'announcement' ? 'Duyuru Yayınla' : modal.type === 'diet' ? 'Diyet Planı Ata' : modal.type === 'add-trainer' ? 'Yeni Eğitmen' : modal.type === 'add-member' ? 'Yeni Üye Ekle' : modal.type === 'reset-password' ? 'Şifre Sıfırla' : modal.type === 'payment' ? 'Ödeme Kaydet' : modal.type === 'change-role' ? 'Rol Değiştir' : modal.type === 'nutrition-view' ? `${modal.data?.full_name} - Beslenme` : modal.type === 'task' ? 'Görev Ata' : 'İşlem'}</h3>
              <button className="btn-close" onClick={closeModal}>×</button>
            </header>
            <form onSubmit={handleModalSubmit} className="modal-form">
              {modal.type === 'measurement' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label>Kilo (kg)</label><input type="number" step="0.1" required onChange={e => setFormData({ ...formData, weight: e.target.value })} /></div>
                  <div className="form-group"><label>Yağ (%)</label><input type="number" step="0.1" required onChange={e => setFormData({ ...formData, fat: e.target.value })} /></div>
                  <div className="form-group"><label>Göğüs (cm)</label><input type="number" step="0.1" onChange={e => setFormData({ ...formData, chest: e.target.value })} /></div>
                  <div className="form-group"><label>Bel (cm)</label><input type="number" step="0.1" onChange={e => setFormData({ ...formData, waist: e.target.value })} /></div>
                  <div className="form-group"><label>Kol (cm)</label><input type="number" step="0.1" onChange={e => setFormData({ ...formData, arm: e.target.value })} /></div>
                  <div className="form-group"><label>Bacak (cm)</label><input type="number" step="0.1" onChange={e => setFormData({ ...formData, leg: e.target.value })} /></div>
                </div>
              )}
              {modal.type === 'payment' && (<>
                <div className="form-group"><label>Paket Toplam Fiyatı (₺)</label><input type="number" step="0.1" placeholder="Örn: 12000" onChange={e => setFormData({ ...formData, total_price: e.target.value })} /></div>
                <div className="form-group"><label>Bu Ay Ödenen Tutar (₺)</label><input type="number" step="0.1" placeholder="Örn: 4000" required onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label>Ödeme Türü</label><select onChange={e => setFormData({ ...formData, payment_type: e.target.value })} defaultValue="cash_full"><option value="cash_full">Peşin</option><option value="installment">Taksitli</option></select></div>
                  <div className="form-group"><label>Taksit Sayısı</label><input type="number" placeholder="1" onChange={e => setFormData({ ...formData, installment_count: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Paket Süresi</label><select onChange={e => setFormData({ ...formData, package_type: e.target.value })} defaultValue="1_month"><option value="1_month">1 Ay</option><option value="3_months">3 Ay</option><option value="6_months">6 Ay</option><option value="12_months">12 Ay</option></select></div>
                <div className="form-group"><label>Ödeme Yöntemi</label><select onChange={e => setFormData({ ...formData, payment_method: e.target.value })} defaultValue="cash"><option value="cash">Nakit</option><option value="card">Kart</option><option value="bank_transfer">Havale/EFT</option></select></div>
                <div className="form-group"><label>Not</label><input type="text" placeholder="Opsiyonel" onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
              </>)}
              {modal.type === 'diet' && (<>
                <div className="form-group"><label>Diyet Planı Adı</label><input type="text" placeholder="Örn: Bulk Dönemi v1" required onChange={e => setFormData({ ...formData, plan_name: e.target.value })} /></div>
                <div className="form-group"><label>Açıklama</label><textarea placeholder="Detaylar..." onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group"><label>Kalori (kcal)</label><input type="number" placeholder="2500" onChange={e => setFormData({ ...formData, daily_calories: e.target.value })} /></div>
                  <div className="form-group"><label>Protein (g)</label><input type="number" placeholder="180" onChange={e => setFormData({ ...formData, protein_g: e.target.value })} /></div>
                  <div className="form-group"><label>Karb (g)</label><input type="number" placeholder="300" onChange={e => setFormData({ ...formData, carbs_g: e.target.value })} /></div>
                  <div className="form-group"><label>Yağ (g)</label><input type="number" placeholder="70" onChange={e => setFormData({ ...formData, fat_g: e.target.value })} /></div>
                </div>
              </>)}
              {(modal.type === 'add-trainer' || modal.type === 'add-member') && (<>
                <div className="form-group"><label>Tam Adı</label><input type="text" placeholder="Ad Soyad" required onChange={e => setFormData({ ...formData, full_name: e.target.value })} /></div>
                <div className="form-group"><label>E-posta</label><input type="email" placeholder="ornek@email.com" required onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="form-group"><label>Şifre</label><input type="password" placeholder="Şifre" required onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>
                <div className="form-group"><label>Telefon</label><input type="text" placeholder="555..." onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              </>)}
              {modal.type === 'reset-password' && (
                <div className="form-group"><label>Yeni Şifre ({modal.data?.full_name})</label><input type="password" placeholder="Yeni şifre" required onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>
              )}
              {modal.type === 'add-days' && (
                <div className="form-group"><label>Uzatılacak Gün ({modal.data?.full_name})</label><input type="number" placeholder="30" required onChange={e => setFormData({ ...formData, days: e.target.value })} /></div>
              )}
              {modal.type === 'announcement' && (<>
                <div className="form-group"><label>Başlık</label><input type="text" placeholder="Duyuru başlığı" required onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="form-group"><label>İçerik</label><textarea placeholder="Detaylar..." required onChange={e => setFormData({ ...formData, content: e.target.value })} /></div>
              </>)}
              {modal.type === 'change-role' && (
                <div className="form-group"><label>Yeni Rol ({modal.data?.full_name})</label><select required onChange={e => setFormData({ ...formData, role: e.target.value })} defaultValue="">
                  <option value="" disabled>Seçin</option><option value="member">Üye</option><option value="trainer">Eğitmen</option>
                  {isSuperAdmin && <option value="admin">Admin</option>}
                </select></div>
              )}
              {modal.type === 'task' && (<>
                <div className="form-group"><label>Görev Metni</label><input type="text" placeholder="Bugün 15 dk kardiyo!" required onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                <div className="form-group"><label>Ödül (XP)</label><input type="number" defaultValue="10" required onChange={e => setFormData({ ...formData, points: e.target.value })} /></div>
              </>)}
              {modal.type === 'nutrition-view' && <StudentNutritionLogs userId={modal.data.id} />}
              <footer className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Vazgeç</button>
                {modal.type !== 'nutrition-view' && <button type="submit" className="btn-primary">Kaydet</button>}
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentNutritionLogs = ({ userId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/admin/user-nutrition/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => setLogs(d || [])).catch(console.error).finally(() => setLoading(false));
  }, [userId]);
  if (loading) return <div>Yükleniyor...</div>;
  return logs.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem' }}>Kayıt yok.</p> : (
    <table className="mini-table"><thead><tr><th>Besin</th><th>Miktar</th><th>Protein</th><th>Karb</th><th>Yağ</th><th>Kalori</th></tr></thead>
      <tbody>{logs.map(l => <tr key={l.id}><td>{l.food_items?.name}</td><td>{l.quantity_g}g</td><td>{l.protein_g}g</td><td>{l.carbs_g}g</td><td>{l.fat_g}g</td><td>{l.calories} kcal</td></tr>)}</tbody>
    </table>
  );
};

const StatCard = ({ icon, label, value, sub }) => (
  <div className="stat-card">
    <div style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', width: 'fit-content', padding: '0.8rem', borderRadius: '12px' }}>{icon}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{sub}</div>}
  </div>
);

export default App;
