"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { STATES, STATE_LGAS } from "@/lib/nigeria-locations";
import ListingCard from "./ListingCard";

const COPY = {
  rent: {
    heading: "Find a home you can trust, anywhere in Nigeria",
    sub: "Verified listings, real people, and your money held safe until you've got the keys.",
    priceLabel: "Max annual rent",
    pricePlaceholder: "₦2,500,000/yr",
  },
  shortlet: {
    heading: "Book a stay you can trust, anywhere in Nigeria",
    sub: "Verified short-lets with money held safe until you check in.",
    priceLabel: "Max nightly rate",
    pricePlaceholder: "₦45,000/night",
  },
  roommate: {
    heading: "Find a roommate you can actually trust",
    sub: "Verified everyday people sharing real rooms — never a Landlord or Agent listing.",
    priceLabel: "Max monthly share",
    pricePlaceholder: "₦150,000/mo",
  },
};

export default function HomeTemplate({ type }) {
  const copy = COPY[type];
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [listings, setListings] = useState(null);
  const [error, setError] = useState("");

  const lgaOptions = useMemo(() => (state ? STATE_LGAS[state] || [] : []), [state]);

  async function runSearch(e) {
    if (e) e.preventDefault();
    setError("");
    try {
      const params = new URLSearchParams({ type });
      if (state) params.set("state", state);
      if (lga) params.set("lga", lga);
      if (maxPrice) params.set("max_price", maxPrice);
      if (minBeds) params.set("min_beds", minBeds);
      const data = await api(`/api/listings?${params.toString()}`);
      setListings(data.listings);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <>
      <section className="hero">
        <h1>{copy.heading}</h1>
        <p>{copy.sub}</p>
        <form className="search-card" onSubmit={runSearch}>
          <div className="field">
            <label>State</label>
            <select value={state} onChange={(e) => { setState(e.target.value); setLga(""); }}>
              <option value="">Any state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>LGA</label>
            <select value={lga} onChange={(e) => setLga(e.target.value)} disabled={!state}>
              <option value="">Any LGA</option>
              {lgaOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {type !== "roommate" && (
            <div className="field">
              <label>Min beds</label>
              <select value={minBeds} onChange={(e) => setMinBeds(e.target.value)}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>{copy.priceLabel}</label>
            <input placeholder={copy.pricePlaceholder} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="numeric" />
          </div>
          <button className="btn btn-primary" type="submit">
            <svg className="icon-sm"><use href="#icon-search" /></svg>Search
          </button>
        </form>
      </section>

      <div className="section">
        {error && <div className="error">{error}</div>}
        <div className="section-head">
          <h2>{listings ? `${listings.length} listing${listings.length === 1 ? "" : "s"} found` : "Loading…"}</h2>
        </div>
        {listings && listings.length === 0 && (
          <p style={{ color: "var(--ink-soft)" }}>No listings match yet — try widening your search, or check back soon as new listings go live.</p>
        )}
        <div className="card-grid">
          {(listings || []).map((l, i) => (
            <ListingCard key={l.id} listing={l} tintIndex={i} />
          ))}
        </div>
      </div>
    </>
  );
}
