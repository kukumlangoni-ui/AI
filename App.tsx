import React, { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  collection, getDocs, getDoc, setDoc, doc, updateDoc,
  addDoc, deleteDoc, serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import {
  ShieldCheck, Users, MessageSquare, RefreshCw, Plus,
  Trash2, Edit2, Check, X, CreditCard, Activity
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../App';

const ADMIN_EMAIL = 'kukumlangoni@gmail.com';

interface StarterTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
}

interface AdminPanelProps {
  onClose: () => void;
  lang: 'sw' | 'en';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, lang }) => {
  // ── Security gate: verify current user is admin before rendering ──────────
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  // This check runs before any state — render nothing if not admin
  // Full verification happens server-side via Firestore rules
  const [verifiedAdmin, setVerifiedAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          const ok = data.role === 'admin' || data.email === ADMIN_EMAIL;
          setVerifiedAdmin(ok);
        } else {
          setVerifiedAdmin(false);
        }
      } catch {
        setVerifiedAdmin(false);
      }
    };
    verify();
  }, [currentUser.uid]);

  if (verifiedAdmin === null) {
    return (
      <div className="admin-panel flex items-center justify-center">
        <div className="text-gold animate-pulse">Verifying access...</div>
      </div>
    );
  }

  if (!verifiedAdmin) {
    return (
      <div className="admin-panel flex items-center justify-center">
        <div className="text-red-400 text-center">
          <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-bold">Access Denied</p>
          <p className="text-sm text-gray-400 mt-2">You do not have admin privileges.</p>
          <button className="mbtn ghost mt-4" onClick={onClose}>Go Back</button>
        </div>
      </div>
    );
  }

  return <AdminPanelContent onClose={onClose} lang={lang} />;
};

