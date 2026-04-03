import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronRight,
  Crown,
  DollarSign,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  Wallet
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SectionKey = "overview" | "users" | "markets" | "finance" | "settings";
type Status = "active" | "pending" | "inactive";

type User = {
  id: string;
  name: string;
  email: string;
  status: Status;
  wager: string;
  joinedAt: string;
};

type Market = {
  id: string;
  event: string;
  sport: string;
  status: Status;
  odds: string;
  liquidity: string;
};

type FinanceRow = {
  id: string;
  user: string;
  type: "Deposit" | "Withdrawal" | "Refund";
  amount: string;
  channel: string;
  status: Status;
  at: string;
};

const sections: Array<{
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "users", label: "Users", icon: Users },
  { key: "markets", label: "Markets", icon: BarChart3 },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "settings", label: "Settings", icon: Settings },
];

const initialUsers: User[] = [
  {
    id: "USR-1001",
    name: "Amina Njoroge",
    email: "amina@betwise.com",
    status: "active",
    wager: "KES 124,000",
    joinedAt: "2024-01-12",
  },
  {
    id: "USR-1002",
    name: "Brian Otieno",
    email: "brian@betwise.com",
    status: "pending",
    wager: "KES 18,200",
    joinedAt: "2024-02-02",
  },
  {
    id: "USR-1003",
    name: "Caren Wambui",
    email: "caren@betwise.com",
    status: "inactive",
    wager: "KES 6,100",
    joinedAt: "2023-12-20",
  },
  {
    id: "USR-1004",
    name: "Daniel Kiptoo",
    email: "daniel@betwise.com",
    status: "active",
    wager: "KES 310,600",
    joinedAt: "2024-01-29",
  },
];

const initialMarkets: Market[] = [
  {
    id: "MKT-2001",
    event: "Arsenal vs Chelsea",
    sport: "Football",
    status: "active",
    odds: "2.05",
    liquidity: "KES 3.2M",
  },
  {
    id: "MKT-2002",
    event: "Lakers vs Heat",
    sport: "Basketball",
    status: "active",
    odds: "1.72",
    liquidity: "KES 2.6M",
  },
  {
    id: "MKT-2003",
    event: "India vs Australia",
    sport: "Cricket",
    status: "pending",
    odds: "3.20",
    liquidity: "KES 980K",
  },
  {
    id: "MKT-2004",
    event: "Gor Mahia vs AFC Leopards",
    sport: "Football",
    status: "inactive",
    odds: "1.96",
    liquidity: "KES 420K",
  },
];

const financeRows: FinanceRow[] = [
  {
    id: "TX-9001",
    user: "Amina Njoroge",
    type: "Deposit",
    amount: "KES 4,500",
    channel: "STK Push",
    status: "active",
    at: "10:31",
  },
  {
    id: "TX-9002",
    user: "Brian Otieno",
    type: "Withdrawal",
    amount: "KES 3,000",
    channel: "B2C",
    status: "pending",
    at: "10:42",
  },
  {
    id: "TX-9003",
    user: "Caren Wambui",
    type: "Refund",
    amount: "KES 2,250",
    channel: "Reversal",
    status: "inactive",
    at: "10:48",
  },
];

const statusStyles: Record<Status, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

function StatusBadge({ value }: { value: Status }) {
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <Badge className={cn("border px-2.5 py-1", statusStyles[value])}>
      {label}
    </Badge>
  );
}

