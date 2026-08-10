import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";

export const metadata: Metadata = {
  title: "HH GOA — Official ID Card Generator | Hacker House Goa 2026",
  description:
    "Generate your official Hacker House Goa stamp-style identity card. Fill in your name, team, and role to mint your hacker cred.",
};

export default function Home() {
  return <HomeClient />;
}
