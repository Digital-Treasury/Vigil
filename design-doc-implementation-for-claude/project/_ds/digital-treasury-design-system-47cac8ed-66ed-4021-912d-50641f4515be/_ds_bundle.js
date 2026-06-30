/* @ds-bundle: {"format":3,"namespace":"DigitalTreasuryDesignSystem_47cac8","components":[],"sourceHashes":{"ui_kits/client_dashboard/ActivityTable.jsx":"9dcfa68a7f84","ui_kits/client_dashboard/Sidebar.jsx":"e44b1702c576","ui_kits/client_dashboard/StatCards.jsx":"972c487fd8e2","ui_kits/client_dashboard/Topbar.jsx":"b886fe57cd77","ui_kits/client_dashboard/TrafficChart.jsx":"ec3e4923747d","ui_kits/marketing_site/CTA.jsx":"2b6875c8ef9f","ui_kits/marketing_site/Footer.jsx":"db9ff4b1d467","ui_kits/marketing_site/Hero.jsx":"4abd3bf2879c","ui_kits/marketing_site/Nav.jsx":"99eaa4b59cb9","ui_kits/marketing_site/Services.jsx":"8203b6fe5613","ui_kits/marketing_site/Testimonials.jsx":"303aa1ba843a","ui_kits/marketing_site/TrustedBy.jsx":"6bfcb0b1f1b1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DigitalTreasuryDesignSystem_47cac8 = window.DigitalTreasuryDesignSystem_47cac8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/client_dashboard/ActivityTable.jsx
try { (() => {
const ActivityTable = () => {
  const rows = [{
    when: 'Just now',
    who: 'Deploy bot',
    what: 'Published “Autumn sale” landing page',
    status: 'live'
  }, {
    when: '12 min ago',
    who: 'Priya (DT)',
    what: 'Fixed cart redirect on mobile Safari',
    status: 'live'
  }, {
    when: '38 min ago',
    who: 'Form capture',
    what: '3 new leads from /contact',
    status: 'pending'
  }, {
    when: '2 h ago',
    who: 'CDN',
    what: 'TLS certificate auto-renewed',
    status: 'live'
  }, {
    when: 'Yesterday',
    who: 'Marcus (DT)',
    what: 'SEO audit — 14 items actioned',
    status: 'live'
  }, {
    when: 'Yesterday',
    who: 'Uptime check',
    what: 'Slow response from /blog (8.2s)',
    status: 'failed'
  }];
  const label = {
    live: 'Live',
    pending: 'Pending',
    failed: 'Failed'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "dd-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-card__head"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.01em'
    }
  }, "Recent activity"), /*#__PURE__*/React.createElement("a", {
    className: "dt-link"
  }, "View all \u2197")), /*#__PURE__*/React.createElement("table", {
    className: "dd-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "When"), /*#__PURE__*/React.createElement("th", null, "Who"), /*#__PURE__*/React.createElement("th", null, "What"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      color: '#9A9A9A',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.when), /*#__PURE__*/React.createElement("td", {
    style: {
      fontWeight: 500
    }
  }, r.who), /*#__PURE__*/React.createElement("td", {
    style: {
      color: '#4A4A4A'
    }
  }, r.what), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: 'dd-badge dd-badge--' + r.status
  }, "\u25CF ", label[r.status])))))));
};
window.ActivityTable = ActivityTable;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_dashboard/ActivityTable.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_dashboard/Sidebar.jsx
try { (() => {
const Sidebar = ({
  active,
  onNav
}) => {
  const items = [{
    id: 'overview',
    icon: 'layout-dashboard',
    label: 'Overview'
  }, {
    id: 'traffic',
    icon: 'trending-up',
    label: 'Traffic'
  }, {
    id: 'pages',
    icon: 'file-text',
    label: 'Pages'
  }, {
    id: 'leads',
    icon: 'users',
    label: 'Leads'
  }, {
    id: 'bookings',
    icon: 'calendar',
    label: 'Bookings'
  }, {
    id: 'uptime',
    icon: 'activity',
    label: 'Uptime'
  }, {
    id: 'billing',
    icon: 'receipt',
    label: 'Billing'
  }];
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("aside", {
    className: "dd-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-side__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "Digital Treasury",
    style: {
      height: 24,
      width: 'auto'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "dd-side__org"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-side__org-avatar"
  }, "EM"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '-0.01em'
    }
  }, "Edimark"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#9A9A9A'
    }
  }, "edimark.com.au"))), /*#__PURE__*/React.createElement("nav", {
    className: "dd-side__nav"
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.id,
    className: 'dd-side__item ' + (active === it.id ? 'is-active' : ''),
    onClick: () => onNav(it.id)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": it.icon
  }), it.label))), /*#__PURE__*/React.createElement("div", {
    className: "dd-side__foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "dd-side__item"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "life-buoy"
  }), "Support"), /*#__PURE__*/React.createElement("button", {
    className: "dd-side__item"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "settings"
  }), "Settings")));
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_dashboard/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_dashboard/StatCards.jsx
try { (() => {
const StatCards = () => {
  const cards = [{
    label: 'Monthly visitors',
    value: '48,920',
    delta: '+12.4%',
    up: true,
    highlight: true
  }, {
    label: 'Leads this month',
    value: '312',
    delta: '+6.1%',
    up: true
  }, {
    label: 'Conversion rate',
    value: '4.8%',
    delta: '-0.3%',
    up: false
  }, {
    label: 'Uptime (30d)',
    value: '99.98%',
    delta: 'All systems go',
    up: true
  }];
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "dd-stats"
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "dd-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-stat__label"
  }, c.label), /*#__PURE__*/React.createElement("div", {
    className: "dd-stat__value"
  }, c.highlight ? /*#__PURE__*/React.createElement("span", {
    className: "dt-highlight"
  }, c.value) : c.value), /*#__PURE__*/React.createElement("div", {
    className: 'dd-stat__delta ' + (c.up ? 'is-up' : 'is-down')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": c.up ? 'trending-up' : 'trending-down'
  }), c.delta))));
};
window.StatCards = StatCards;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_dashboard/StatCards.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_dashboard/Topbar.jsx
try { (() => {
const Topbar = ({
  title,
  subtitle
}) => {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("header", {
    className: "dd-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "dt-eyebrow",
    style: {
      color: '#9A9A9A',
      marginBottom: 4
    }
  }, "Client Dashboard"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: '-0.02em'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#6B6B6B',
      fontSize: 13,
      marginTop: 4
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "dd-top__actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-search"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search pages, leads, events\u2026"
  }), /*#__PURE__*/React.createElement("span", {
    className: "dd-kbd"
  }, "\u2318K")), /*#__PURE__*/React.createElement("button", {
    className: "dd-icon-btn"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "bell"
  })), /*#__PURE__*/React.createElement("button", {
    className: "dt-btn dt-btn--primary",
    style: {
      height: 38,
      fontSize: 13,
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      width: 14,
      height: 14,
      marginRight: 4
    }
  }), "New report")));
};
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_dashboard/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_dashboard/TrafficChart.jsx
try { (() => {
const TrafficChart = () => {
  const pts = [18, 22, 20, 28, 34, 30, 38, 44, 40, 48, 54, 50, 58, 62, 60, 68, 72, 70, 76, 82, 78, 84, 90, 86, 92];
  const w = 720,
    h = 200,
    max = 100;
  const path = pts.map((v, i) => {
    const x = i / (pts.length - 1) * w;
    const y = h - v / max * h;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const area = path + ` L${w},${h} L0,${h} Z`;
  return /*#__PURE__*/React.createElement("div", {
    className: "dd-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dd-card__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "dt-eyebrow",
    style: {
      color: '#9A9A9A'
    }
  }, "Last 30 days"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      marginTop: 2
    }
  }, "Organic traffic")), /*#__PURE__*/React.createElement("div", {
    className: "dd-seg"
  }, /*#__PURE__*/React.createElement("button", {
    className: "is-active"
  }, "30d"), /*#__PURE__*/React.createElement("button", null, "90d"), /*#__PURE__*/React.createElement("button", null, "1y"))), /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    style: {
      width: '100%',
      height: 200,
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "g",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#0A0A0A",
    stopOpacity: "0.12"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#0A0A0A",
    stopOpacity: "0"
  }))), [0, 25, 50, 75, 100].map(v => /*#__PURE__*/React.createElement("line", {
    key: v,
    x1: "0",
    x2: w,
    y1: h - v / max * h,
    y2: h - v / max * h,
    stroke: "#F2F2F2",
    strokeWidth: "1"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#g)"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "#0A0A0A",
    strokeWidth: "2",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  })));
};
window.TrafficChart = TrafficChart;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_dashboard/TrafficChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/CTA.jsx
try { (() => {
const CTA = () => /*#__PURE__*/React.createElement("section", {
  id: "contact",
  className: "dt-section dt-section--dark",
  style: {
    paddingTop: 72,
    paddingBottom: 72
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "dt-container",
  style: {
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("h2", {
  className: "dt-section__heading dt-section__heading--onDark",
  style: {
    textAlign: 'center'
  }
}, "Ready to ", /*#__PURE__*/React.createElement("span", {
  className: "dt-highlight"
}, "build"), " something real?"), /*#__PURE__*/React.createElement("p", {
  style: {
    color: '#CFCFCF',
    fontSize: 18,
    maxWidth: 540,
    margin: '16px auto 28px',
    lineHeight: 1.5
  }
}, "Book a 30-minute call. We\u2019ll ask the awkward questions so you don\u2019t waste three months finding out later."), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'inline-flex',
    gap: 12
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "dt-btn dt-btn--primary-invert"
}, "Book a Meeting"), /*#__PURE__*/React.createElement("button", {
  className: "dt-btn dt-btn--outline-dark"
}, "Contact Us"))));
window.CTA = CTA;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/CTA.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Footer.jsx
try { (() => {
const Footer = () => /*#__PURE__*/React.createElement("footer", {
  className: "dt-footer"
}, /*#__PURE__*/React.createElement("div", {
  className: "dt-container dt-footer__grid"
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "dt-footer__logo"
}, /*#__PURE__*/React.createElement("img", {
  src: "../../assets/logo-white.png",
  alt: "Digital Treasury",
  style: {
    height: 30,
    width: 'auto',
    display: 'block'
  }
})), /*#__PURE__*/React.createElement("p", {
  style: {
    color: '#8A8A8A',
    fontSize: 13,
    marginTop: 14,
    maxWidth: 260,
    lineHeight: 1.5
  }
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "dt-footer__h"
}, "Services"), /*#__PURE__*/React.createElement("a", null, "Web design"), /*#__PURE__*/React.createElement("a", null, "SEO"), /*#__PURE__*/React.createElement("a", null, "Hosting"), /*#__PURE__*/React.createElement("a", null, "Maintenance")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "dt-footer__h"
}, "Company"), /*#__PURE__*/React.createElement("a", null, "Our Work"), /*#__PURE__*/React.createElement("a", null, "About Us"), /*#__PURE__*/React.createElement("a", null, "Articles"), /*#__PURE__*/React.createElement("a", null, "FAQ")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "dt-footer__h"
}, "Contact"), /*#__PURE__*/React.createElement("a", null, "hello@digitaltreasury.com.au"), /*#__PURE__*/React.createElement("a", null, "+61 3 0000 0000"), /*#__PURE__*/React.createElement("a", null, "Melbourne, AU"))), /*#__PURE__*/React.createElement("div", {
  className: "dt-footer__bottom"
}, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Digital Treasury Pty Ltd"), /*#__PURE__*/React.createElement("span", null, "ABN 00 000 000 000 \xB7 Privacy \xB7 Terms")));
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Hero.jsx
try { (() => {
const Hero = () => /*#__PURE__*/React.createElement("section", {
  id: "top",
  className: "dt-hero"
}, /*#__PURE__*/React.createElement("div", {
  className: "dt-container"
}, /*#__PURE__*/React.createElement("h1", {
  className: "dt-hero__headline"
}, "Maximise your web potential.", /*#__PURE__*/React.createElement("br", null), "Your partners in ", /*#__PURE__*/React.createElement("span", {
  className: "dt-highlight"
}, "development.")), /*#__PURE__*/React.createElement("p", {
  className: "dt-hero__lead"
}, "Take your budget further with direct access to the skills,", /*#__PURE__*/React.createElement("br", null), "knowledge and team you need to succeed."), /*#__PURE__*/React.createElement("div", {
  className: "dt-hero__cta"
}, /*#__PURE__*/React.createElement("a", {
  href: "#contact",
  className: "dt-btn dt-btn--primary-invert"
}, "Contact Us"), /*#__PURE__*/React.createElement("a", {
  href: "#work",
  className: "dt-btn dt-btn--outline-dark"
}, "See Our Work"))));
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Nav.jsx
try { (() => {
const Nav = () => {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("header", {
    className: "dt-nav"
  }, /*#__PURE__*/React.createElement("a", {
    className: "dt-nav__logo",
    href: "#top"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-white.png",
    alt: "Digital Treasury",
    style: {
      height: 32,
      width: 'auto',
      display: 'block'
    }
  })), /*#__PURE__*/React.createElement("nav", {
    className: "dt-nav__menu"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#services"
  }, "SERVICES \u25BE"), /*#__PURE__*/React.createElement("a", {
    href: "#work"
  }, "OUR WORK"), /*#__PURE__*/React.createElement("a", {
    href: "#faq"
  }, "FAQ"), /*#__PURE__*/React.createElement("a", {
    href: "#articles"
  }, "ARTICLES"), /*#__PURE__*/React.createElement("a", {
    href: "#about"
  }, "ABOUT US")), /*#__PURE__*/React.createElement("div", {
    className: "dt-nav__cta"
  }, /*#__PURE__*/React.createElement("button", {
    className: "dt-btn dt-btn--primary-dark",
    onClick: () => setOpen(true)
  }, "Book a Meeting"), /*#__PURE__*/React.createElement("button", {
    className: "dt-btn dt-btn--outline-dark",
    onClick: () => setOpen(true)
  }, "Contact Us")), open && /*#__PURE__*/React.createElement("div", {
    className: "dt-modal",
    onClick: () => setOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-modal__card",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-eyebrow"
  }, "Get in touch"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: '-0.02em',
      marginTop: 8
    }
  }, "Tell us what you\u2019re building."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#4A4A4A',
      marginTop: 8,
      marginBottom: 20
    }
  }, "We\u2019ll get back within one business day."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "dt-input",
    placeholder: "Your name"
  }), /*#__PURE__*/React.createElement("input", {
    className: "dt-input",
    placeholder: "your@email.com"
  }), /*#__PURE__*/React.createElement("textarea", {
    className: "dt-input",
    rows: "4",
    placeholder: "A few lines about the project"
  }), /*#__PURE__*/React.createElement("button", {
    className: "dt-btn dt-btn--primary",
    onClick: () => setOpen(false)
  }, "Send message")))));
};
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Services.jsx
try { (() => {
const SERVICES = [{
  icon: 'monitor',
  title: 'Web',
  desc: 'Get a new website that not only looks good but can convert traffic into new customers for your business.',
  bullets: ['Conversion & SEO optimised', 'Responsive designs for all devices', 'Custom designs by local designers']
}, {
  icon: 'bar-chart-2',
  title: 'SEO',
  desc: 'Get targeted traffic from Google for the exact searches most relevant to the products or services you sell.',
  bullets: ['On-page & technical SEO', 'Content writing & strategy', 'Link building & off-page SEO']
}, {
  icon: 'cloud',
  title: 'Hosting',
  desc: 'Offer unique, tailored experiences to your customers or improve efficiency with internal dashboards and tools.',
  bullets: ['Customer portals or dashboards', 'Internal tools & automated workflows', 'Advanced payment/booking systems']
}];
const Services = () => {
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("section", {
    id: "services",
    className: "dt-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-container"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "dt-section__heading"
  }, "Our ", /*#__PURE__*/React.createElement("span", {
    className: "dt-highlight"
  }, "Services")), /*#__PURE__*/React.createElement("div", {
    className: "dt-services"
  }, SERVICES.map(s => /*#__PURE__*/React.createElement("article", {
    key: s.title,
    className: "dt-service-card"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": s.icon,
    className: "dt-service-card__icon"
  }), /*#__PURE__*/React.createElement("h3", null, s.title), /*#__PURE__*/React.createElement("p", null, s.desc), /*#__PURE__*/React.createElement("ul", null, s.bullets.map(b => /*#__PURE__*/React.createElement("li", {
    key: b
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check-circle-2"
  }), b))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "dt-link"
  }, "View Service ", /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 2
    }
  }, "\u2197")))))));
};
window.Services = Services;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Services.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Testimonials.jsx
try { (() => {
const QUOTES = [{
  name: 'Lauren K.',
  role: 'Operations Lead, Edimark',
  initials: 'LK',
  q: 'They felt like an extension of our team. Direct access to the people actually building the site meant decisions happened in hours, not weeks.'
}, {
  name: 'Marcus T.',
  role: 'GM, Diabetes Vic',
  initials: 'MT',
  q: 'Launched on time, under budget, and the conversion rate on our donation flow doubled in the first month.'
}, {
  name: 'Priya S.',
  role: 'IT Manager, Brimbank CC',
  initials: 'PS',
  q: 'Their technical SEO audit uncovered issues two other agencies had missed. Traffic is up 68% year on year.'
}];
const Testimonials = () => {
  const [i, setI] = React.useState(0);
  const q = QUOTES[i];
  return /*#__PURE__*/React.createElement("section", {
    className: "dt-section dt-section--dark"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-container"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "dt-section__heading dt-section__heading--onDark"
  }, "What our ", /*#__PURE__*/React.createElement("span", {
    className: "dt-highlight"
  }, "clients"), " say"), /*#__PURE__*/React.createElement("div", {
    className: "dt-testimonial"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-testimonial__stars"
  }, "\u2605 \u2605 \u2605 \u2605 \u2605"), /*#__PURE__*/React.createElement("blockquote", {
    className: "dt-testimonial__quote"
  }, "\u201C", q.q, "\u201D"), /*#__PURE__*/React.createElement("div", {
    className: "dt-testimonial__person"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dt-avatar"
  }, q.initials), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: '#fff'
    }
  }, q.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#8A8A8A'
    }
  }, q.role))), /*#__PURE__*/React.createElement("div", {
    className: "dt-testimonial__dots"
  }, QUOTES.map((_, n) => /*#__PURE__*/React.createElement("button", {
    key: n,
    "aria-label": `Quote ${n + 1}`,
    className: 'dt-dot ' + (n === i ? 'is-active' : ''),
    onClick: () => setI(n)
  }))))));
};
window.Testimonials = Testimonials;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Testimonials.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/TrustedBy.jsx
try { (() => {
const TrustedBy = () => /*#__PURE__*/React.createElement("section", {
  className: "dt-trusted"
}, /*#__PURE__*/React.createElement("div", {
  className: "dt-container"
}, /*#__PURE__*/React.createElement("p", {
  className: "dt-trusted__label"
}, "Trusted by leading Australian businesses"), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__row"
}, /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__chip dt-trusted__chip--light"
}, /*#__PURE__*/React.createElement("b", null, "MePACS"), /*#__PURE__*/React.createElement("i", null, "Personal Alarm Service")), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__chip"
}, /*#__PURE__*/React.createElement("svg", {
  width: "26",
  height: "26",
  viewBox: "0 0 26 26",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 20 C 8 8, 18 6, 23 14 L 22 20 H 3 Z",
  fill: "#fff"
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Brimbank"), /*#__PURE__*/React.createElement("i", null, "City Council"))), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__chip"
}, /*#__PURE__*/React.createElement("b", null, "diabetes vic")), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__chip"
}, /*#__PURE__*/React.createElement("b", null, "edimark")), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__serif"
}, "kinetic ", /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700,
    fontStyle: 'normal',
    fontFamily: 'Inter'
  }
}, "IT")), /*#__PURE__*/React.createElement("div", {
  className: "dt-trusted__chip dt-trusted__chip--wide"
}, /*#__PURE__*/React.createElement("b", null, "THE CREATIVE WORKS")))));
window.TrustedBy = TrustedBy;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/TrustedBy.jsx", error: String((e && e.message) || e) }); }

})();
