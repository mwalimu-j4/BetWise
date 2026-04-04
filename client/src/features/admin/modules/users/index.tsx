import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUsers, toggleUser } from "@/api/users";

export default function UsersModule() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const data = await getUsers({ page, limit, search });
      setUsers(data.data ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [page, limit, search]);

  async function onToggle(userId: number) {
    try {
      await toggleUser(userId);
      toast.success("User status updated");
      await loadData();
    } catch {
      toast.error("Failed to toggle user");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Users Management</h1>

      <input
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        placeholder="Search users"
        className="w-full max-w-sm rounded-lg border border-[#2a3f55] bg-[#1a2634] px-3 py-2 text-white"
      />

      <div className="overflow-x-auto rounded-xl border border-[#2a3f55] bg-[#1e2d3d]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#1a2634] text-left text-[#8fa3b1]">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Total Bets</th>
              <th className="px-4 py-3">Total Staked</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-[#8fa3b1]" colSpan={8}>
                  Loading users...
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-[#2a3f55] text-white">
                  <td className="px-4 py-3">{user.id}</td>
                  <td className="px-4 py-3">{user.username}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{Number(user.balance).toFixed(2)}</td>
                  <td className="px-4 py-3">{user.total_bets}</td>
                  <td className="px-4 py-3">{Number(user.total_staked).toFixed(2)}</td>
                  <td className="px-4 py-3">{user.is_active ? "Active" : "Suspended"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void onToggle(Number(user.id))}
                      className={`rounded px-3 py-1 text-xs font-semibold ${user.is_active ? "bg-[#ff1744] text-white" : "bg-[#00c853] text-[#0f1923]"}`}
                    >
                      {user.is_active ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-[#8fa3b1]">
        <p>Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-[#2a3f55] px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
