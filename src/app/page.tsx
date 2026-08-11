import type { Metadata } from "next";
import HomeClient from "./components/HomeClient";

export const metadata: Metadata = {
  title: "HH Goa 2K26",
  description:
    "id generator",
};

export default function Home() {
  return <HomeClient />;
}
