"use client";

import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";
import { Badge, Card, Logo, ThemeToggle, useTheme } from "../components/ui";

export default function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="login-wrap" data-current-route="forgot-password">
      <div className="login-brand alt">
        <div>
          <Logo onDark compact />
        </div>
        <div>
          <p className="hero-kicker"><span className="pulse-dot" /> Account recovery</p>
          <h1>Locked out? <em>We&apos;re building this.</em></h1>
          <p className="lede">Self-service password reset is on the roadmap. Contact your workspace admin in the meantime.</p>
        </div>
        <div className="cluster" style={{ gap: 8 }}>
          <Badge tone="blue">SSO / SAML 2.0</Badge>
          <Badge tone="steel">Coming soon</Badge>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-back">
          <Link href="/login" className="button ghost" aria-label="Back to sign in">← Back to sign in</Link>
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
              <h2 style={{ fontSize: 17 }}>Password reset not available yet</h2>
              <p className="subtle" style={{ marginTop: 4 }}>
                Self-service password reset hasn&apos;t shipped on the backend yet.
              </p>
            </div>
            <div className="notice" role="status">
              <div className="cluster" style={{ gap: 6 }}>
                <ShieldAlert size={16} aria-hidden="true" />
                <span>Ask an admin in your organization to send you a fresh invite, or use SSO if it&apos;s enabled for your workspace.</span>
              </div>
            </div>
            <div className="notice blue" style={{ marginTop: 10 }}>
              <div className="cluster" style={{ gap: 6 }}>
                <Mail size={16} aria-hidden="true" />
                <span>Need help? Reach your account owner directly.</span>
              </div>
            </div>
          </Card>
          <p className="auth-switch" style={{ marginTop: 14 }}>
            Remembered it after all? <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
