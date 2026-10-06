import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const features = [
  ['🏘️', 'Community', 'Connect with people around you and stay updated with what’s happening nearby.'],
  ['🛠️', 'Local Services', 'Find plumbers, electricians, tutors, cleaners and other trusted professionals.'],
  ['🛍️', 'Marketplace', 'Buy and sell useful second-hand items within your neighborhood.'],
  ['📣', 'Local Updates', 'Stay informed about announcements, events, maintenance and community news.'],
  ['★', 'Trusted Recommendations', 'Discover and review local businesses and service providers.'],
  ['🚨', 'Help Your Padosi', 'Share lost & found notices, emergency updates and requests for help.']
];

const steps = [
  ['01', 'Join your neighborhood', 'Choose your locality, apartment, or housing society.'],
  ['02', 'Meet your Padosis', 'Connect with people and discover what’s happening around you.'],
  ['03', 'Make neighborhood life easier', 'Find services, share updates, buy locally, and help your community.']
];

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="page-glow glow-one"></div>
      <div className="page-glow glow-two"></div>
      <header className="site-header">
        <nav className="nav container" aria-label="Main navigation">
          <a className="brand" href="#home" aria-label="Padosi home">
            <img className="brand-logo" src="/logo.png" alt="Padosi logo" /><span>Padosi</span>
          </a>
          <button 
            className="menu-toggle" 
            aria-label="Open menu" 
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span><span></span>
          </button>
          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinks">
            <a className="active" href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
            <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>How It Works</a>
            <div className="nav-actions">
              <Link to="/login" className="login" onClick={() => setIsMenuOpen(false)}>Log in</Link>
              <Link to="/register" className="button button-small" onClick={() => setIsMenuOpen(false)}>Join Padosi <span>→</span></Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero container" id="home">
          <div className="hero-copy reveal">
            <div className="eyebrow"><span className="eyebrow-dot"></span> Made for the people next door</div>
            <h1>Your neighborhood.<br /><em>Your people.</em><br />Your Padosi.</h1>
            <p className="tagline">Pados se Phechan</p>
            <p className="hero-text">Connect with your neighborhood, discover trusted local services, share updates, and build a stronger community — all in one place.</p>
            <div className="hero-actions">
              <Link to="/register" className="button">Join your neighborhood <span>→</span></Link>
            </div>
            <div className="trust-row">
              <div className="avatar-stack"><b>R</b><b>M</b><b>A</b><b>+</b></div>
              <span>Built for conversations that<br />begin close to home.</span>
            </div>
          </div>
          <div className="hero-art reveal">
            <div className="art-sun"></div>
            <div className="art-cloud cloud-a"></div>
            <div className="art-cloud cloud-b"></div>
            <div className="neighborhood">
              <div className="building tall"><i></i><i></i><i></i><i></i><i></i><i></i><strong>Chai &amp; Co.</strong></div>
              <div className="building home">
                <div className="roof"></div><i></i><i></i><i></i><i></i><b></b>
              </div>
              <div className="building mid"><i></i><i></i><i></i><i></i><i></i><i></i><strong>Vikas Heights</strong></div>
              <div className="tree tree-a"></div>
              <div className="tree tree-b"></div>
              <div className="tree tree-c"></div>
              <div className="road"></div>
              <div className="scooter">●</div>
            </div>
            <div className="floating-card hello-card"><span className="card-icon orange">👋</span>
              <div><small>New in your area</small><b>Say hello to Maya</b></div>
            </div>
            <div className="floating-card help-card"><span className="card-icon green">✓</span>
              <div><small>Trusted nearby</small><b>Electrician found</b></div>
            </div>
            <div className="map-pin pin-one">♥</div>
            <div className="map-pin pin-two">★</div>
            <div className="art-caption"><span></span> Your circle, right around the corner</div>
          </div>
        </section>

        <section className="features section container" id="about">
          <div className="section-intro reveal">
            <p className="eyebrow"><span className="eyebrow-dot"></span> One place, many possibilities</p>
            <h2>Everything your neighborhood needs, <em>in one place.</em></h2>
            <p>Life gets simpler when the people and places around you are easy to reach.</p>
          </div>
          <div className="feature-grid" id="featureGrid">
            {features.map(([icon, title, text], i) => (
              <article className="feature-card reveal" key={i}>
                <span className={`feature-icon icon-${i}`}>{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="#">Explore <span>→</span></a>
              </article>
            ))}
          </div>
        </section>

        <section className="works section" id="how-it-works">
          <div className="container">
            <div className="works-header reveal">
              <div>
                <p className="eyebrow light"><span className="eyebrow-dot"></span> Simple by design</p>
                <h2>Good neighbors are<br /><em>just three steps away.</em></h2>
              </div>
              <p>From your first hello to your hundredth helping hand, Padosi keeps your community close.</p>
            </div>
            <div className="steps" id="steps">
              {steps.map(([number, title, text]) => (
                <article className="step reveal" key={number}>
                  <span>{number}</span>
                  <div className="step-orb">
                    {number === '01' ? '⌂' : number === '02' ? '♡' : '✦'}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta container" id="join">
          <div className="cta-dots"></div>
          <p className="eyebrow light"><span className="eyebrow-dot"></span> Your community is waiting</p>
          <h2>Your Padosi are<br />closer than you think.</h2>
          <p>Start building a better, more connected neighborhood.</p>
          <Link to="/register" className="button button-light">Join Padosi <span>→</span></Link>
          <div className="cta-tagline">Pados se Phechan</div>
        </section>
      </main>
      <footer>
        <div className="container footer-main">
          <div>
            <a className="brand footer-brand" href="#home">
              <img className="brand-logo" src="/logo.png" alt="" /><span>Padosi</span>
            </a>
            <p>Pados se Phechan</p><small>Building better neighborhoods, together.</small>
          </div>
          <div className="footer-links">
            <div><b>Explore</b><a href="#about">About</a><a href="#how-it-works">How It Works</a></div>
            <div><b>Connect</b><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div>
            <div><b>Follow along</b><span className="socials"><a>in</a><a>◎</a><a>𝕏</a></span></div>
          </div>
        </div>
        <div className="container copyright">© 2026 Padosi. All rights reserved.<span>Made with care for every mohalla.</span>
        </div>
      </footer>
    </>
  );
};

export default Home;
