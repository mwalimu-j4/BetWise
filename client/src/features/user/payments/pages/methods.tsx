import { CreditCard, Landmark, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, paymentMethods } from "../data";

const iconByType = {
  "mobile-money": Smartphone,
  bank: Landmark,
  card: CreditCard,
} as const;

export default function PaymentsMethodsPage() {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-admin-text-primary">Payment Methods</h2>
          <p className="text-sm text-admin-text-muted">Manage deposit and withdrawal channels linked to your account.</p>
        </div>
        <Button className="h-9 rounded-xl bg-admin-accent text-black hover:bg-[#00d492]">Add new method</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {paymentMethods.map((method) => {
          const MethodIcon = iconByType[method.kind];

          return (
            <article key={method.id} className="rounded-2xl border border-admin-border bg-admin-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(0,229,160,0.1)] text-admin-accent">
                    <MethodIcon size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-admin-text-primary">{method.label}</p>
                    <p className="text-xs text-admin-text-muted">{method.account}</p>
                  </div>
                </div>

                {method.isDefault ? (
                  <Badge className="bg-admin-accent text-black">Default</Badge>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-admin-border text-admin-text-secondary">
                  {method.verified ? "Verified" : "Pending verification"}
                </Badge>
                <Badge variant="outline" className="border-admin-border text-admin-text-secondary">
                  Last used: {formatDateTime(method.lastUsed)}
                </Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="h-8 border-admin-border bg-transparent text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
                >
                  Set as default
                </Button>
                <Button
                  variant="outline"
                  className="h-8 border-admin-border bg-transparent text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"
                >
                  Edit
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
