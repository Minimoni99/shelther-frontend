"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, getUser, resolveImageUrl } from "@/lib/api";
import ListingCard from "../../components/ListingCard";

// Maps free-text amenity words (from the comma-separated amenities field)
// to an icon + friendly label. Anything not recognized still renders with
// a generic tag icon rather than being dropped.
const AMENITY_ICONS = {
  pool: ["icon-pool", "Swimming pool"],
  swimming: ["icon-pool", "Swimming pool"],
  parking: ["icon-parking", "Parking space"],
  water: ["icon-water", "Water 24/7"],
  pet: ["icon-paw", "Pets allowed"],
  pets: ["icon-paw", "Pets allowed"],
  furnished: ["icon-sofa", "Furnished"],
  gated: ["icon-shield", "Gated & secured"],
  security: ["icon-shield", "Gated & secured"],
  wifi: ["icon-wifi", "Wi-Fi included"],
  ac: ["icon-ac", "Air conditioning"],
  generator: ["icon-generator", "Backup power"],
  power: ["icon-generator", "Backup power"],
  tv: ["icon-tv", "Smart TV"],
};

function amenityIcon(word) {
  const key = word.toLowerCase().trim();
  for (const k in AMENITY_ICONS) {
    if (key.includes(k)) return AMENITY_ICONS[k];
  }
  return ["icon-check", word];
}

