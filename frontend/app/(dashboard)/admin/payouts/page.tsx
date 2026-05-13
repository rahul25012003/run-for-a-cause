import { cookies } from "next/headers";
import { Badge } from "@/components/shared/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payout {
  id: string;
  gross_amount: string;
  platform_fee: string;
  net_amount: string;
  status: string;
  bank_utr: string | null;
  created_at: string;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchPayouts(): Promise<Payout[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const res = await fetch(`${apiUrl}/payouts/`, {
    headers: token ? { Cookie: `access_token=${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Payout[];
}

export default async function PayoutsPage(): Promise<React.ReactNode> {
  const payouts = await fetchPayouts();
  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <span className="eyebrow">Finance</span>
        <h1 className="mt-3 font-display font-medium text-display-lg text-ink-900">Payouts</h1>
        <p className="mt-2 text-ink-500">
          Net amounts settled to verified NGO bank accounts.
        </p>
      </header>

      <div className="card overflow-hidden">
        {payouts.length === 0 ? (
          <p className="p-8 text-center text-ink-500 text-sm">No payouts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas-subtle border-b border-ink-100">
              <tr>
                <Th>Created</Th>
                <Th>Gross</Th>
                <Th>Fee</Th>
                <Th>Net</Th>
                <Th>UTR</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-50 last:border-0 hover:bg-canvas-subtle/60 transition-colors"
                >
                  <td className="px-5 py-4">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {formatCurrency(p.gross_amount)}
                  </td>
                  <td className="px-5 py-4 font-mono">
                    {formatCurrency(p.platform_fee)}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold">
                    {formatCurrency(p.net_amount)}
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-500 font-mono tabular">
                    {p.bank_utr ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        p.status === "completed" ? "success" : "default"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <th className="text-left px-5 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">
      {children}
    </th>
  );
}
