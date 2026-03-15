import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-card/50 mt-12">
    <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground font-body">
      <p>© eDART Polska 2026 | Wszelkie prawa zastrzeżone</p>
      <div className="flex gap-4">
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Polityka Prywatności</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Regulamin</Link>
      </div>
    </div>
  </footer>
);

export default Footer;
