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
    <div className="user-payments-shell animate-lift-in">
      <section className="user-payments-card">
        <div className="user-payments-card__header">
          <div>
            <h1 className="user-page-title">Deposit</h1>
            <p className="user-page-subtitle">
              Pay securely via STK Push.
            </p>
          </div>

          <div className="user-inline-pill">
            <img
              src="/images/mpesa/logo.png"
              alt="M-Pesa"
              className="h-5 w-auto object-contain"
            />
            <span className="user-inline-pill__text">
              M-PESA
            </span>
          </div>
        </div>

        <div className="user-payments-card__body">
          <form className="user-form-grid" onSubmit={handleSubmit}>
            <div className="user-field">
              <label htmlFor="phone" className="user-field__label">
                M-Pesa Phone Number
              </label>
              <div className="user-input-shell">
                <input
                  id="phone"
                  className="user-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="2547XXXXXXXX"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="user-field">
              <div className="user-field__header">
                <label htmlFor="amount" className="user-field__label">
                  Amount
                </label>
                <span className="user-field__hint">
                  Min: 1 | Max: 250,000
                </span>
              </div>
              <div className="user-input-shell user-input-shell--with-prefix">
                <span className="user-input-prefix">
                  KSH
                </span>
                <input
                  id="amount"
                  className="user-input"
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
              className="user-submit-button"
            >
              {isSubmitting ? "Initiating Payment..." : "Deposit Now"}
            </Button>
          </form>

          {response ? (
            <div className="user-response-card">
              <div className="user-response-card__inner">
                <div className="user-response-card__check">
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
                <div className="user-response-card__copy">
                  <p className="user-response-card__title">
                    {response.message}
                  </p>
                  {response.customerMessage ? (
                    <p className="user-response-card__message">
                      {response.customerMessage}
                    </p>
                  ) : null}
                  {response.checkoutRequestId ? (
                    <p className="user-response-card__id">
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
