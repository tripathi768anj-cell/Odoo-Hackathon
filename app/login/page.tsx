"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, Logo, ThemeToggle, useTheme } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api-client";

function LoginContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("alice@acme.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 429) {
          setError("Too many attempts. Wait a few minutes and try again.");
        } else {
          setError(e.message || "Invalid email or password.");
        }
      } else {
        setError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrap" data-current-route="signin">
      <div className="login-brand">
        <div>
          <Logo onDark compact />
        </div>
        <div>
          <p className="hero-kicker"><span className="pulse-dot" /> Quote-to-cash in one workspace</p>
          <h1>Welcome back. <em>Pick up where the deal left off.</em></h1>
          <p className="lede">Sign in to see your pipeline, approvals queue, and fulfillment status.</p>
          <div className="login-proof">
            <div><b>SOC2</b><span>Type II</span></div>
            <div><b>SSO</b><span>SAML 2.0</span></div>
            <div><b>Live</b><span>ERP sync</span></div>
          </div>
        </div>
        <div className="cluster" style={{ gap: 8 }}>
          <Badge tone="blue">SOC2 Type II</Badge>
          <Badge tone="green">SSO / SAML 2.0</Badge>
          <Badge tone="steel">Live ERP Sync</Badge>
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
              <h2 style={{ fontSize: 17 }}>Sign in to DealFlow 360</h2>
              <p className="subtle" style={{ marginTop: 4 }}>Enter your workspace credentials</p>
            </div>
            <form className="grid" onSubmit={onSubmit}>
              <label>
                Work Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <div className="cluster" style={{ justifyContent: "space-between" }}>
                <label className="check-row">
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <Link href="/forgot-password" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 12.5 }}>
                  Forgot password?
                </Link>
              </div>
              {error ? (
                <div className="notice red" role="alert">
                  <span>{error}</span>
                </div>
              ) : null}
              <Button tone="primary" type="submit" testId="login-submit" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign In to Workspace"} <ArrowRight size={15} aria-hidden="true" />
              </Button>
              <div className="notice blue">
                <div className="cluster" style={{ gap: 6 }}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Enterprise SSO & SAML 2.0 Enabled</span>
                </div>
                <Badge tone="blue">SOC2 Type II</Badge>
              </div>
            </form>
          </Card>
          <p className="auth-switch" style={{ marginTop: 14 }}>
            New to DealFlow 360? <Link href="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
