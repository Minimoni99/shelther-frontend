"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setSession } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState("identifier"); // identifier | code
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [dummyCode, setDummyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      setDummyCode(data.dummy_code || "");
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ identifier, code, name: name || undefined }),
      });
      setSession(data.token, data.user);
      router.push(params.get("next") || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: "60px 24px" }}>
      <div className="form-shell">
        {step === "identifier" ? (
          <>
            <h2>Sign in</h2>
            <p className="lead">Enter your phone number or email — we'll send a one-time code.</p>
            {error && <div className="error">{error}</div>}
            <form onSubmit={requestOtp}>
              <div className="form-row">
                <label>Phone or email</label>
                <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="080X XXX XXXX or you@email.com" required />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Enter your code</h2>
            <p className="lead">We sent a code to {identifier}.</p>
            {dummyCode && (
              <div className="success">
                Test mode — SMS isn&apos;t wired up yet, so your code is: <strong>{dummyCode}</strong>
              </div>
            )}
            {error && <div className="error">{error}</div>}
            <form onSubmit={verifyOtp}>
              <div className="form-row">
                <label>Code</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
              </div>
              <div className="form-row">
                <label>Your name (if this is your first time)</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adaeze Okonkwo" />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Sign in"}
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep("identifier")} style={{ marginTop: 8 }}>
                Use a different phone/email
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
