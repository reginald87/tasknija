import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, ArrowUp } from 'lucide-react';

function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Col 1: Brand Info */}
          <div className="footer-col brand-col">
            <Logo size={28} variant="dark" />
            <p className="footer-desc">
              Nigeria's leading service directory. Connecting trusted, verified local service professionals with customers in their communities.
            </p>
            <div className="social-links">
              <a href="#" className="social-btn" aria-label="Facebook"><Facebook size={16} /></a>
              <a href="#" className="social-btn" aria-label="Twitter"><Twitter size={16} /></a>
              <a href="#" className="social-btn" aria-label="Instagram"><Instagram size={16} /></a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="footer-col">
            <h4>Popular Services</h4>
            <ul className="footer-links">
              <li><Link to="/category/plumbing">Plumbing Services</Link></li>
              <li><Link to="/category/electrical">Electrical Repairs</Link></li>
              <li><Link to="/category/cleaning">Home & Office Cleaning</Link></li>
              <li><Link to="/category/mechanic">Auto Mechanic Repair</Link></li>
              <li><Link to="/category/electronics-repair">Gadget & Phone Repair</Link></li>
            </ul>
          </div>

          {/* Col 3: For Users */}
          <div className="footer-col">
            <h4>For Everyone</h4>
            <ul className="footer-links">
              <li><Link to="/register">Register as Vendor</Link></li>
              <li><Link to="/login">Sign In to Dashboard</Link></li>
              <li><Link to="/search">Explore Listings</Link></li>
              <li><a href="#">Frequently Asked Questions</a></li>
              <li><a href="#">Safety & Scam Support</a></li>
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div className="footer-col newsletter-col">
            <h4>Join Our Newsletter</h4>
            <p>Get tips and safety guides for hiring local service providers in Nigeria.</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Your email address" required />
              <button type="submit" className="newsletter-btn">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="copyright-text">
            <span>&copy; {new Date().getFullYear()} TaskNija. All rights reserved.</span>
            <span className="bullet-sep">&bull;</span>
            <a href="#">Privacy Policy</a>
            <span className="bullet-sep">&bull;</span>
            <a href="#">Terms of Use</a>
          </div>
          <button className="back-to-top-btn" onClick={scrollToTop} aria-label="Scroll to top">
            <ArrowUp size={16} />
            <span>Back to top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
