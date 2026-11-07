/**
 * Preset sample HTML templates for instant testing in the web app
 */

export const PRESETS = {
  landingPage: {
    name: 'SaaS Landing Page (HTML5 Semantic)',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acme Cloud - Intelligent Serverless Platform</title>
</head>
<body>
  <header id="site-header" class="header sticky">
    <div class="container nav-wrap">
      <a href="/" class="logo">Acme<strong>Cloud</strong></a>
      <nav class="nav-links">
        <a href="#features" class="nav-item">Features</a>
        <a href="#pricing" class="nav-item">Pricing</a>
        <a href="#about" class="nav-item">About</a>
        <a href="/login" class="btn btn-ghost">Sign In</a>
        <a href="/register" class="btn btn-primary">Start Free</a>
      </nav>
    </div>
  </header>

  <main id="main">
    <section class="hero">
      <div class="container hero-inner">
        <span class="pill-badge">Release v2.0 is Live</span>
        <h1 class="hero-headline">Build fast, deploy global, scale infinitely</h1>
        <p class="hero-subtext">The developer-first edge compute platform powered by intelligent execution engines.</p>
        <div class="cta-actions">
          <button type="button" class="btn btn-primary btn-lg">Deploy in 30s</button>
          <a href="/docs" class="btn btn-outline btn-lg" target="_blank">Read Documentation</a>
        </div>
      </div>
    </section>

    <section id="features" class="features-grid">
      <div class="feature-card" data-category="compute">
        <div class="icon-wrap">⚡</div>
        <h3>Instant Edge Compute</h3>
        <p>Run your microservices at over 300 locations worldwide with sub-5ms cold starts.</p>
      </div>
      <div class="feature-card" data-category="storage">
        <div class="icon-wrap">💾</div>
        <h3>Global Distributed DB</h3>
        <p>ACID-compliant relational and key-value storage with automatic synchronization.</p>
      </div>
      <div class="feature-card" data-category="security">
        <div class="icon-wrap">🔒</div>
        <h3>Zero-Trust Security</h3>
        <p>Automatic mTLS, DDoS mitigation, and enterprise role-based authorization.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2026 Acme Cloud, Inc. Built for developers.</p>
  </footer>
</body>
</html>`
  },

  dashboard: {
    name: 'Admin Dashboard (Tables, Cards & Badges)',
    html: `<div class="dashboard-layout" id="admin-root">
  <aside class="sidebar">
    <div class="sidebar-brand">
      <img src="logo.svg" alt="App Logo" width="32" height="32">
      <h2>Vision Admin</h2>
    </div>
    <ul class="nav-menu">
      <li class="active"><a href="/overview">Overview</a></li>
      <li><a href="/users">Users &amp; Roles</a></li>
      <li><a href="/metrics">Performance</a></li>
      <li><a href="/settings">Settings</a></li>
    </ul>
  </aside>

  <main class="content-panel">
    <header class="topbar">
      <h2>Cluster Overview</h2>
      <button id="btn-sync" class="btn btn-success" data-action="sync">Sync Nodes</button>
    </header>

    <div class="stats-row">
      <div class="stat-card" data-type="cpu">
        <span class="label">CPU Usage</span>
        <div class="stat-val">34.2%</div>
      </div>
      <div class="stat-card" data-type="mem">
        <span class="label">Memory</span>
        <div class="stat-val">18.6 GB / 64 GB</div>
      </div>
      <div class="stat-card" data-type="requests">
        <span class="label">Throughput</span>
        <div class="stat-val">124k req/s</div>
      </div>
    </div>

    <table class="table" id="nodes-table">
      <thead>
        <tr>
          <th>Node Name</th>
          <th>Region</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>edge-us-east-1</td>
          <td>US East</td>
          <td><span class="status-online">Healthy</span></td>
        </tr>
        <tr>
          <td>edge-eu-central-1</td>
          <td>Europe</td>
          <td><span class="status-online">Healthy</span></td>
        </tr>
      </tbody>
    </table>
  </main>
</div>`
  },

  malformed: {
    name: 'Malformed HTML (Fault Tolerance Test)',
    html: `<!-- Test parser recovery with unclosed, mismatched, and unquoted tags -->
<div class=outer-box id=main-container>
  <h2>Testing Unclosed Elements
  <p>First paragraph with <b>bold and <i>italic text</p>
  <p>Second paragraph that never closes
  <p>Third paragraph with void element: <img src=photo.png alt="Demo image" width=200>
  <ul>
    <li>Item Alpha
    <li>Item Beta
    <li>Item Gamma
  </ul>
  <div>Nested unclosed div
</div>`
  },

  scriptAndEntities: {
    name: 'Scripts, Styles & HTML Entities',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    .highlight { color: #3b82f6; font-weight: bold; }
    div > p { margin-bottom: 12px; }
  </style>
  <script>
    function checkLogic(a, b) {
      if (a < 10 && b > 20) {
        return "<div>raw html string</div>";
      }
      return null;
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>Special &amp; Entity Characters</h1>
    <p>Price: &euro;49.99 &middot; Copyright &copy; 2026 &trade;</p>
    <p>Math symbols: 5 &lt; 10 &amp;&amp; 20 &gt; 15</p>
    <input type="text" placeholder="Quotes: &quot;Hello&quot;" disabled>
  </div>
</body>
</html>`
  }
};
