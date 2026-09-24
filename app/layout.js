import "./globals.css";
import IconSprite from "./components/IconSprite";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Shelter — Find a home you can trust, anywhere in Nigeria",
  description: "Verified rentals, short-lets, and roommate listings across Nigeria, with money held safe until you've got the keys.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <IconSprite />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
