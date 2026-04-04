type PasswordStrengthIndicatorProps = {
  password: string;
};

type StrengthLevel = "weak" | "medium" | "strong";

function getStrength(password: string): {
  level: StrengthLevel;
  score: number;
  label: string;
} {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { level: "weak", score, label: "Weak" };
  }

  if (score <= 4) {
    return { level: "medium", score, label: "Medium" };
  }

  return { level: "strong", score, label: "Strong" };
}

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const strength = getStrength(password);

  const barTone =
    strength.level === "weak"
      ? "bg-red-500"
      : strength.level === "medium"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const width = `${Math.max((strength.score / 5) * 100, 8)}%`;

  return (
    <div className="mt-2 space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-admin-border">
        <div
          className={`h-full ${barTone} transition-all duration-200`}
          style={{ width }}
        />
      </div>
      <p className="text-xs text-admin-text-muted">
        Password strength:{" "}
        <span className="font-semibold text-admin-text-primary">
          {strength.label}
        </span>
      </p>
    </div>
  );
}
