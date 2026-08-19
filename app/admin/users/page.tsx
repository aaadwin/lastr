'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface BidangOption {
  id: string;
  nama: string;
}

interface RoleOption {
  id: string;
  nama: string;
}

interface UserItem {
  id: string;
  username: string;
  pengguna?: string | null;
  role_id: string | null;
  bidang_id: string | null;
  role?: {
    nama_role?: string;
  } | null;
  bidang?: {
    nama_bidang?: string;
  } | null;
}

export default function KelolaUsersPage() {
  const router = useRouter();
  const supabase = createClient();

  // State Options & Data Master
  const [listBidang, setListBidang] = useState<BidangOption[]>([]);
  const [listRoles, setListRoles] = useState<RoleOption[]>([]);
  const [listUsers, setListUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // State Modal & Edit Mode
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Form Input
  const [username, setUsername] = useState('');
  const [pengguna, setPengguna] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset Form Input & Close Modal
  const resetForm = () => {
    setEditingId(null);
    setUsername('');
    setPengguna('');
    setSelectedRole('');
    setSelectedBidang('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setIsModalOpen(false);
  };

  // Open Modal for New User
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Fetch Master Roles, Bidang, & Users
  const fetchData = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      // 1. Fetch Master Roles
      const { data: dataRoles, error: errRoles } = await supabase
        .from('role')
        .select('id_role, nama_role');

      if (errRoles) console.warn('Fetch roles error:', errRoles.message);
      if (dataRoles) {
        setListRoles(
          dataRoles.map((r: any) => ({
            id: r.id_role,
            nama: r.nama_role || 'Role Tanpa Nama',
          }))
        );
      }

      // 2. Fetch Master Bidang
      const { data: dataBidang, error: errBidang } = await supabase
        .from('bidang')
        .select('id_bidang, nama_bidang');

      if (errBidang) console.warn('Fetch bidang error:', errBidang.message);
      if (dataBidang) {
        setListBidang(
          dataBidang.map((b: any) => ({
            id: b.id_bidang,
            nama: b.nama_bidang || 'Bidang Tanpa Nama',
          }))
        );
      }

      // 3. Fetch Data Users Join Roles & Bidang
      const { data: dataUsers, error: errUsers } = await supabase
        .from('users')
        .select(`
          id,
          username,
          pengguna,
          password,
          role_id,
          bidang_id,
          role:role_id ( nama_role ),
          bidang:bidang_id ( nama_bidang )
        `)
        .order('username', { ascending: true });

      if (errUsers) throw errUsers;
      setListUsers((dataUsers as any) || []);

    } catch (err: any) {
      console.error('Fetch Data Error:', err);
      setErrorMessage(`Gagal memuat data: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Search Users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return listUsers;
    const q = searchQuery.toLowerCase();

    return listUsers.filter((u) => {
      const uname = u.username?.toLowerCase() || '';
      const peng = u.pengguna?.toLowerCase() || '';
      const role = u.role?.nama_role?.toLowerCase() || '';
      const bidang = u.bidang?.nama_bidang?.toLowerCase() || '';

      return uname.includes(q) || peng.includes(q) || role.includes(q) || bidang.includes(q);
    });
  }, [listUsers, searchQuery]);

  // Set Form saat tombol Edit diklik
  const handleEdit = (user: UserItem) => {
    setEditingId(user.id);
    setUsername(user.username || '');
    setPengguna(user.pengguna || '');
    setSelectedRole(user.role_id || '');
    setSelectedBidang(user.bidang_id || '');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Hapus User
  const handleDelete = async (user: UserItem) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus pengguna "${user.username}"?`
    );

    if (!confirmDelete) return;

    setDeletingId(user.id);
    setErrorMessage('');

    try {
      const { error: deleteErr } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteErr) throw deleteErr;

      await fetchData();
    } catch (err: any) {
      console.error('Delete Error:', err);
      setErrorMessage(`Gagal menghapus user: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Submit Simpan Changes (Insert atau Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Validasi Username & Role Wajib Isi
    if (!username.trim() || !selectedRole) {
      setErrorMessage('Username dan Role wajib diisi!');
      return;
    }

    // 2. Validasi Khusus Operator Bidang
    const selectedRoleData = listRoles.find((r) => r.id === selectedRole);
    const isOperatorBidang = selectedRoleData?.nama.toLowerCase().includes('operator');

    if (isOperatorBidang && !selectedBidang) {
      setErrorMessage('Role "Operator Bidang" wajib memilih Bidang / Unit!');
      return;
    }

    // 3. Validasi Password Baru (Wajib jika User Baru)
    if (!editingId && !password.trim()) {
      setErrorMessage('Password wajib diisi untuk pengguna baru.');
      return;
    }

    // 4. Validasi Konfirmasi Password
    if (password.trim() || confirmPassword.trim()) {
      if (password !== confirmPassword) {
        setErrorMessage('Password dan Konfirmasi Password tidak cocok!');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Kirim data ke API Route
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          username: username.trim(),
          pengguna: pengguna.trim() || null,
          password: password.trim(),
          role_id: selectedRole || null,
          bidang_id: selectedBidang || null,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan data user.');
      }

      resetForm();
      await fetchData();
    } catch (err: any) {
      console.error('Submit Error:', err);
      setErrorMessage(`Gagal menyimpan data user: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Kelola Users, Role & Bidang</h1>
            <p className="text-xs text-gray-500">Manajemen Pengguna Aplikasi & Hak Akses</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="w-full sm:w-auto text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition border border-gray-300 font-medium text-center"
          >
            &larr; Kembali ke Dashboard
          </button>
        </div>

        {/* Global Error Message (Outside Modal) */}
        {errorMessage && !isModalOpen && (
          <div className="bg-red-50 text-red-700 p-3 sm:p-4 rounded-xl text-xs sm:text-sm border border-red-200 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Action & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan username, pengguna, role, atau bidang..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Button Tambah User */}
          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>+</span> Tambah User Baru
          </button>
        </div>

        {/* Tabel Data Users */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm sm:text-md font-bold text-gray-800">
              Daftar Pengguna ({filteredUsers.length})
            </h2>
          </div>

          {loadingData ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">Memuat data pengguna...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-gray-500">
              {searchQuery ? 'Tidak ada user yang cocok dengan pencarian.' : 'Belum ada pengguna terdaftar.'}
            </div>
          ) : (
            <>
              {/* Tampilan Desktop & Tablet (Tabel) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                      <th className="p-3 font-semibold">No</th>
                      <th className="p-3 font-semibold">Username</th>
                      <th className="p-3 font-semibold">Nama Pengguna</th>
                      <th className="p-3 font-semibold">Role</th>
                      <th className="p-3 font-semibold">Bidang / Unit</th>
                      <th className="p-3 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => {
                      const roleName = user.role?.nama_role || 'Tanpa Role';
                      const bidangName = user.bidang?.nama_bidang || 'Tanpa Bidang';

                      return (
                        <tr key={user.id} className="hover:bg-gray-50 text-gray-800">
                          <td className="p-3 font-medium text-gray-500">{index + 1}</td>
                          <td className="p-3 font-semibold text-gray-900">{user.username}</td>
                          <td className="p-3 text-gray-800">
                            {user.pengguna ? (
                              user.pengguna
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {roleName}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">
                            {user.bidang_id ? (
                              bidangName
                            ) : (
                              <span className="text-gray-400 italic">Tanpa Bidang / Admin</span>
                            )}
                          </td>
                          <td className="p-3 text-center space-x-1">
                            <button
                              onClick={() => handleEdit(user)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium px-2.5 py-1 rounded transition border border-amber-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium px-2.5 py-1 rounded transition border border-red-200 disabled:opacity-50"
                            >
                              {deletingId === user.id ? 'Menghapus...' : 'Hapus'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tampilan Mobile (Card View) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredUsers.map((user, index) => {
                  const roleName = user.role?.nama_role || 'Tanpa Role';
                  const bidangName = user.bidang?.nama_bidang || 'Tanpa Bidang';

                  return (
                    <div key={user.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                      <div className="flex justify-between items-start border-b pb-2">
                        <div>
                          <span className="text-[10px] font-semibold text-gray-400 mr-2">#{index + 1}</span>
                          <h3 className="text-sm font-bold text-gray-900 inline-block">
                            {user.username}
                          </h3>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {roleName}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 pt-1 space-y-1">
                        <div>
                          <span className="text-gray-400">Pengguna: </span>
                          <span className="font-semibold text-gray-800">{user.pengguna || <span className="italic font-normal text-gray-400">-</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Bidang: </span>
                          {user.bidang_id ? bidangName : <span className="italic text-gray-400">Tanpa Bidang / Admin</span>}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold py-1.5 rounded transition border border-amber-200 text-center"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold py-1.5 rounded transition border border-red-200 text-center disabled:opacity-50"
                        >
                          {deletingId === user.id ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* POP-UP MODAL FORM INPUT & EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                {editingId ? `Edit User: ${username}` : 'Tambah User Baru'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Error Banner inside Modal */}
              {errorMessage && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <form id="userForm" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username login"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Nama Pengguna */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Pengguna <span className="text-gray-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={pengguna}
                    onChange={(e) => setPengguna(e.target.value)}
                    placeholder="Nama asli / pemilik akun"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Dynamic Dropdown Role */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Pilih Role --</option>
                    {listRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Dropdown Bidang */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Bidang / Unit {
                      listRoles.find((r) => r.id === selectedRole)?.nama.toLowerCase().includes('operator') 
                        ? <span className="text-red-500">* (Wajib untuk Operator)</span> 
                        : <span className="text-gray-400 font-normal">(Opsional)</span>
                    }
                  </label>
                  <select
                    value={selectedBidang}
                    onChange={(e) => setSelectedBidang(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    <option value="">-- Tanpa Bidang / Admin --</option>
                    {listBidang.map((bidang) => (
                      <option key={bidang.id} value={bidang.id}>
                        {bidang.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Password {editingId ? <span className="text-gray-400 font-normal">(Opsional)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingId ? 'Kosongkan jika tak diubah' : 'Masukkan password'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Konfirmasi Password {editingId ? <span className="text-gray-400 font-normal">(Opsional)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={editingId ? 'Ulangi password baru' : 'Ulangi password'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-xs sm:text-sm transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="userForm"
                disabled={submitting}
                className={`${
                  editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold px-6 py-2 rounded-lg text-xs sm:text-sm transition disabled:opacity-50`}
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Perbarui User' : 'Simpan User'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}