function MiniProgress({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-zinc-100">
      <div
        className="h-2 rounded-full bg-lime-400"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function SectionIconCard({
  title,
  value,
  icon: Icon,
  chip,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
  tone: "lime" | "amber" | "rose";
}) {
  const gradients = {
    lime: "from-lime-400/25 to-lime-500/10 border-lime-300/30",
    amber: "from-amber-400/25 to-orange-500/10 border-amber-300/30",
    rose: "from-rose-400/25 to-rose-700/10 border-rose-300/30",
  };

  return (
    <Card
      className={cn("border bg-linear-to-br backdrop-blur", gradients[tone])}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="grid h-10 w-10 place-content-center rounded-full bg-black/40 text-lime-200">
            <Icon className="h-4 w-4" />
          </span>
          <span className="rounded-full border border-lime-300/40 bg-lime-400/20 px-2 py-0.5 text-xs font-semibold text-lime-200">
            {chip}
          </span>
        </div>
        <p className="mt-5 text-sm text-zinc-300">{title}</p>
        <p className="font-['Space_Grotesk'] text-4xl font-semibold text-white">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ProfitDial() {
  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-0">
        <div>
          <CardTitle className="text-2xl">Top 5 Sport Categories</CardTitle>
          <CardDescription className="text-zinc-400">
            Live revenue split by category
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="h-4 w-4 rotate-90" />
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mx-auto flex aspect-square max-w-sm items-center justify-center rounded-full bg-[conic-gradient(#d9f216_0deg_145deg,#f59e0b_145deg_245deg,#ef4444_245deg_320deg,#4f46e5_320deg_360deg)] p-8">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 text-center">
            <div>
              <p className="font-['Space_Grotesk'] text-4xl font-bold">
                $3,223.55
              </p>
              <p className="text-sm text-zinc-300">Total profit</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [marketDialogOpen, setMarketDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    status: "active" as Status,
  });
  const [marketForm, setMarketForm] = useState({
    event: "",
    sport: "",
    odds: "",
    status: "active" as Status,
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(true);
  const [oddsGuard, setOddsGuard] = useState(true);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [
        user.id,
        user.name,
        user.email,
        user.status,
        user.wager,
        user.joinedAt,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchQuery, users]);

  const filteredMarkets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return markets;
    return markets.filter((market) =>
      [
        market.id,
        market.event,
        market.sport,
        market.status,
        market.odds,
        market.liquidity,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [searchQuery, markets]);

  const handleUserSave = () => {
    if (!userForm.name || !userForm.email) {
      toast.error("Name and email are required");
      return;
    }

    if (editingUser) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUser.id ? { ...user, ...userForm } : user,
        ),
      );
      toast.success("User updated");
    } else {
      setUsers((current) => [
        ...current,
        {
          id: `USR-${Date.now()}`,
          ...userForm,
          wager: "KES 0",
          joinedAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      toast.success("User created");
    }

    setUserDialogOpen(false);
    setEditingUser(null);
    setUserForm({ name: "", email: "", status: "active" });
  };

  const handleMarketSave = () => {
    if (!marketForm.event || !marketForm.sport || !marketForm.odds) {
      toast.error("Event, sport, and odds are required");
      return;
    }

    if (editingMarket) {
      setMarkets((current) =>
        current.map((market) =>
          market.id === editingMarket.id
            ? { ...market, ...marketForm }
            : market,
        ),
      );
      toast.success("Market updated");
    } else {
      setMarkets((current) => [
        ...current,
        {
          id: `MKT-${Date.now()}`,
          ...marketForm,
          liquidity: "KES 0",
        },
      ]);
      toast.success("Market created");
    }

    setMarketDialogOpen(false);
    setEditingMarket(null);
    setMarketForm({ event: "", sport: "", odds: "", status: "active" });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(217,242,22,0.16),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#eceee4,#dfe2d5_35%,#f8faf7)] p-3 sm:p-5">
      <div className="mx-auto max-w-[1600px] rounded-[32px] border border-black/10 bg-[linear-gradient(135deg,rgba(10,12,10,0.98),rgba(13,15,12,0.96))] text-white shadow-[0_40px_120px_rgba(0,0,0,0.4)]">
        <div className="grid min-h-[calc(100vh-2rem)] lg:grid-cols-[72px_minmax(0,1fr)_320px]">
          <aside className="hidden border-r border-white/10 bg-black/25 p-3 lg:flex lg:flex-col lg:items-center lg:gap-3">
            <div className="mb-2 mt-2 grid h-11 w-11 place-content-center rounded-full border border-lime-300/30 bg-lime-300/15 text-lime-200">
              <Crown className="h-5 w-5" />
            </div>
            {sections.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={cn(
                  "grid h-10 w-10 place-content-center rounded-xl border transition",
                  activeSection === key
                    ? "border-lime-300/40 bg-lime-300/15 text-lime-200"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </aside>

          <section className="min-w-0 border-r border-white/10">
            <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-lime-200">
                    <Shield className="h-3.5 w-3.5" />
                    Sportsbook Control Center
                  </p>
                  <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-semibold tracking-tight sm:text-5xl">
                    Dashboard
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-300 sm:text-base">
                    Client-side admin dashboard with reusable shadcn components,
                    responsive tabs, editable tables, and working dialogs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-emerald-200/30 bg-emerald-400/15 text-emerald-100">
                    Live feed synced
                  </Badge>
                  <Badge className="border-amber-200/30 bg-amber-400/15 text-amber-100">
                    12 Pending Reviews
                  </Badge>
                  <Badge className="border-white/20 bg-white/10 text-white">
                    API v1.12.4
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-11 w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-zinc-300 sm:max-w-md">
                  <Search className="h-4 w-4" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users, markets, transactions"
                    className="h-auto border-0 bg-transparent p-0 text-white shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    className="gap-2 bg-lime-400 text-black hover:bg-lime-300"
                    onClick={() => {
                      setActiveSection("users");
                      setEditingUser(null);
                      setUserForm({ name: "", email: "", status: "active" });
                      setUserDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    New Record
                  </Button>
                </div>
              </div>
            </header>

            <div className="space-y-6 p-4 sm:p-6">
              <Tabs
                value={activeSection}
                onValueChange={(value) => setActiveSection(value as SectionKey)}
              >
                <TabsList className="mb-6 flex w-full flex-wrap justify-start gap-2 rounded-none border-b border-white/10 bg-transparent p-0">
                  {sections.map(({ key, label }) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-full border border-transparent px-4 py-2 text-zinc-400 data-[state=active]:border-lime-300/40 data-[state=active]:bg-lime-300/15 data-[state=active]:text-lime-100"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent
                  value="overview"
                  className="space-y-6 outline-none"
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SectionIconCard
                      title="Total Income"
                      value="$3,433.0"
                      chip="+4.5%"
                      tone="lime"
                      icon={DollarSign}
                    />
                    <SectionIconCard
                      title="Total Payers"
                      value="11,443"
                      chip="+2.8%"
                      tone="amber"
                      icon={Users}
                    />
                    <SectionIconCard
                      title="Total Time"
                      value="11,443"
                      chip="-1.8%"
                      tone="rose"
                      icon={Activity}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <ProfitDial />

                    <div className="space-y-6">
                      <Card className="border-white/10 bg-white/5 text-white">
                        <CardHeader>
                          <CardTitle className="text-2xl">
                            Total Wagered
                          </CardTitle>
                          <CardDescription className="text-zinc-400">
                            Activity across all live markets
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                            <div className="flex items-center justify-between text-sm text-zinc-300">
                              <span>Percentage of Total Bets</span>
                              <strong className="text-white">34%</strong>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                            <div className="flex items-center justify-between text-sm text-zinc-300">
                              <span>Event Count</span>
                              <strong className="text-white">35</strong>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/5 text-white">
                        <CardHeader>
                          <CardTitle className="text-2xl">
                            Best Players
                          </CardTitle>
                          <CardDescription className="text-zinc-400">
                            Top active users this week
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap items-center gap-2">
                            {users.slice(0, 4).map((user) => (
                              <div
                                key={user.id}
                                className="grid h-10 w-10 place-content-center rounded-full border border-white/15 bg-zinc-800 text-xs"
                              >
                                {user.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")}
                              </div>
                            ))}
                            <span className="text-sm text-zinc-400">+145</span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                              <p className="text-xs text-zinc-400">Users</p>
                              <p className="font-['Space_Grotesk'] text-2xl text-white">
                                67
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                              <p className="text-xs text-zinc-400">Funds</p>
                              <p className="font-['Space_Grotesk'] text-2xl text-white">
                                $22.4k
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-white/10 bg-white/5 text-white">
                        <CardHeader>
                          <CardTitle className="text-2xl">
                            Week Activity
                          </CardTitle>
                          <CardDescription className="text-zinc-400">
                            Revenue and movement by day
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {["Mon", "Tue", "Wed", "Thu", "Fri"].map(
                            (day, index) => (
                              <div key={day}>
                                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                                  <span>{day}</span>
                                  <span>{[24, 32, 48, 37, 41][index]}%</span>
                                </div>
                                <MiniProgress
                                  value={[24, 32, 48, 37, 41][index]}
                                />
                              </div>
                            ),
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          Top 5 Leagues
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                          League distribution and betting strength
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { name: "NFL", progress: 38 },
                          { name: "NHL", progress: 78 },
                          { name: "NBA", progress: 63 },
                          { name: "EPL", progress: 82 },
                        ].map((league) => (
                          <div key={league.name}>
                            <div className="mb-1 flex items-center justify-between text-sm text-zinc-300">
                              <span>{league.name}</span>
                              <span>{league.progress}%</span>
                            </div>
                            <MiniProgress value={league.progress} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          Funds Activity
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                          Tracked movement and live balances
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                          <div className="relative h-44 overflow-hidden rounded-xl bg-zinc-950/60">
                            <div className="absolute inset-x-4 top-10 h-1 rounded-full bg-lime-400/70" />
                            <div className="absolute inset-x-4 top-16 h-1 rounded-full bg-amber-400/70" />
                            <div className="absolute inset-x-4 top-22 h-1 rounded-full bg-lime-300/70" />
                            <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-3 text-sm text-zinc-300">
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <p className="text-xs text-zinc-400">Active</p>
                                <p className="font-['Space_Grotesk'] text-2xl text-white">
                                  $1,443
                                </p>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <p className="text-xs text-zinc-400">Playing</p>
                                <p className="font-['Space_Grotesk'] text-2xl text-white">
                                  $440
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4 outline-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-white">
                        Users
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Manage accounts, wallet activity, and statuses.
                      </p>
                    </div>
                    <Button
                      className="gap-2 self-start bg-lime-400 text-black hover:bg-lime-300"
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ name: "", email: "", status: "active" });
                        setUserDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add User
                    </Button>
                  </div>

                  <Card className="border-white/10 bg-white/5 text-white">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-zinc-300">
                              User
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Email
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Status
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Wager
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Joined
                            </TableHead>
                            <TableHead className="text-right text-zinc-300">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow
                              key={user.id}
                              className="border-white/10 hover:bg-white/5"
                            >
                              <TableCell className="font-medium text-white">
                                {user.name}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                <StatusBadge value={user.status} />
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {user.wager}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {user.joinedAt}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserForm({
                                      name: user.name,
                                      email: user.email,
                                      status: user.status,
                                    });
                                    setUserDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={() => {
                                    setUsers((current) =>
                                      current.filter(
                                        (item) => item.id !== user.id,
                                      ),
                                    );
                                    toast.success("User deleted");
                                  }}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="markets" className="space-y-4 outline-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-white">
                        Markets
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Create and manage betting markets.
                      </p>
                    </div>
                    <Button
                      className="gap-2 self-start bg-lime-400 text-black hover:bg-lime-300"
                      onClick={() => {
                        setEditingMarket(null);
                        setMarketForm({
                          event: "",
                          sport: "",
                          odds: "",
                          status: "active",
                        });
                        setMarketDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Market
                    </Button>
                  </div>

                  <Card className="border-white/10 bg-white/5 text-white">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-zinc-300">
                              Event
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Sport
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Status
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Odds
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Liquidity
                            </TableHead>
                            <TableHead className="text-right text-zinc-300">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMarkets.map((market) => (
                            <TableRow
                              key={market.id}
                              className="border-white/10 hover:bg-white/5"
                            >
                              <TableCell className="font-medium text-white">
                                {market.event}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {market.sport}
                              </TableCell>
                              <TableCell>
                                <StatusBadge value={market.status} />
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {market.odds}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {market.liquidity}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={() => {
                                    setEditingMarket(market);
                                    setMarketForm({
                                      event: market.event,
                                      sport: market.sport,
                                      odds: market.odds,
                                      status: market.status,
                                    });
                                    setMarketDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  onClick={() => {
                                    setMarkets((current) =>
                                      current.filter(
                                        (item) => item.id !== market.id,
                                      ),
                                    );
                                    toast.success("Market deleted");
                                  }}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 outline-none">
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-white">
                      Finance
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Monitor deposits, withdrawals, and refunds.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">
                          Gross Gaming Revenue
                        </p>
                        <p className="mt-1 font-['Space_Grotesk'] text-2xl font-semibold">
                          KES 18.4M
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Net Revenue</p>
                        <p className="mt-1 font-['Space_Grotesk'] text-2xl font-semibold">
                          KES 12.9M
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">Refund Ratio</p>
                        <p className="mt-1 font-['Space_Grotesk'] text-2xl font-semibold">
                          1.9%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardContent className="p-4">
                        <p className="text-sm text-zinc-400">
                          M-Pesa Success Rate
                        </p>
                        <p className="mt-1 font-['Space_Grotesk'] text-2xl font-semibold">
                          97.8%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-white/10 bg-white/5 text-white">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-zinc-300">Ref</TableHead>
                            <TableHead className="text-zinc-300">
                              User
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Type
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Amount
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Channel
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Status
                            </TableHead>
                            <TableHead className="text-zinc-300">
                              Time
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financeRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className="border-white/10 hover:bg-white/5"
                            >
                              <TableCell className="text-white">
                                {row.id}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {row.user}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {row.type}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {row.amount}
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {row.channel}
                              </TableCell>
                              <TableCell>
                                <StatusBadge value={row.status} />
                              </TableCell>
                              <TableCell className="text-zinc-300">
                                {row.at}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="settings"
                  className="space-y-4 outline-none"
                >
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-white">
                      Settings
                    </h2>
                    <p className="text-sm text-zinc-400">
                      System toggles and access controls.
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardHeader>
                        <CardTitle>System Toggles</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Operational switches for platform safety
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            label: "Maintenance Mode",
                            desc: "Temporarily pause betting access",
                            active: maintenanceMode,
                            setActive: setMaintenanceMode,
                          },
                          {
                            label: "Mandatory Admin MFA",
                            desc: "Force 2FA for privileged accounts",
                            active: mfaRequired,
                            setActive: setMfaRequired,
                          },
                          {
                            label: "Odds Drift Guard",
                            desc: "Block odds outside safe range",
                            active: oddsGuard,
                            setActive: setOddsGuard,
                          },
                        ].map((toggle) => (
                          <div
                            key={toggle.label}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {toggle.label}
                              </p>
                              <p className="text-sm text-zinc-400">
                                {toggle.desc}
                              </p>
                            </div>
                            <Button
                              variant={toggle.active ? "default" : "outline"}
                              className={cn(
                                toggle.active
                                  ? "bg-lime-400 text-black hover:bg-lime-300"
                                  : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                              )}
                              onClick={() => {
                                toggle.setActive(!toggle.active);
                                toast.success(`${toggle.label} updated`);
                              }}
                            >
                              {toggle.active ? "On" : "Off"}
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5 text-white">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription className="text-zinc-400">
                          Frequently used administrative actions
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button
                          className="w-full justify-start gap-2 bg-lime-400 text-black hover:bg-lime-300"
                          onClick={() => toast.success("Security policy saved")}
                        >
                          Save Security Policy
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => toast.success("System export queued")}
                        >
                          Export Audit Logs
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => toast.success("API keys rotated")}
                        >
                          Rotate API Keys
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          <aside className="space-y-4 p-4 sm:p-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-content-center rounded-full border border-lime-300/30 bg-lime-300/10 text-lime-200">
                    JW
                  </div>
                  <div>
                    <p className="font-['Space_Grotesk'] text-2xl font-semibold text-white">
                      John Williams
                    </p>
                    <p className="text-xs text-zinc-400">
                      Last activity: 6 Dec, 2025
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="grid grid-cols-2 gap-3 border-white/10 bg-white/5 p-4 text-white">
              <div className="rounded-2xl border border-lime-300/30 bg-lime-300/10 p-3">
                <p className="text-sm text-zinc-300">Earned</p>
                <p className="font-['Space_Grotesk'] text-3xl font-semibold text-white">
                  $3,433.0
                </p>
              </div>
              <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-3">
                <p className="text-sm text-zinc-300">Lost</p>
                <p className="font-['Space_Grotesk'] text-3xl font-semibold text-white">
                  $11,443
                </p>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Funds Activity</CardTitle>
                <CardDescription className="text-zinc-400">
                  Day-by-day revenue curve
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Sat", value: 42 },
                  { label: "Mon", value: 68 },
                  { label: "Tue", value: 74 },
                  { label: "Wed", value: 58 },
                  { label: "Fri", value: 81 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <MiniProgress value={item.value} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription className="text-zinc-400">
                  Recent income and payouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {financeRows.slice(0, 3).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {row.type}
                      </p>
                      <p className="text-xs text-zinc-400">{row.user}</p>
                    </div>
                    <p className="font-semibold text-lime-300">{row.amount}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              Update user details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={userForm.name}
              onChange={(e) =>
                setUserForm((current) => ({ ...current, name: e.target.value }))
              }
              placeholder="Name"
            />
            <Input
              value={userForm.email}
              onChange={(e) =>
                setUserForm((current) => ({
                  ...current,
                  email: e.target.value,
                }))
              }
              placeholder="Email"
            />
            <Select
              value={userForm.status}
              onValueChange={(value) =>
                setUserForm((current) => ({
                  ...current,
                  status: value as Status,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUserSave}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={marketDialogOpen} onOpenChange={setMarketDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMarket ? "Edit Market" : "Add Market"}
            </DialogTitle>
            <DialogDescription>
              Update event details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={marketForm.event}
              onChange={(e) =>
                setMarketForm((current) => ({
                  ...current,
                  event: e.target.value,
                }))
              }
              placeholder="Event"
            />
            <Input
              value={marketForm.sport}
              onChange={(e) =>
                setMarketForm((current) => ({
                  ...current,
                  sport: e.target.value,
                }))
              }
              placeholder="Sport"
            />
            <Input
              value={marketForm.odds}
              onChange={(e) =>
                setMarketForm((current) => ({
                  ...current,
                  odds: e.target.value,
                }))
              }
              placeholder="Odds"
            />
            <Select
              value={marketForm.status}
              onValueChange={(value) =>
                setMarketForm((current) => ({
                  ...current,
                  status: value as Status,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarketDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMarketSave}>
              {editingMarket ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
