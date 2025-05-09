import type { Metadata } from "next";
import { Baloo_Da_2, Poppins } from "next/font/google";
import "./globals.css";
import "@/app/info/info.css";
import "@/app/api/stats/init";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Adjust weights as needed
});

const baloo = Baloo_Da_2({
  variable: "--font-baloo",
  weight: ["700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shipwrecked",
  description:
    "Shipwrecked is a 130 person, Flagship Hackathon run by Hack Club happening this summer, August 8-11th on Cathleen Stone Island in the Boston harbor.",
  openGraph: {
    title: "Shipwrecked",
    description:
      "Shipwrecked is a 130 person, Flagship Hackathon run by Hack Club happening this summer, August 8-11th on Cathleen Stone Island in the Boston harbor.",
    siteName: "Shipwrecked",
    images: [
      {
        url: 'https://shipwrecked.hackclub.com/launchImgSmaller.webp', 
        alt: 'Shipwrecked Hackathon dates and location', 
      },
    ],
  },
  twitter: {
    card: "summary_large_image", // Use summary_large_image for image previews
    title: "Shipwrecked",
    description:
      "Shipwrecked is a 130 person, Flagship Hackathon run by Hack Club happening this summer, August 8-11th on Cathleen Stone Island in the Boston harbor.",
    images: ['https://shipwrecked.hackclub.com/launchImgSmaller.webp'], // Path to your image
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/mfm5adk.css" />
      </head>
      <body className={`${poppins.variable} ${baloo.variable}`}>
        {children}
        <script defer data-domain="shipwrecked.hackclub.com" src="https://plausible.io/js/script.js"></script>
      </body>
    </html>
  );
}
