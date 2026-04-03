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
  const [accountReference, setAccountReference] = useState("BET-DEPOSIT");
  const [description, setDescription] = useState("Betting wallet deposit");
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
          accountReference,
          description,
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
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">M-Pesa Deposit</h1>
      <p className="mt-2 text-zinc-600">
        Initiate an STK Push to top up your betting wallet.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm font-medium">
          Phone Number
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="2547XXXXXXXX"
            autoComplete="tel"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Amount (KES)
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            value={amount}
            type="number"
            min={1}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="100"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Account Reference
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            value={accountReference}
            onChange={(event) => setAccountReference(event.target.value)}
            placeholder="BET-DEPOSIT"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Description
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Betting wallet deposit"
          />
        </label>

        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="mt-2"
        >
          {isSubmitting ? "Sending STK Push..." : "Pay with M-Pesa"}
        </Button>
      </form>

      {response ? (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">{response.message}</p>
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
