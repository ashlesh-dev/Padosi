const features = [
  ['🏘️','Community','Connect with people around you and stay updated with what’s happening nearby.'],
  ['🛠️','Local Services','Find plumbers, electricians, tutors, cleaners and other trusted professionals.'],
  ['🛍️','Marketplace','Buy and sell useful second-hand items within your neighborhood.'],
  ['📣','Local Updates','Stay informed about announcements, events, maintenance and community news.'],
  ['★','Trusted Recommendations','Discover and review local businesses and service providers.'],
  ['🚨','Help Your Padosi','Share lost & found notices, emergency updates and requests for help.']
];
const steps = [
  ['01','Join your neighborhood','Choose your locality, apartment, or housing society.'],
  ['02','Meet your Padosis','Connect with people and discover what’s happening around you.'],
  ['03','Make neighborhood life easier','Find services, share updates, buy locally, and help your community.']
];
document.querySelector('#featureGrid').innerHTML = features.map(([icon,title,text], i) => `<article class="feature-card reveal"><span class="feature-icon icon-${i}">${icon}</span><h3>${title}</h3><p>${text}</p><a href="#">Explore <span>→</span></a></article>`).join('');
document.querySelector('#steps').innerHTML = steps.map(([number,title,text]) => `<article class="step reveal"><span>${number}</span><div class="step-orb">${number === '01' ? '⌂' : number === '02' ? '♡' : '✦'}</div><h3>${title}</h3><p>${text}</p></article>`).join('');
const toggle = document.querySelector('.menu-toggle'), links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => { const open = links.classList.toggle('open'); toggle.setAttribute('aria-expanded', open); });
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); toggle.setAttribute('aria-expanded', false); }));
const toast = document.querySelector('.toast');
let toastTimer;
document.querySelectorAll('[data-coming-soon]').forEach(button => button.addEventListener('click', () => {
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}));
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }}), {threshold:.1});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
