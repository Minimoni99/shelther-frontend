"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiUpload, getToken, getUser, setSession, resolveImageUrl } from "@/lib/api";
import { STATES, STATE_LGAS } from "@/lib/nigeria-locations";

const MIN_ROOMMATE_PHOTOS = 10;

export default function ListAPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState("role"); // role | lister-auth | kyc | pending | already-verified | roommate-mini | roommate-listing | roommate-done
  const [role, setRole] = useState(null); // landlord | agent | roommate
  const [error, setError] = useState("");

  function chooseRole(r) {
    setRole(r);
  }

  function continueFromRole() {
    if (!role) return;
    setError("");
    if (role === "roommate") {
      if (!getToken()) {
        router.push("/login?next=/list-a-property");
        return;
      }
      setStep("roommate-mini");
    } else {
      // Landlord/Agent accounts sign up (or sign in) right here — no prior
      // OTP session required, since this is a separate password-based
      // professional account.
      setStep("lister-auth");
    }
  }

  return (
    <section style={{ padding: "50px 24px 90px" }}>
      {step === "role" && (
        <RoleChoice role={role} onChoose={chooseRole} onContinue={continueFromRole} />
      )}
      {step === "lister-auth" && (
        <ListerAuthStep
          role={role}
          onDone={(kycStatus) => setStep(kycStatus === "approved" ? "already-verified" : "kyc")}
          error={error}
          setError={setError}
        />
      )}
      {step === "kyc" && (
        <KycStep onDone={() => setStep("pending")} error={error} setError={setError} />
      )}
      {step === "pending" && <PendingApproval />}
      {step === "already-verified" && <AlreadyVerified />}
      {step === "roommate-mini" && (
        <RoommateMiniProfile
          onDone={() => setStep("roommate-listing")}
          error={error}
          setError={setError}
        />
      )}
      {step === "roommate-listing" && (
        <ShareRoomForm
          onDone={() => setStep("roommate-done")}
          error={error}
          setError={setError}
        />
      )}
      {step === "roommate-done" && <RoommateDone />}
    </section>
  );
}

