import { useState, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/axiosConfig";

interface ContactFormData {
  fullName: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

const validateForm = (
  formData: ContactFormData,
  isLoggedIn: boolean,
): FormErrors => {
  const errors: FormErrors = {};

  if (!isLoggedIn) {
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (formData.fullName.length > 100) {
      errors.fullName = "Full name must not exceed 100 characters";
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 7) {
      errors.phone = "Phone number must be at least 7 characters";
    }
    if (formData.phone.length > 20) {
      errors.phone = "Phone number must not exceed 20 characters";
    }
  }

  if (!formData.subject.trim() || formData.subject.trim().length < 3) {
    errors.subject = "Subject must be at least 3 characters";
  }
  if (formData.subject.length > 100) {
    errors.subject = "Subject must not exceed 100 characters";
  }

  if (!formData.message.trim() || formData.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters";
  }
  if (formData.message.length > 2000) {
    errors.message = "Message must not exceed 2000 characters";
  }

  return errors;
};

interface ContactFormProps {
  userFullName?: string;
  userPhone?: string;
  isLoggedIn?: boolean;
  onSuccess?: () => void;
}

export default function ContactForm({
  userFullName,
  userPhone,
  isLoggedIn = false,
  onSuccess,
}: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: userFullName || "",
    phone: userPhone || "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Sync form data with user info when it changes (e.g. login/logout)
  useEffect(() => {
    if (isLoggedIn) {
      setFormData((prev) => ({
        ...prev,
        fullName: userFullName || prev.fullName,
        phone: userPhone || prev.phone,
      }));
    }
  }, [isLoggedIn, userFullName, userPhone]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateForm(formData, isLoggedIn);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // If there are errors but they are not visible (because fields are hidden),
      // we should still show a generic error toast to inform the user.
      toast.error("Please fix the errors in the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/contact", formData);

      toast.success("Your message has been sent successfully!");
      setFormData({
        fullName: userFullName || "",
        phone: userPhone || "",
        subject: "",
        message: "",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to send your message. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#294157] bg-[linear-gradient(135deg,#111d2e_0%,#0f1a2a_100%)] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1.5">
          Send us a Message
        </h2>

      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLoggedIn && (
          <>
            {/* Full Name Input */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-[#8a9bb0] uppercase mb-1.5"
              >
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                maxLength={100}
                className={`w-full px-4 py-2.5 rounded-lg border bg-[#0b1120] text-sm text-white outline-none transition ${
                  errors.fullName
                    ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(255,59,48,0.1)]"
                    : "border-[#294157] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.1)]"
                } placeholder:text-[#5a6b7d]`}
                disabled={isSubmitting}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
              )}
            </div>

            {/* Phone Input */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-[#8a9bb0] uppercase mb-1.5"
              >
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., +254700000000 or 0700000000"
                maxLength={20}
                className={`w-full px-4 py-2.5 rounded-lg border bg-[#0b1120] text-sm text-white outline-none transition ${
                  errors.phone
                    ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(255,59,48,0.1)]"
                    : "border-[#294157] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.1)]"
                } placeholder:text-[#5a6b7d]`}
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
              )}
            </div>
          </>
        )}

        {/* Subject Input */}
        <div>
          <label
            htmlFor="subject"
            className="block text-xs font-semibold text-[#8a9bb0] uppercase mb-1.5"
          >
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="What is this about?"
            maxLength={100}
            className={`w-full px-4 py-2.5 rounded-lg border bg-[#0b1120] text-sm text-white outline-none transition ${
              errors.subject
                ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(255,59,48,0.1)]"
                : "border-[#294157] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.1)]"
            } placeholder:text-[#5a6b7d]`}
            disabled={isSubmitting}
          />
          {errors.subject && (
            <p className="mt-1 text-xs text-red-400">{errors.subject}</p>
          )}
          <p className="mt-1 text-xs text-[#5a6b7d]">
            {formData.subject.length}/100 characters
          </p>
        </div>

        {/* Message Textarea */}
        <div>
          <label
            htmlFor="message"
            className="block text-xs font-semibold text-[#8a9bb0] uppercase mb-1.5"
          >
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us what's on your mind..."
            maxLength={2000}
            rows={4}
            className={`w-full px-4 py-2.5 rounded-lg border bg-[#0b1120] text-sm text-white outline-none transition resize-none ${
              errors.message
                ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(255,59,48,0.1)]"
                : "border-[#294157] focus:border-[#f5c518] focus:shadow-[0_0_0_2px_rgba(245,197,24,0.1)]"
            } placeholder:text-[#5a6b7d]`}
            disabled={isSubmitting}
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-400">{errors.message}</p>
          )}
          <p className="mt-1 text-[10px] text-right text-[#5a6b7d]">
            {formData.message.length}/2000 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f5c518] px-6 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 relative overflow-hidden"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending Message...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send Message</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
