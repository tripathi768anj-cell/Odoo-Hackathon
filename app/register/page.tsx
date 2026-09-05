"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, Logo, ThemeToggle, useTheme } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api-client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function RegisterContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { bootstrap } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const finalSlug = slug || slugify(organizationName);
    if (!/^[a-z0-9-]{2,64}$/.test(finalSlug)) {
      setError("Workspace URL must be 2-64 lowercase letters, numbers, or hyphens.");
      return;
    }

    setSubmitting(true);
    try {
      await bootstrap({ organizationName, slug: finalSlug, adminName, adminEmail, password });
      router.push("/dashboard");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === "CONFLICT") {
          setError("That workspace URL is already taken. Try a different one.");
        } else if (e.status === 403) {
          setError(
            "This deployment already has a workspace and doesn't support self-serve signup after initial setup. Ask an existing admin to invite you by email, or sign in if you already have an account.",
          );
        } else {
          setError(e.message || "Could not create the workspace.");
        }
      } else {
        setError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap" data-current-route="register">
      <div className="login-brand alt">
        <div>
          <Logo onDark compact />
        </div>
        <div>
          <p className="hero-kicker"><span className="pulse-dot" /> Get started in minutes</p>
          <h1>Provision a workspace <em>that sells the way you do.</em></h1>
          <p className="lede">Bring your catalog, set discount guardrails, and send your first governed quote today.</p>
          <div className="login-steps">
            <div><span className="step-num">1</span><span><strong style={{ color: "#fff" }}>Create your account.</strong> One form, no credit card required.</span></div>
            <div><span className="step-num">2</span><span><strong style={{ color: "#fff" }}>Set your guardrails.</strong> Discount and approval policies come next.</span></div>
            <div><span className="step-num">3</span><span><strong style={{ color: "#fff" }}>Send your first quote.</strong> Add customers and products, then quote.</span></div>
          </div>
        </div>
        <div className="cluster" style={{ gap: 8 }}>
          <Badge tone="blue">Free workspace</Badge>
          <Badge tone="green">No credit card</Badge>
          <Badge tone="steel">Cancel anytime</Badge>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-back">
          <Link href="/" className="button ghost" aria-label="Back to homepage">← Back to site</Link>
        </div>
        <div className="login-top-bar">
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
        <div className="login-card">
          <Card>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div className="cluster" style={{ justifyContent: "center", marginBottom: 10 }}>
                <Logo />
              </div>
              <h2 style={{ fontSize: 17 }}>Create your workspace</h2>
              <p className="subtle" style={{ marginTop: 4 }}>You&apos;ll be the first admin of this organization</p>
            </div>
            <form className="grid" onSubmit={onSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label>
                  Your Full Name
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} required autoComplete="name" />
                </label>
                <label>
                  Company Name
                  <input
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      if (!slugTouched) setSlug(slugify(e.target.value));
                    }}
                    required
                    autoComplete="organization"
                  />
                </label>
              </div>
              <label>
                Workspace URL
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="acme-corp"
                  pattern="[a-z0-9-]{2,64}"
                  required
                />
              </label>
              <label>
                Work Email
                <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} type="email" required autoComplete="email" />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                />
              </label>
              <label className="check-row">
                <input type="checkbox" required /> I agree to the Terms and Data Processing Addendum
              </label>
              {error ? (
                <div className="notice red" role="alert">
                  <span>{error}</span>
                </div>
              ) : null}
              <Button tone="primary" type="submit" testId="register-submit" disabled={submitting}>
                {submitting ? "Provisioning…" : "Create Workspace"} <ArrowRight size={15} aria-hidden="true" />
              </Button>
              <div className="notice green">
                <div className="cluster" style={{ gap: 6 }}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>You&apos;ll be signed in immediately as the workspace admin</span>
                </div>
              </div>
            </form>
          </Card>
          <p className="auth-switch" style={{ marginTop: 14 }}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterContent />
    </AuthProvider>
  );
}