/* ---------------- Step: role choice ---------------- */
function RoleChoice({ role, onChoose, onContinue }) {
  return (
    <div className="section">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>How would you like to list?</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>This decides what happens next.</p>
      </div>
      <div className="role-cards">
        <div className={`role-card ${role === "landlord" ? "selected" : ""}`} onClick={() => onChoose("landlord")}>
          <div className="icon-wrap"><svg className="icon-lg"><use href="#icon-home" /></svg></div>
          <h3>I&apos;m a Landlord</h3>
          <p>I own the property and want to list it directly.</p>
        </div>
        <div className={`role-card ${role === "agent" ? "selected" : ""}`} onClick={() => onChoose("agent")}>
          <div className="icon-wrap"><svg className="icon-lg"><use href="#icon-badge" /></svg></div>
          <h3>I&apos;m an Agent</h3>
          <p>I manage or market properties on behalf of owners.</p>
        </div>
        <div className={`role-card ${role === "roommate" ? "selected" : ""}`} onClick={() => onChoose("roommate")}>
          <div className="icon-wrap"><svg className="icon-lg"><use href="#icon-user" /></svg></div>
          <h3>I&apos;m looking for a roommate</h3>
          <p>I have a room to share in a place I already live.</p>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button className="btn btn-primary" disabled={!role} onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}

/* ---------------- Step: Landlord/Agent signup or sign-in ---------------- */
function ListerAuthStep({ role, onDone, error, setError }) {
  const [mode, setMode] = useState("register"); // register | login
  const [submitting, setSubmitting] = useState(false);

  // register fields
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const lgaOptions = state ? STATE_LGAS[state] || [] : [];

  async function submitRegister(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api("/api/lister/register", {
        method: "POST",
        body: JSON.stringify({
          role, name, state, lga,
          business_name: role === "agent" ? businessName || undefined : undefined,
          phone, email, password,
        }),
      });
      setSession(data.token, data.user);
      onDone(data.user.kyc_status);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api("/api/lister/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      setSession(data.token, data.user);
      onDone(data.user.kyc_status);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = role === "agent" ? "Agent" : "Landlord";

  return (
    <div className="form-shell">
      <h2>{mode === "register" ? `Create your ${roleLabel} account` : "Sign in"}</h2>
      <p className="lead">
        {mode === "register"
          ? "No documents needed yet — you can verify afterward. You just can't list a property until you do."
          : `Sign in to your ${roleLabel} account.`}
      </p>
      {error && <div className="error">{error}</div>}

      {mode === "register" ? (
        <form onSubmit={submitRegister}>
          <div className="form-row"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="form-row">
            <label>State</label>
            <select value={state} onChange={(e) => { setState(e.target.value); setLga(""); }} required>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Local Government</label>
            <select value={lga} onChange={(e) => setLga(e.target.value)} required disabled={!state}>
              <option value="">Select LGA</option>
              {lgaOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {role === "agent" && (
            <div className="form-row"><label>Business name</label><input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></div>
          )}
          <div className="form-row"><label>Phone number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080X XXX XXXX" required /></div>
          <div className="form-row"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="form-row"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitLogin}>
          <div className="form-row"><label>Email</label><input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required /></div>
          <div className="form-row"><label>Password</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="for-note" style={{ textAlign: "center", marginTop: 14 }}>
        {mode === "register" ? (
          <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode("login"); }}>Sign in</a></>
        ) : (
          <>New here? <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode("register"); }}>Create an account</a></>
        )}
      </p>
    </div>
  );
}

/* ---------------- Step: KYC (photo + documents) ---------------- */
function KycStep({ onDone, error, setError }) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [govId, setGovId] = useState(null);
  const [license, setLicense] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await apiUpload("/api/uploads/image", file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function upload(docType, file, setState) {
    setError("");
    setUploading(true);
    try {
      const { document } = await apiUpload(`/api/lister/upload-document?doc_type=${docType}`, file);
      setState(document);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function finish() {
    if (!photoUrl) {
      setError("A profile photo is required — this is what renters and agents see on your listings.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/me", { method: "PUT", body: JSON.stringify({ profile_photo_url: photoUrl }) });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-shell">
      <h2>Complete your verification</h2>
      <p className="lead">You&apos;re approved for listing once we confirm these.</p>
      {error && <div className="error">{error}</div>}

      <div
        className="photo-upload-circle"
        onClick={() => document.getElementById("kyc-photo-input").click()}
      >
        {photoUrl ? (
          <img src={resolveImageUrl(photoUrl)} alt="" />
        ) : (
          <>
            <svg className="icon"><use href="#icon-camera" /></svg>
            <span>Profile photo</span>
          </>
        )}
      </div>
      <input id="kyc-photo-input" type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />

      <div className="doc-row" style={{ marginTop: 18 }}>
        <div className="icon-wrap"><svg className="icon"><use href="#icon-doc" /></svg></div>
        <div className="info">
          <strong>Government-issued ID</strong>
          <span>{govId ? "Uploaded — awaiting review" : "NIN or international passport"}</span>
        </div>
        {!govId && (
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
            Upload
            <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => e.target.files[0] && upload("government_id", e.target.files[0], setGovId)} />
          </label>
        )}
      </div>

      <div className="doc-row">
        <div className="icon-wrap"><svg className="icon"><use href="#icon-doc" /></svg></div>
        <div className="info">
          <strong>Certificate of Occupancy / Agency license</strong>
          <span>{license ? "Uploaded — awaiting review" : "Proof you're a certified landlord or agent"}</span>
        </div>
        {!license && (
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
            Upload
            <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => e.target.files[0] && upload("agency_license_or_cofo", e.target.files[0], setLicense)} />
          </label>
        )}
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} disabled={!photoUrl || !govId || !license || uploading || submitting} onClick={finish}>
        {submitting ? "Submitting…" : uploading ? "Uploading…" : "Submit for verification"}
      </button>
    </div>
  );
}

/* ---------------- Step: pending approval ---------------- */
function PendingApproval() {
  return (
    <div className="form-shell">
      <div className="pending-state">
        <div className="icon-wrap"><svg className="icon-xl"><use href="#icon-doc" /></svg></div>
        <h2>Your documents are under review</h2>
        <p>This usually takes 1–2 business days. You won&apos;t be able to list a property until you&apos;re approved.</p>
        <Link href="/" className="btn btn-outline">Back to home</Link>
      </div>
    </div>
  );
}

function AlreadyVerified() {
  return (
    <div className="form-shell">
      <div className="pending-state">
        <div className="icon-wrap"><svg className="icon-xl"><use href="#icon-check" /></svg></div>
        <h2>You&apos;re already verified</h2>
        <p>Your account is approved — you can go ahead and list a property.</p>
        <Link href="/" className="btn btn-outline">Back to home</Link>
      </div>
    </div>
  );
}

/* ---------------- Step: roommate mini profile ---------------- */
function RoommateMiniProfile({ onDone, error, setError }) {
  const user = getUser();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await apiUpload("/api/uploads/image", file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name, bio: bio || undefined, profile_photo_url: photoUrl || undefined }),
      });
      const updated = { ...user, name };
      localStorage.setItem("shelther_user", JSON.stringify(updated));
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-shell">
      <div className="step-pill"><span className="done"></span><span></span></div>
      <h2>Your mini profile</h2>
      <p className="lead">Required before you can post a room to share.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-row"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="form-row">
          <label>Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} />
          {photoUrl && <p style={{ fontSize: 12, color: "var(--primary)", marginTop: 4 }}>Photo uploaded</p>}
        </div>
        <div className="form-row"><label>Short bio (optional)</label><textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="3rd year student, quiet, tidy, work from home most days" /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting || uploading}>
          {submitting ? "Saving…" : "Continue to listing"}
        </button>
      </form>
    </div>
  );
}