// ─── Actual admin content (only rendered after verification) ─────────────────
const AdminPanelContent: React.FC<AdminPanelProps> = ({ onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'payments' | 'topics' | 'credits' | 'settings'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [topics, setTopics] = useState<StarterTopic[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUserForChats, setSelectedUserForChats] = useState<any | null>(null);
  const [userChats, setUserChats] = useState<any[]>([]);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [globalSettings, setGlobalSettings] = useState<any>({
    tokensPerCredit: 1000,
    minBalanceRequired: 0.1,
    freePlanInitialCredits: 20,
    dailyFreeCredits: 20,
    maxGuestMessages: 3,
    whatsappNumber: '255758561747',
    whatsappMessage: 'Habari, nimelipia STEA package.\nName: {name}\nEmail: {email}\nPackage: {package}\nAmount: {amount}\nNinatuma screenshot ya malipo.',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<StarterTopic> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (['users', 'dashboard', 'credits'].includes(activeTab)) {
        try {
          const snap = await getDocs(collection(db, 'users'));
          setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { handleFirestoreError(e, OperationType.GET, 'users'); }
      }

      if (activeTab === 'topics') {
        try {
          const q = query(collection(db, 'starter_topics'), orderBy('order', 'asc'));
          const snap = await getDocs(q);
          setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() } as StarterTopic)));
        } catch (e) { handleFirestoreError(e, OperationType.GET, 'starter_topics'); }
      }

      if (['payments', 'dashboard'].includes(activeTab)) {
        try {
          const snap = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
          setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { handleFirestoreError(e, OperationType.GET, 'payments'); }
      }

      if (['credits', 'dashboard'].includes(activeTab)) {
        try {
          const snap = await getDocs(query(collection(db, 'credit_transactions'), orderBy('createdAt', 'desc')));
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { handleFirestoreError(e, OperationType.GET, 'credit_transactions'); }
      }

      if (activeTab === 'settings') {
        try {
          const snap = await getDoc(doc(db, 'settings', 'global'));
          if (snap.exists()) setGlobalSettings((prev: any) => ({ ...prev, ...snap.data() }));
        } catch (e) { handleFirestoreError(e, OperationType.GET, 'settings/global'); }
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const updateCredits = async (userId: string, amountToAdd: number) => {
    const userDoc = users.find(u => u.id === userId);
    if (!userDoc) return;
    try {
      const newBalance = Math.max(0, (userDoc.creditBalance || 0) + amountToAdd);
      const newPaid = Math.max(0, (userDoc.paidCredits || 0) + (amountToAdd > 0 ? amountToAdd : 0));
      await updateDoc(doc(db, 'users', userId), { creditBalance: newBalance, paidCredits: newPaid });
      await addDoc(collection(db, 'credit_transactions'), {
        userId,
        type: amountToAdd > 0 ? 'admin_adjustment' : 'admin_deduction',
        amount: amountToAdd,
        note: `Admin ${amountToAdd > 0 ? 'added' : 'removed'} ${Math.abs(amountToAdd)} credits`,
        createdAt: serverTimestamp(),
      });
      fetchData();
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `users/${userId}`); }
  };

  const manualCreditPrompt = (userId: string) => {
    const amount = prompt('Enter amount to add/remove (e.g. 50 or -50):');
    if (amount && !isNaN(parseInt(amount))) updateCredits(userId, parseInt(amount));
  };

  const updatePlan = async (userId: string, plan: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { plan, premiumStatus: plan !== 'free' });
      fetchData();
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!confirm('Approve this payment?')) return;
    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'Approved',
        approvedAt: serverTimestamp(),
      });

      const userDoc = users.find(u => u.id === payment.userId);
      let creditsToAdd = 0;
      let newPlan = userDoc?.plan || 'free';
      let premium = userDoc?.premiumStatus || false;

      const pkg = payment.package || '';
      if (pkg.includes('Starter')) { creditsToAdd = 50; }
      else if (pkg.includes('Basic')) { creditsToAdd = 150; }
      else if (pkg.includes('Pro')) { creditsToAdd = 400; newPlan = 'pro'; premium = true; }
      else if (pkg.includes('Max')) { creditsToAdd = 1500; newPlan = 'enterprise'; premium = true; }
      else { creditsToAdd = Math.round(payment.amount / 40); } // fallback

      const newBalance = (userDoc?.creditBalance || 0) + creditsToAdd;
      const newPaid = (userDoc?.paidCredits || 0) + creditsToAdd;

      await updateDoc(doc(db, 'users', payment.userId), {
        creditBalance: newBalance,
        paidCredits: newPaid,
        plan: newPlan,
        premiumStatus: premium,
      });

      await addDoc(collection(db, 'credit_transactions'), {
        userId: payment.userId,
        type: 'payment_approval',
        amount: creditsToAdd,
        note: `Approved payment: ${payment.package} (+${creditsToAdd} credits)`,
        createdAt: serverTimestamp(),
      });

      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `payments/${payment.id}`);
      alert('Error approving payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const note = prompt('Reason for rejection:');
    if (note === null) return;
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'Rejected',
        adminNote: note,
        rejectedAt: serverTimestamp(),
      });
      fetchData();
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `payments/${paymentId}`); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    try {
      const { id, ...updateData } = selectedUserForEdit;
      await updateDoc(doc(db, 'users', id), updateData);
      setSelectedUserForEdit(null);
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${selectedUserForEdit.id}`);
      alert('Failed to update user');
    }
  };

  const fetchUserChats = async (userId: string) => {
    try {
      const q = query(collection(db, 'messages'), where('userId', '==', userId), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      setUserChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { handleFirestoreError(e, OperationType.GET, 'messages'); }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic?.title) return;
    const topicData = {
      title: editingTopic.title,
      description: editingTopic.description || '',
      category: editingTopic.category || 'coding',
      isFeatured: editingTopic.isFeatured || false,
      isActive: editingTopic.isActive !== undefined ? editingTopic.isActive : true,
      order: editingTopic.order || 0,
    };
    try {
      if (editingTopic.id) {
        await updateDoc(doc(db, 'starter_topics', editingTopic.id), topicData);
      } else {
        await addDoc(collection(db, 'starter_topics'), { ...topicData, createdAt: serverTimestamp() });
      }
      setEditingTopic(null);
      fetchData();
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'starter_topics'); }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await deleteDoc(doc(db, 'starter_topics', id));
      fetchData();
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `starter_topics/${id}`); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), globalSettings);
      alert('Settings saved!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global');
      alert('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ─── Computed stats ───────────────────────────────────────────────────────
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.premiumStatus).length;
  const pendingPayments = payments.filter(p => p.status === 'Pending').length;
  const totalRevenue = payments.filter(p => p.status === 'Approved').reduce((s, p) => s + (p.amount || 0), 0);
  const totalCurrentCredits = users.reduce((s, u) => s + (u.creditBalance || 0), 0);
  const totalUsedCredits = users.reduce((s, u) => s + (u.totalCredits || 0), 0);
  const totalChats = users.reduce((s, u) => s + (u.totalChats || 0), 0);

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => {
    const u = users.find(x => x.id === t.userId);
    const matchSearch = !searchTerm ||
      u?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userId?.includes(searchTerm);
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <h3><ShieldCheck size={20} /> STEA Admin</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} title="Refresh" className="iact">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="iact" title="Close Admin">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs flex-wrap">
        {([
          ['dashboard', 'Dashboard', <Activity size={14} />],
          ['users', `Users (${totalUsers})`, <Users size={14} />],
          ['payments', `Payments${pendingPayments > 0 ? ` 🔴${pendingPayments}` : ''}`, <CreditCard size={14} />],
          ['credits', 'Credits', <Activity size={14} />],
          ['topics', 'Topics', <MessageSquare size={14} />],
          ['settings', 'Settings', <ShieldCheck size={14} />],
        ] as any[]).map(([tab, label, icon]) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => { setActiveTab(tab); setSearchTerm(''); setFilterType('all'); }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gold" />
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="stats-grid">
            {[
              { label: 'Total Users', val: totalUsers, color: 'text-white' },
              { label: 'Premium Users', val: premiumUsers, color: 'text-gold' },
              { label: 'Total Chats', val: totalChats, color: 'text-purple-400' },
              { label: 'Pending Payments', val: pendingPayments, color: 'text-red-400' },
              { label: 'Total Revenue (TZS)', val: `${totalRevenue.toLocaleString()}`, color: 'text-green-400' },
              { label: 'Current Credits', val: totalCurrentCredits.toFixed(0), color: 'text-blue-400' },
              { label: 'Used Credits', val: totalUsedCredits.toFixed(0), color: 'text-orange-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="stat-card">
                <label>{label}</label>
                <div className={`val ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* Recent Pending Payments */}
          {pendingPayments > 0 && (
            <div>
              <h4 className="text-gold font-bold mb-3">⚠️ Pending Approvals</h4>
              <div className="space-y-2">
                {payments.filter(p => p.status === 'Pending').slice(0, 5).map(p => {
                  const u = users.find(x => x.id === p.userId);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
                      <div>
                        <div className="font-bold text-sm">{u?.name || p.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">{u?.email || p.email} — {p.package} — {p.amount?.toLocaleString()} TZS</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprovePayment(p)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleRejectPayment(p.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          {selectedUserForEdit && (
            <div className="p-4 bg-gray-900 border border-gold/30 rounded-xl">
              <h4 className="text-gold font-bold mb-3">Edit User: {selectedUserForEdit.email}</h4>
              <form onSubmit={handleUpdateUser} className="admin-form space-y-3">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={selectedUserForEdit.name || ''} onChange={e => setSelectedUserForEdit({ ...selectedUserForEdit, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Plan</label>
                  <select value={selectedUserForEdit.plan || 'free'} onChange={e => setSelectedUserForEdit({ ...selectedUserForEdit, plan: e.target.value })}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={selectedUserForEdit.role || 'user'} onChange={e => setSelectedUserForEdit({ ...selectedUserForEdit, role: e.target.value })}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Account Status</label>
                  <select value={selectedUserForEdit.accountStatus || 'active'} onChange={e => setSelectedUserForEdit({ ...selectedUserForEdit, accountStatus: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="mbtn primary text-sm">Save</button>
                  <button type="button" className="mbtn ghost text-sm" onClick={() => setSelectedUserForEdit(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {selectedUserForChats && (
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm">Chats: {selectedUserForChats.name || selectedUserForChats.email}</h4>
                <button onClick={() => { setSelectedUserForChats(null); setUserChats([]); }} className="text-xs text-gray-400 hover:text-white">✕ Close</button>
              </div>
              {userChats.length === 0 ? (
                <p className="text-gray-500 text-sm">No messages found.</p>
              ) : (
                <div className="space-y-2">
                  {userChats.map(c => (
                    <div key={c.id} className={`text-xs p-2 rounded ${c.role === 'user' ? 'bg-gold/10 text-gold' : 'bg-gray-800 text-gray-300'}`}>
                      <span className="font-bold uppercase">{c.role}: </span>{c.content?.slice(0, 120)}{(c.content?.length || 0) > 120 ? '...' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Credits</th>
                  <th>Used</th>
                  <th>Chats</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="font-medium">{u.name || '—'}</div>
                      <div className="text-xs text-gray-500">{u.role === 'admin' ? '👑 Admin' : 'User'}</div>
                    </td>
                    <td className="text-xs">{u.email}</td>
                    <td>
                      <select
                        value={u.plan || 'free'}
                        onChange={e => updatePlan(u.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="font-mono text-sm font-bold text-blue-400">
                      {(u.creditBalance || 0).toFixed(1)}
                    </td>
                    <td className="font-mono text-sm text-orange-400">
                      {(u.totalCredits || 0).toFixed(1)}
                    </td>
                    <td className="text-center">{u.totalChats || 0}</td>
                    <td className="text-xs text-gray-400">
                      {u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          className="text-xs px-2 py-1 bg-gold/10 text-gold border border-gold/20 rounded hover:bg-gold/20"
                          onClick={() => manualCreditPrompt(u.id)}
                        >
                          + Credits
                        </button>
                        <button
                          className="text-xs px-2 py-1 bg-gray-800 text-white border border-gray-700 rounded hover:bg-gray-700"
                          onClick={() => setSelectedUserForEdit(u)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="text-xs px-2 py-1 bg-gray-800 text-blue-400 border border-gray-700 rounded hover:bg-gray-700"
                          onClick={() => { setSelectedUserForChats(u); fetchUserChats(u.id); }}
                        >
                          💬
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {!loading && activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const u = users.find(x => x.id === p.userId);
                  return (
                    <tr key={p.id}>
                      <td className="text-xs">{p.createdAt?.toDate ? new Date(p.createdAt.toDate()).toLocaleString() : '—'}</td>
                      <td>
                        <div className="font-medium">{u?.name || p.name || '—'}</div>
                        <div className="text-xs text-gray-400">{u?.email || p.email}</div>
                      </td>
                      <td>{p.package}</td>
                      <td className="font-mono font-bold text-gold">{p.amount?.toLocaleString()} TZS</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          p.status === 'Approved' ? 'bg-green-900 text-green-300' :
                          p.status === 'Rejected' ? 'bg-red-900 text-red-300' :
                          'bg-yellow-900 text-yellow-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprovePayment(p)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">✓ Approve</button>
                            <button onClick={() => handleRejectPayment(p.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">✗ Reject</button>
                          </div>
                        )}
                        {p.status !== 'Pending' && (
                          <span className="text-xs text-gray-500">{p.adminNote || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREDITS ── */}
      {!loading && activeTab === 'credits' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search user..."
              className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="daily_reset">Daily Reset</option>
              <option value="deduction">Chat Usage</option>
              <option value="payment_approval">Payment Approval</option>
              <option value="admin_adjustment">Admin Added</option>
              <option value="admin_deduction">Admin Removed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Note</th></tr>
              </thead>
              <tbody>
                {filteredTransactions.map(t => {
                  const u = users.find(x => x.id === t.userId);
                  return (
                    <tr key={t.id}>
                      <td className="text-xs">{t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleString() : '—'}</td>
                      <td>
                        <div className="font-medium">{u?.name || '—'}</div>
                        <div className="text-xs text-gray-400">{u?.email || t.userId?.slice(0, 8) + '...'}</div>
                      </td>
                      <td><span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-300 uppercase">{t.type}</span></td>
                      <td className={`font-bold font-mono ${(t.amount || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(t.amount || 0) > 0 ? '+' : ''}{(t.amount || 0).toFixed(2)}
                      </td>
                      <td className="text-xs text-gray-400">{t.note || '—'}</td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TOPICS ── */}
      {!loading && activeTab === 'topics' && (
        <div className="space-y-4">
          {editingTopic ? (
            <div className="p-4 bg-gray-900 border border-gold/30 rounded-xl">
              <h4 className="text-gold font-bold mb-3">{editingTopic.id ? 'Edit Topic' : 'New Topic'}</h4>
              <form onSubmit={handleSaveTopic} className="admin-form space-y-3">
                <div className="form-group"><label>Title *</label>
                  <input type="text" value={editingTopic.title || ''} onChange={e => setEditingTopic({ ...editingTopic, title: e.target.value })} required />
                </div>
                <div className="form-group"><label>Description</label>
                  <input type="text" value={editingTopic.description || ''} onChange={e => setEditingTopic({ ...editingTopic, description: e.target.value })} />
                </div>
                <div className="form-group"><label>Category</label>
                  <input type="text" value={editingTopic.category || ''} onChange={e => setEditingTopic({ ...editingTopic, category: e.target.value })} placeholder="coding, AI, cybersecurity..." />
                </div>
                <div className="form-group"><label>Order</label>
                  <input type="number" value={editingTopic.order || 0} onChange={e => setEditingTopic({ ...editingTopic, order: parseInt(e.target.value) })} />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editingTopic.isFeatured || false} onChange={e => setEditingTopic({ ...editingTopic, isFeatured: e.target.checked })} />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editingTopic.isActive !== false} onChange={e => setEditingTopic({ ...editingTopic, isActive: e.target.checked })} />
                    Active
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="mbtn primary text-sm">Save</button>
                  <button type="button" className="mbtn ghost text-sm" onClick={() => setEditingTopic(null)}>Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <button className="mbtn primary text-sm flex items-center gap-2" onClick={() => setEditingTopic({ isActive: true, isFeatured: false })}>
              <Plus size={16} /> Add Topic
            </button>
          )}

          <div className="space-y-2">
            {topics.map(t => (
              <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border ${t.isActive ? 'bg-gray-900 border-gray-700' : 'bg-gray-950 border-gray-800 opacity-60'}`}>
                <div>
                  <div className="font-medium text-sm">{t.title} {t.isFeatured && <span className="text-gold text-xs">⭐</span>}</div>
                  <div className="text-xs text-gray-400">{t.category} · Order: {t.order}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingTopic(t)} className="icon-btn-small text-gray-400 hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeleteTopic(t.id)} className="icon-btn-small text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {topics.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No topics yet. Add one above.</p>}
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {!loading && activeTab === 'settings' && globalSettings && (
        <form onSubmit={handleSaveSettings} className="admin-form space-y-4 max-w-lg">
          <h4 className="text-gold font-bold">Global App Settings</h4>

          {[
            { label: 'Tokens Per Credit', key: 'tokensPerCredit', type: 'number' },
            { label: 'Min Balance Required', key: 'minBalanceRequired', type: 'number' },
            { label: 'Free Plan Initial Credits', key: 'freePlanInitialCredits', type: 'number' },
            { label: 'Daily Free Credits', key: 'dailyFreeCredits', type: 'number' },
            { label: 'Max Guest Messages', key: 'maxGuestMessages', type: 'number' },
            { label: 'WhatsApp Number (with country code)', key: 'whatsappNumber', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <input
                type={type}
                value={globalSettings[key] || ''}
                onChange={e => setGlobalSettings({ ...globalSettings, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
              />
            </div>
          ))}

          <div className="form-group">
            <label>WhatsApp Message Template</label>
            <textarea
              rows={4}
              value={globalSettings.whatsappMessage || ''}
              onChange={e => setGlobalSettings({ ...globalSettings, whatsappMessage: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-gold resize-y"
            />
            <span className="text-xs text-gray-500">Variables: {'{name}'} {'{email}'} {'{package}'} {'{amount}'}</span>
          </div>

          <div className="form-group">
            <label>System Prompt (Swahili)</label>
            <textarea
              rows={6}
              value={globalSettings.systemPromptSw || ''}
              onChange={e => setGlobalSettings({ ...globalSettings, systemPromptSw: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-gold resize-y font-mono text-xs"
            />
          </div>

          <div className="form-group">
            <label>System Prompt (English)</label>
            <textarea
              rows={6}
              value={globalSettings.systemPromptEn || ''}
              onChange={e => setGlobalSettings({ ...globalSettings, systemPromptEn: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-gold resize-y font-mono text-xs"
            />
          </div>

          <button type="submit" className="mbtn primary" disabled={isSavingSettings}>
            {isSavingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
};
