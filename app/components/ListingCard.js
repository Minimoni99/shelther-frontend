import Link from "next/link";
import { resolveImageUrl } from "@/lib/api";

const TINTS = ["", "tint-b", "tint-c", "tint-d"];

function priceLine(listing) {
  if (listing.type === "rent") return { amount: `₦${Number(listing.annual_rent).toLocaleString()}`, unit: "/ year" };
  if (listing.type === "shortlet") return { amount: `₦${Number(listing.nightly_rate).toLocaleString()}`, unit: "/ night" };
  return { amount: `₦${Number(listing.roommate_share).toLocaleString()}`, unit: "/ month roommate" };
}

export default function ListingCard({ listing, tintIndex = 0 }) {
  const { amount, unit } = priceLine(listing);
  const photo = listing.photos && listing.photos[0];
  const amenities = (listing.amenities || "").split(",").filter(Boolean).slice(0, 2);

  return (
    <Link href={`/listing/${listing.id}`} className="listing-card">
      <div className={`listing-photo ${TINTS[tintIndex % TINTS.length]}`}>
        {photo ? (
          <img src={resolveImageUrl(photo)} alt={listing.title} />
        ) : (
          <svg className="house-illus"><use href="#illus-house" /></svg>
        )}
        {listing.owner?.verified && (
          <span className="verified-badge"><svg className="icon-sm"><use href="#icon-check" /></svg>Verified</span>
        )}
      </div>
      <div className="listing-body">
        <div className="listing-price">{amount} <span>{unit}</span></div>
        <div className="listing-meta">
          {listing.type !== "roommate" && listing.beds ? `${listing.beds} Beds · ` : ""}
          {listing.lga}, {listing.state}
        </div>
        {amenities.length > 0 && (
          <div className="listing-tags">
            {amenities.map((a) => <span key={a} className="tag-sm">{a}</span>)}
            {listing.type === "roommate" && listing.gender_preference && listing.gender_preference !== "any" && (
              <span className="tag-sm">{listing.gender_preference === "female" ? "Female only" : "Male only"}</span>
            )}
          </div>
        )}
        <div className="lister-row">
          <div className="avatar">
            {listing.owner?.profile_photo_url ? (
              <img src={resolveImageUrl(listing.owner.profile_photo_url)} alt="" />
            ) : (
              <svg className="icon"><use href="#icon-user" /></svg>
            )}
          </div>
          <div>
            <div className="lister-name">{listing.owner?.name || "Shelter user"}</div>
            <div className="lister-role">
              {listing.owner?.role === "landlord" || listing.owner?.role === "agent"
                ? `${listing.owner.verified ? "Verified" : "Unverified"} ${listing.owner.role === "landlord" ? "Landlord" : "Agent"}`
                : "Everyday user"}
            </div>
          </div>
          {(listing.owner?.role === "landlord" || listing.owner?.role === "agent") && (
            <span className={`role-tag ${listing.owner.role === "landlord" ? "landlord" : ""}`}>
              {listing.owner.role === "landlord" ? "Landlord" : "Agent"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
