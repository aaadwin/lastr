'use client';

import { useEffect, useState } from 'react';
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
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // State Form (Bisa untuk Edit maupun Tambah User Baru)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');
  const [password, setPassword] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setUsername('');
    setSelectedRole('');
    setSelectedBidang('');
    setPassword('');
  };

  // Fetch Master Roles, Bidang, & Users
  const fetchData = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      // 1. Fetch Master Roles (Primary key: id_role)
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

      // 2. Fetch Master Bidang (Primary key: id_bidang)
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

  // Set Form saat tombol Edit diklik
  const handleEdit = (user: UserItem) => {
    setEditingId(user.id);
    setUsername(user.username || '');
    setSelectedRole(user.role_id || '');
    setSelectedBidang(user.bidang_id || '');
    setPassword('');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      // Jika user yang sedang diedit ternyata dihapus, reset form
      if (editingId === user.id) {
        resetForm();
      }

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
    setSubmitting(true);
    setErrorMessage('');

    try {
      if (editingId) {
        // --- PROSES UPDATE / EDIT USER ---
        const payload: Record<string, any> = {
          username: username.trim(),
          role_id: selectedRole || null,
          bidang_id: selectedBidang || null,
          updated_at: new Date().toISOString(),
        };

        if (password.trim()) {
          payload.password = password.trim();
        }

        const { error: updateErr } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingId);

        if (updateErr) throw updateErr;
      } else {
        // --- PROSES INSERT / TAMBAH USER BARU ---
        if (!password.trim()) {
          setErrorMessage('Password wajib diisi untuk pengguna baru.');
          setSubmitting(false);
          return;
        }

        const payload: Record<string, any> = {
          username: username.trim(),
          password: password.trim(),
          role_id: selectedRole || null,
          bidang_id: selectedBidang || null,
          created_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase
          .from('users')
          .insert([payload]);

        if (insertErr) throw insertErr;
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
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Kelola Users, Role & Bidang</h1>
            <p className="text-xs text-gray-500">Manajemen Pengguna Aplikasi & Hak Akses</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition border border-gray-300"
          >
            &larr; Kembali
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-sm border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Form Tambah / Edit User */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-md font-semibold text-gray-800 mb-4 border-b pb-2">
            {editingId ? (
              <>Edit Pengguna: <span className="text-blue-600">{username}</span></>
            ) : (
              'Tambah Pengguna Baru'
            )}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password {editingId && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diganti)</span>}
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingId ? 'Kosongkan jika tidak diganti' : 'Masukkan password'}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                required={!editingId}
              />
            </div>

            {/* Dynamic Dropdown Role */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Bidang / Unit</label>
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
              >
                <option value="">-- Tanpa Bidang / Admin --</option>
                {listBidang.map((bidang) => (
                  <option key={bidang.id} value={bidang.id}>
                    {bidang.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {submitting
                  ? 'Menyimpan...'
                  : editingId
                  ? 'Simpan Perubahan User'
                  : 'Tambah User Baru'}
              </button>
            </div>

          </form>
        </div>

        {/* Tabel Data Users */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-md font-semibold text-gray-800 mb-4">Daftar Pengguna Aplikasi</h2>

          {loadingData ? (
            <p className="text-sm text-gray-500 text-center py-4">Memuat data pengguna...</p>
          ) : listUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Belum ada pengguna terdaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                    <th className="p-2">No</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Bidang / Unit</th>
                    <th className="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listUsers.map((user, index) => {
                    const roleName = user.role?.nama_role || 'Tanpa Role';
                    const bidangName = user.bidang?.nama_bidang || 'Tanpa Bidang';

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-semibold text-gray-900">{user.username}</td>
                        <td className="p-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {roleName}
                          </span>
                        </td>
                        <td className="p-2 text-gray-700">
                          {user.bidang_id ? (
                            bidangName
                          ) : (
                            <span className="text-gray-400 italic">Tanpa Bidang</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(user)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-medium px-2 py-1 rounded transition border border-amber-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-medium px-2 py-1 rounded transition border border-red-200 disabled:opacity-50"
                            >
                              {deletingId === user.id ? 'Menghapus...' : 'Hapus'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}