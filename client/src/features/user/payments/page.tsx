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
    <div className="animate-lift-in max-w-[680px]">
      <section className="rounded-3xl border border-admin-border bg-admin-card p-6 shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col gap-4 border-b border-admin-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-text-primary">
              Deposit
            </h1>
            <p className="mt-1.5 text-sm text-admin-text-muted">
              Pay securely via STK Push.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,229,160,0.22)] bg-admin-accent-dim px-3 py-1.5">
            <img
              src="/images/mpesa/logo.png"
              alt="M-Pesa"
              className="h-5 w-auto object-contain"
            />
            <span className="text-[11px] font-bold tracking-[0.04em] text-admin-accent">
              M-PESA
            </span>
          </div>
        </div>

        <div className="pt-5">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label
                htmlFor="phone"
                className="text-sm font-semibold text-admin-text-primary"
              >
                M-Pesa Phone Number
              </label>
              <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-[rgba(22,29,53,0.6)] transition focus-within:border-[rgba(0,229,160,0.35)] focus-within:shadow-[0_0_0_3px_rgba(0,229,160,0.12)]">
                <input
                  id="phone"
                  className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="2547XXXXXXXX"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <label
                  htmlFor="amount"
                  className="text-sm font-semibold text-admin-text-primary"
                >
                  Amount
                </label>
                <span className="text-xs text-admin-text-muted">
                  Min: 1 | Max: 250,000
                </span>
              </div>
              <div className="flex w-full items-center overflow-hidden rounded-xl border border-admin-border bg-[rgba(22,29,53,0.6)] transition focus-within:border-[rgba(0,229,160,0.35)] focus-within:shadow-[0_0_0_3px_rgba(0,229,160,0.12)]">
                <span className="flex h-11 items-center border-r border-admin-border px-3 text-[11px] font-bold text-admin-text-muted">
                  KSH
                </span>
                <input
                  id="amount"
                  className="h-11 w-full border-0 bg-transparent px-3 text-sm text-admin-text-primary outline-none placeholder:text-admin-text-muted"
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
              className="h-11 rounded-xl bg-admin-accent text-sm font-bold text-black hover:bg-[#00d492]"
            >
              {isSubmitting ? "Initiating Payment..." : "Deposit Now"}
            </Button>
          </form>

          {response ? (
            <div className="mt-4 rounded-2xl border border-[rgba(0,229,160,0.28)] bg-[rgba(0,229,160,0.08)] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-[rgba(0,229,160,0.7)] text-[#05281d]">
                  <svg
                    className="h-4 w-4"
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
                  <p className="text-sm font-semibold text-[#bfffe9]">
                    {response.message}
                  </p>
                  {response.customerMessage ? (
                    <p className="text-sm text-[#94e5ca]">
                      {response.customerMessage}
                    </p>
                  ) : null}
                  {response.checkoutRequestId ? (
                    <p className="mt-1 break-all rounded-lg border border-[rgba(191,255,233,0.2)] bg-[rgba(5,40,29,0.3)] px-2 py-1.5 text-xs text-[#bfffe9]">
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