function money(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [myMeeting, setMyMeeting] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [paidTxn, setPaidTxn] = useState(null);

  useEffect(() => {
    api(`/api/listings/${id}`)
      .then((data) => setListing(data.listing))
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!listing || !getToken()) return;
    if (listing.type === "rent" || listing.type === "roommate") {
      api(`/api/listings/${id}/my-meeting-request`)
        .then((data) => setMyMeeting(data.request))
        .catch(() => {});
    }
  }, [listing, id]);

  if (error) return <div className="section"><div className="error">{error}</div></div>;
  if (!listing) return <div className="section">Loading…</div>;

  const photos = listing.photos && listing.photos.length ? listing.photos : [];
  const needsMeetingGate = listing.type === "rent" || listing.type === "roommate";
  const meetingApproved = myMeeting && myMeeting.status === "approved";
  const canPay = !needsMeetingGate || meetingApproved;

  function moveLightbox(dir) {
    setLightboxIndex((i) => (i + dir + photos.length) % photos.length);
  }

  async function handlePay() {
    if (!getToken()) { router.push(`/login?next=/listing/${id}`); return; }
    setPayError("");
    setPaying(true);
    try {
      const data = await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({ listing_id: id, payment_method: "card" }),
      });
      setPaidTxn(data.transaction);
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  }

  function requireLoginThen(action) {
    if (!getToken()) { router.push(`/login?next=/listing/${id}`); return; }
    action();
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="gallery-strip-wrap">
          <div className="gallery-strip">
            {photos.map((url, i) => (
              <div key={url + i} className="photo-card" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                <img src={resolveImageUrl(url)} alt="" />
                {i === 3 && photos.length > 4 && <span className="count-badge">+{photos.length - 4} more</span>}
              </div>
            ))}
          </div>
          <p className="gallery-hint">{photos.length} photo{photos.length !== 1 ? "s" : ""} — scroll to see more, click any to expand</p>
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={(e) => e.target === e.currentTarget && setLightboxOpen(false)}>
          <div className="lightbox-card">
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}><svg className="icon"><use href="#icon-close" /></svg></button>
            <div className="lightbox-img-wrap">
              <img src={resolveImageUrl(photos[lightboxIndex])} alt="" />
              {photos.length > 1 && (
                <>
                  <button className="lightbox-arrow prev" onClick={() => moveLightbox(-1)}><svg className="icon"><use href="#icon-chevron-left" /></svg></button>
                  <button className="lightbox-arrow next" onClick={() => moveLightbox(1)}><svg className="icon"><use href="#icon-chevron-right" /></svg></button>
                  <div className="lightbox-counter">{lightboxIndex + 1} / {photos.length}</div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="lightbox-thumbs">
                {photos.map((url, i) => (
                  <img key={url + i} src={resolveImageUrl(url)} className={i === lightboxIndex ? "active" : ""} onClick={() => setLightboxIndex(i)} alt="" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="detail-wrap">
        <div className="detail-layout">
          <div>
            <h1 className="detail-title">{listing.title}</h1>
            <div className="detail-loc">
              <svg className="icon-sm"><use href="#icon-map-pin" /></svg>{listing.lga}, {listing.state}
              {listing.owner?.verified && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-green)", fontWeight: 700 }}>
                  <svg className="icon-sm"><use href="#icon-check" /></svg>Verified listing
                </span>
              )}
              {listing.type === "roommate" && listing.gender_preference && listing.gender_preference !== "any" && (
                <span className="gender-pill"><svg className="icon-sm"><use href="#icon-user" /></svg>{listing.gender_preference === "female" ? "Female only" : "Male only"}</span>
              )}
            </div>
            {listing.description && <p className="detail-desc">{listing.description}</p>}

            <Features listing={listing} />

            {listing.type === "roommate" && listing.house_rules && (
              <div className="house-rules-box">
                <h4>House rules</h4>
                <p>{listing.house_rules}</p>
              </div>
            )}

            <div className="lister-card">
              <div className="avatar lg">
                {listing.owner?.profile_photo_url ? <img src={resolveImageUrl(listing.owner.profile_photo_url)} alt="" /> : <svg className="icon-lg"><use href="#icon-user" /></svg>}
              </div>
              <div className="info">
                <div className="name-row">
                  <strong>{listing.owner?.name}</strong>
                  {(listing.owner?.role === "landlord" || listing.owner?.role === "agent") && (
                    <span className={`role-tag ${listing.owner.role === "landlord" ? "landlord" : ""}`}>{listing.owner.role === "landlord" ? "Landlord" : "Agent"}</span>
                  )}
                  {listing.owner?.role === "everyday" && <span className="role-tag" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>Everyday user</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky-cta">
            {paidTxn ? (
              <div className="status-banner approved">
                <svg className="icon"><use href="#icon-check" /></svg>
                <div><strong>Payment held</strong><br />{money(paidTxn.amount)} — released once you confirm move-in / check-in.</div>
              </div>
            ) : (
              <PriceAndActions
                listing={listing}
                needsMeetingGate={needsMeetingGate}
                myMeeting={myMeeting}
                canPay={canPay}
                onPay={() => requireLoginThen(handlePay)}
                paying={paying}
                payError={payError}
                onRequestMeeting={() => requireLoginThen(() => setShowMeetingModal(true))}
                onMessage={() => requireLoginThen(() => router.push(`/login?next=/listing/${id}`))}
              />
            )}
          </div>
        </div>
      </div>

      {listing.owner_other_listings && listing.owner_other_listings.length > 0 && (
        <div className="lister-profile-section">
          <div className="lister-profile-head">
            <div className="avatar">
              {listing.owner?.profile_photo_url ? <img src={resolveImageUrl(listing.owner.profile_photo_url)} alt="" /> : <svg className="icon-lg"><use href="#icon-user" /></svg>}
            </div>
            <div>
              <div className="name-row"><h3>{listing.owner?.name}</h3></div>
              <div className="stats">More listings from this {listing.owner?.role === "landlord" ? "landlord" : listing.owner?.role === "agent" ? "agent" : "user"}</div>
            </div>
          </div>
          <div className="card-scroll">
            {listing.owner_other_listings.map((l, i) => <ListingCard key={l.id} listing={l} tintIndex={i} />)}
          </div>
        </div>
      )}

      {showMeetingModal && (
        <MeetingRequestModal
          listingId={id}
          onClose={() => setShowMeetingModal(false)}
          onSent={(req) => { setMyMeeting(req); setShowMeetingModal(false); }}
        />
      )}
    </div>
  );
}

function Features({ listing }) {
  const items = [];
  if (listing.beds) items.push(["icon-bed", `${listing.beds} Bedroom${listing.beds > 1 ? "s" : ""}`, listing.type === "roommate" ? "Private room" : "Sleeping space"]);
  if (listing.baths) items.push(["icon-bath", `${listing.baths} Bathroom${listing.baths > 1 ? "s" : ""}`, "Fully tiled"]);
  if (listing.amenities) {
    listing.amenities.split(",").map((a) => a.trim()).filter(Boolean).forEach((a) => {
      const [icon, label] = amenityIcon(a);
      items.push([icon, label, ""]);
    });
  }
  if (listing.type === "roommate" && listing.available_from) {
    items.push(["icon-calendar", `Available ${new Date(listing.available_from).toLocaleDateString()}`, "Move-in date"]);
  }
  if (items.length === 0) return null;
  return (
    <div className="features-block">
      <h3>Features</h3>
      <div className="features-grid">
        {items.map(([icon, label, sub], i) => (
          <div key={i} className="feature-item">
            <div className="f-icon"><svg className="icon"><use href={`#${icon}`} /></svg></div>
            <div className="f-text"><span className="f-label">{label}</span>{sub && <span className="f-sub">{sub}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceAndActions({ listing, needsMeetingGate, myMeeting, canPay, onPay, paying, payError, onRequestMeeting, onMessage }) {
  return (
    <>
      {listing.type === "rent" && (
        <>
          <div className="price-row"><span>Annual rent</span><span>{money(listing.annual_rent)}</span></div>
          <div className="price-row"><span>Agent fee</span><span>{money(listing.agency_fee)}</span></div>
          <div className="price-row"><span>Legal fee</span><span>{money(listing.legal_fee)}</span></div>
          <div className="price-row total"><span>Total package</span><span>{money((listing.annual_rent || 0) + (listing.agency_fee || 0) + (listing.legal_fee || 0))}</span></div>
        </>
      )}
      {listing.type === "shortlet" && (
        <>
          <div className="price-row"><span>Nightly rate</span><span>{money(listing.nightly_rate)}</span></div>
          <p className="for-note">Final total depends on your selected dates.</p>
        </>
      )}
      {listing.type === "roommate" && (
        <>
          <div className="price-row"><span>Total rent for the place</span><span>{money(listing.total_rent)} / yr</span></div>
          <div className="price-row total"><span>Your monthly share</span><span>{money(listing.roommate_share)}</span></div>
        </>
      )}

      {needsMeetingGate && myMeeting && myMeeting.status === "pending" && (
        <div className="status-banner pending">
          <svg className="icon"><use href="#icon-clock" /></svg>
          <div><strong>Meeting requested</strong><br />Waiting for the lister to respond by {new Date(myMeeting.response_deadline).toLocaleString()}.</div>
        </div>
      )}
      {needsMeetingGate && myMeeting && myMeeting.status === "approved" && (
        <div className="status-banner approved">
          <svg className="icon"><use href="#icon-check" /></svg>
          <div><strong>Meeting confirmed</strong><br />{new Date(myMeeting.meeting_date).toLocaleString()}<br />{myMeeting.meeting_location}</div>
        </div>
      )}
      {needsMeetingGate && myMeeting && myMeeting.status === "declined" && (
        <div className="status-banner declined">
          <svg className="icon"><use href="#icon-clock" /></svg>
          <div><strong>Request declined</strong><br />You can send a new request if you&apos;d still like to view this place.</div>
        </div>
      )}
      {needsMeetingGate && myMeeting && myMeeting.status === "expired" && (
        <div className="status-banner declined">
          <div><strong>Request expired</strong><br />The lister didn&apos;t respond within 48 hours — send a new request.</div>
        </div>
      )}

      {listing.type !== "shortlet" && (
        <div className="escrow-note"><svg className="icon"><use href="#icon-lock" /></svg>Your payment is held safely and only released after you confirm move-in.</div>
      )}
      {listing.type === "shortlet" && (
        <div className="escrow-note"><svg className="icon"><use href="#icon-lock" /></svg>Funds are held and only released after your check-in window closes without a dispute.</div>
      )}

      {payError && <div className="error">{payError}</div>}

      <div className="cta-stack">
        <button className="btn btn-primary btn-block" disabled={!canPay || paying} onClick={onPay}>
          {paying ? "Processing…" : listing.type === "roommate" ? "Pay" : "Pay with protection"}
        </button>
        {!canPay && <p className="disabled-note">Unlocks once your in-person checkout is approved</p>}
        <button className="btn btn-outline btn-block" onClick={onMessage}>
          <svg className="icon-sm"><use href="#icon-message" /></svg>Message {listing.type === "roommate" ? "" : listing.owner?.role === "landlord" ? "landlord" : "agent"}
        </button>
        {needsMeetingGate && (!myMeeting || myMeeting.status === "declined" || myMeeting.status === "expired") && (
          <button className="btn btn-outline btn-block" onClick={onRequestMeeting}>Request meeting or In-person checkout</button>
        )}
      </div>
    </>
  );
}

function MeetingRequestModal({ listingId, onClose, onSent }) {
  const user = getUser();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api(`/api/listings/${listingId}/request-meeting`, {
        method: "POST",
        body: JSON.stringify({ name, phone, description: description || undefined }),
      });
      onSent(data.request);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Request a meeting</h3>
        <p className="lead">The lister has 48 hours to respond with a date and location.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row"><label>Your name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="form-row"><label>Phone number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
          <div className="form-row"><label>What would you like to discuss or see? (optional)</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. I'd like to see the kitchen and confirm the water situation" /></div>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send request"}</button>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}
