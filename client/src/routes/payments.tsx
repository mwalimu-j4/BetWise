import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

type StkPushResponse = {
  message: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
};

function PaymentsPage() {
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
      toast.error("Enter a valid phone and amount.");
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
      const fallbackMessage = "Could not start M-Pesa payment. Try again.";
      const messageFromApi =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;

      toast.error(messageFromApi ?? fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Deposit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pay with M-Pesa STK Push.
      </p>

      <div className="mt-5 inline-flex items-center gap-3 rounded-lg border bg-secondary/50 px-4 py-3">
        <img
          src="/images/mpesa/logo.png"
          alt="M-Pesa"
          className="h-7 w-auto object-contain"
        />
        <span className="text-sm font-semibold">M-Pesa</span>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-semibold">
          Amount
          <div className="flex w-full overflow-hidden rounded-md border bg-background">
            <span className="flex h-11 items-center border-r bg-muted px-3 text-xs font-semibold text-muted-foreground">
              KSH
            </span>
            <input
              className="h-11 w-full bg-transparent px-3 text-sm outline-none"
              value={amount}
              type="number"
              min={1}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount to deposit"
            />
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="h-11 rounded-none px-6 font-semibold"
            >
              {isSubmitting ? "WAIT..." : "DEPOSIT"}
            </Button>
          </div>
        </label>

        <p className="text-sm text-muted-foreground">
          Minimum KSH 1.00, Maximum KSH 250,000.00
        </p>

        <label className="grid gap-1 text-sm font-medium">
          M-Pesa Phone Number
          <input
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="2547XXXXXXXX"
            autoComplete="tel"
          />
        </label>
      </form>

      {response ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{response.message}</p>
          {response.customerMessage ? (
            <p className="mt-1">{response.customerMessage}</p>
          ) : null}
          {response.checkoutRequestId ? (
            <p className="mt-1 break-all">
              Checkout Request ID: {response.checkoutRequestId}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
