import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import Modules from "../components/Modules.jsx";
import Sectors from "../components/Sectors.jsx";
import Pricing from "../components/Pricing.jsx";
import Footer from "../components/Footer.jsx";

export default function Home({ dark, onToggle }) {
  const { hash } = useLocation();

  // Scroll a la sección cuando se llega desde otra página (/#precios)
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <>
      <Navbar dark={dark} onToggle={onToggle} />
      <main>
        <Hero />
        <Modules />
        <Sectors />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