/* ---------------- Step: share room listing form ---------------- */
function ShareRoomForm({ onDone, error, setError }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [totalRent, setTotalRent] = useState("");
  const [roommateShare, setRoommateShare] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [gender, setGender] = useState("any");
  const [rules, setRules] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lgaOptions = state ? STATE_LGAS[state] || [] : [];

  async function addPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const { url } = await apiUpload("/api/uploads/image", file);
        uploaded.push(url);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (photos.length < MIN_ROOMMATE_PHOTOS) {
      setError(`At least ${MIN_ROOMMATE_PHOTOS} photos are required — you have ${photos.length}.`);
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          type: "roommate",
          title: `Room to share — ${lga}, ${state}`,
          state, lga,
          total_rent: Number(totalRent),
          roommate_share: Number(roommateShare),
          gender_preference: gender,
          house_rules: rules || undefined,
          available_from: availableFrom ? new Date(availableFrom).toISOString() : undefined,
          photo_urls: photos,
        }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = MIN_ROOMMATE_PHOTOS - photos.length;

  return (
    <div className="form-shell" style={{ maxWidth: 560 }}>
      <div className="step-pill"><span className="done"></span><span className="done"></span></div>
      <h2>Share your room</h2>
      <p className="lead">Only available to everyday users — not shown on Landlord or Agent accounts.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-row">
          <label>Photos <span style={{ color: "var(--danger)", fontWeight: 800 }}>*</span> — at least {MIN_ROOMMATE_PHOTOS} high-quality photos required</label>
        </div>
        <div className="photo-grid">
          {photos.map((url) => (
            <div key={url} className="photo-tile filled"><img src={resolveImageUrl(url)} alt="" /></div>
          ))}
          <label className="photo-tile" style={{ cursor: "pointer" }}>
            <svg className="icon"><use href="#icon-camera" /></svg>
            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={addPhotos} disabled={uploading} />
          </label>
        </div>
        <div className={`photo-count ${remaining > 0 ? "short" : ""}`}>
          {remaining > 0 ? `${photos.length} of ${MIN_ROOMMATE_PHOTOS} minimum uploaded — add ${remaining} more` : `${photos.length} photos uploaded`}
          {uploading && " · uploading…"}
        </div>

        <div className="form-row">
          <label>State</label>
          <select value={state} onChange={(e) => { setState(e.target.value); setLga(""); }} required>
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>LGA</label>
          <select value={lga} onChange={(e) => setLga(e.target.value)} required disabled={!state}>
            <option value="">Select LGA</option>
            {lgaOptions.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-row"><label>Total rent for the place</label><input value={totalRent} onChange={(e) => setTotalRent(e.target.value)} placeholder="₦2,400,000 / year" inputMode="numeric" required /></div>
        <div className="form-row"><label>Amount roommate pays</label><input value={roommateShare} onChange={(e) => setRoommateShare(e.target.value)} placeholder="₦120,000 / month" inputMode="numeric" required /></div>
        <div className="form-row"><label>Available from</label><input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} /></div>

        <div className="form-row">
          <label>Preferred roommate gender</label>
          <div className="gender-options">
            {["female", "male", "any"].map((g) => (
              <div key={g} className={`gender-opt ${gender === g ? "selected" : ""}`} onClick={() => setGender(g)}>
                {g === "any" ? "Any gender" : g[0].toUpperCase() + g.slice(1)}
              </div>
            ))}
          </div>
        </div>

        <div className="form-row"><label>House rules / preferences</label><textarea rows={3} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="No smoking, quiet hours after 10pm" /></div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting || uploading}>
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
        <p className="for-note">Listings go live after a quick admin check — usually same day.</p>
      </form>
    </div>
  );
}

/* ---------------- Step: roommate done ---------------- */
function RoommateDone() {
  return (
    <div className="form-shell">
      <div className="pending-state">
        <div className="icon-wrap"><svg className="icon-xl"><use href="#icon-check" /></svg></div>
        <h2>Submitted for review</h2>
        <p>Your room listing is pending a quick admin check — it&apos;ll go live shortly.</p>
        <Link href="/roommate" className="btn btn-outline">Back to Find roommate</Link>
      </div>
    </div>
  );
}
