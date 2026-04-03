import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";

type StkPushResponse = {
  message: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
};

export default function Payments() {
  const [phone, setPhone] = useState("254712345678");
  const [amount, setAmount] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<StkPushResponse | null>(null);

  const isFormValid = useMemo(() => {
    return phone.trim().length >= 10 && Number(amount) >= 1;
  }, [amount, phone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      toast.error("Enter a valid phone number and amount.");
      return;
    }

    setIsSubmitting(true);
    setResponse(null);

    try {
      const { data } = await api.post<StkPushResponse>(
        "/payments/mpesa/stk-push",
        {
          phone,
          amount: Number(amount),
        },
      );

      setResponse(data);
      toast.success(data.customerMessage ?? "STK push sent. Check your phone.");
    } catch (error: unknown) {
      const messageFromApi = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      const fallbackMessage = "Could not start M-Pesa payment. Try again.";

      toast.error(messageFromApi || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-0">
      <section className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-lg transition-all">
        <div className="flex items-center justify-between border-b bg-muted/30 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deposit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay securely via STK Push.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm">
            <img
              src="/images/mpesa/logo.png"
              alt="M-Pesa"
              className="h-5 w-auto object-contain"
            />
            <span className="text-xs font-bold tracking-wide text-emerald-600">
              M-PESA
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-2 text-sm font-medium">
              <label htmlFor="phone" className="text-foreground">
                M-Pesa Phone Number
              </label>
              <div className="flex w-full items-center overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <input
                  id="phone"
                  className="h-11 w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="2547XXXXXXXX"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="grid gap-2 text-sm font-medium">
              <div className="flex items-center justify-between">
                <label htmlFor="amount" className="text-foreground">
                  Amount
                </label>
                <span className="text-xs text-muted-foreground">
                  Min: 1 | Max: 250,000
                </span>
              </div>
              <div className="flex w-full items-center overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <span className="flex h-11 select-none items-center border-r bg-muted/50 px-4 text-xs font-bold text-muted-foreground">
                  KSH
                </span>
                <input
                  id="amount"
                  className="h-11 w-full bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                  value={amount}
                  type="number"
                  min={1}
                  max={250000}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="mt-2 h-12 w-full text-base font-semibold shadow-sm transition-all"
            >
              {isSubmitting ? "Initiating Payment..." : "Deposit Now"}
            </Button>
          </form>

          {response ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 text-sm text-emerald-900 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-200/50 p-1">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="grid gap-1">
                  <p className="font-semibold text-emerald-800">
                    {response.message}
                  </p>
                  {response.customerMessage ? (
                    <p className="text-emerald-700/90">
                      {response.customerMessage}
                    </p>
                  ) : null}
                  {response.checkoutRequestId ? (
                    <p className="mt-2 break-all rounded border border-emerald-200/50 bg-white/60 p-2 text-xs font-mono text-emerald-800">
                      ID: {response.checkoutRequestId}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
