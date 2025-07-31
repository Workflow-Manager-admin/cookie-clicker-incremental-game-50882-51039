import React, { useState, useEffect } from "react";
import "./App.css";

/**
 * COLOR PALETTE
 * --primary:   #FFD700  (gold, bright)
 * --secondary: #8B4513  (saddle brown, chocolatey)
 * --accent:    #DEB887  (burlywood, cookie dough)
 */

const GAME_STATE_KEY = "cookie_clicker_game_state";

const BOOSTERS = [
  {
    id: "cursor",
    name: "Cursor",
    description: "Auto-clicks: +1 cookie per second.",
    baseCost: 15,
    multiplier: 1,
    type: "autoclicker",
    cps: 1,
    icon: "🖱️",
  },
  {
    id: "grandma",
    name: "Grandma",
    description: "A nice grandma who bakes: +10 cookies per second.",
    baseCost: 100,
    multiplier: 1,
    type: "autoclicker",
    cps: 10,
    icon: "👵",
  },
  {
    id: "factory",
    name: "Factory",
    description: "Automated factory: +100 cookies per second.",
    baseCost: 1000,
    multiplier: 1,
    type: "autoclicker",
    cps: 100,
    icon: "🏭",
  }
];

const UPGRADES = [
  {
    id: "big-cookie",
    name: "Big Cookie",
    description: "Clicking gives you twice as many cookies.",
    cost: 200,
    unlockedBy: 100,
    icon: "🍪",
    bonus: (state) => ({ clickValue: state.clickValue * 2 }),
    appliesOnce: true,
  },
  {
    id: "golden-cookie",
    name: "Golden Cookie",
    description: "Unlock a 2x permanent cookies per second boost.",
    cost: 1200,
    unlockedBy: 1000,
    icon: "🥇",
    bonus: (state) => ({ cpsMultiplier: 2 }),
    appliesOnce: true,
  }
];

const ACHIEVEMENTS = [
  {
    id: "first-click",
    name: "First Click!",
    description: "Click the cookie for the first time.",
    check: (state) => state.cookiesClicked >= 1,
    icon: "👆",
  },
  {
    id: "hundred-cookies",
    name: "100 Cookies",
    description: "Collect 100 cookies in total.",
    check: (state) => state.totalCookies >= 100,
    icon: "🎉",
  },
  {
    id: "grandma-power",
    name: "Get a Grandma",
    description: "Hire your first Grandma.",
    check: (state) => (state.boosters.grandma || 0) >= 1,
    icon: "🧓",
  },
  {
    id: "factory-owner",
    name: "Own a Factory",
    description: "Own a cookie factory.",
    check: (state) => (state.boosters.factory || 0) >= 1,
    icon: "🏭",
  },
  {
    id: "thousand-cookies",
    name: "Cookie Magnate",
    description: "Collect 1,000 cookies in total.",
    check: (state) => state.totalCookies >= 1000,
    icon: "💰",
  }
];

function getInitialState() {
  const saved = window.localStorage.getItem(GAME_STATE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Defensive: parse again with defaults
      return {
        cookies: parsed.cookies || 0,
        totalCookies: parsed.totalCookies || 0,
        cookiesClicked: parsed.cookiesClicked || 0,
        clickValue: parsed.clickValue || 1,
        cpsMultiplier: parsed.cpsMultiplier || 1,
        upgrades: parsed.upgrades || {},
        boosters: parsed.boosters || {},
        achievements: parsed.achievements || {},
        lastTime: Date.now(),
      };
    } catch {
      // fallback to fresh state
    }
  }
  return {
    cookies: 0,
    totalCookies: 0,
    cookiesClicked: 0,
    clickValue: 1,
    cpsMultiplier: 1,
    upgrades: {},
    boosters: {},
    achievements: {},
    lastTime: Date.now(),
  };
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [state, setState] = useState(getInitialState);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 850); // responsiveness
  const [panel, setPanel] = useState("achievements");

  // Store theme in document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Responsive sidebar
  useEffect(() => {
    const onResize = () => {
      setShowSidebar(window.innerWidth > 850);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    window.localStorage.setItem(GAME_STATE_KEY, JSON.stringify({ ...state, lastTime: Date.now() }));
  }, [state]);

  // Passive cookies per second
  useEffect(() => {
    const interval = setInterval(() => {
      setState((old) => {
        const passive = getCps(old);
        if (passive <= 0) return old;
        const newCookies = old.cookies + passive / 10; // update 10 times per second
        const newTotal = old.totalCookies + passive / 10;
        return { ...old, cookies: newCookies, totalCookies: newTotal };
      });
    }, 100); // frequent for smoothness
    return () => clearInterval(interval);
  }, []);

  // Check and unlock achievements
  useEffect(() => {
    setState((old) => {
      let achievements = { ...old.achievements };
      let changed = false;
      ACHIEVEMENTS.forEach((ach) => {
        if (!achievements[ach.id] && ach.check(old)) {
          achievements[ach.id] = true;
          changed = true;
        }
      });
      if (changed)
        return { ...old, achievements };
      return old;
    });
  }, [state.cookies, state.totalCookies, state.boosters, state.cookiesClicked]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // PUBLIC_INTERFACE
  function clickCookie() {
    let val = state.clickValue;
    setState((old) => ({
      ...old,
      cookies: old.cookies + val,
      totalCookies: old.totalCookies + val,
      cookiesClicked: old.cookiesClicked + 1,
    }));
  }

  // PUBLIC_INTERFACE
  function getCps(curState = state) {
    let cps = 0;
    Object.entries(curState.boosters || {}).forEach(([id, qty]) => {
      const b = BOOSTERS.find(u => u.id === id);
      if (b && b.type === 'autoclicker') {
        cps += b.cps * qty;
      }
    });
    if (curState.upgrades["golden-cookie"]) cps *= 2;
    return cps * (curState.cpsMultiplier || 1);
  }

  // PUBLIC_INTERFACE
  function buyBooster(id) {
    const booster = BOOSTERS.find(b => b.id === id);
    if (!booster) return;
    const qty = state.boosters[id] || 0;
    const price = Math.floor(booster.baseCost * Math.pow(1.15, qty));
    if (state.cookies < price) return;
    setState((old) => ({
      ...old,
      cookies: old.cookies - price,
      boosters: { ...old.boosters, [id]: qty + 1 },
    }));
  }

  // PUBLIC_INTERFACE
  function canAffordBooster(id) {
    const booster = BOOSTERS.find(b => b.id === id);
    const qty = state.boosters[id] || 0;
    const price = Math.floor(booster.baseCost * Math.pow(1.15, qty));
    return state.cookies >= price;
  }

  // PUBLIC_INTERFACE
  function buyUpgrade(id) {
    const upgrade = UPGRADES.find(u => u.id === id);
    if (!upgrade || state.upgrades[id]) return;
    if (state.cookies < upgrade.cost) return;
    setState((old) => ({
      ...old,
      cookies: old.cookies - upgrade.cost,
      upgrades: { ...old.upgrades, [id]: true },
      ...upgrade.bonus(old)
    }));
  }

  // PUBLIC_INTERFACE
  function getAchievementsList() {
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: !!state.achievements[ach.id]
    }));
  }

  // PUBLIC_INTERFACE
  function resetGame() {
    window.localStorage.removeItem(GAME_STATE_KEY);
    setState(getInitialState());
  }

  // Visual -- make fun style!
  return (
    <div
      className="app-root"
      style={{
        background: "linear-gradient(135deg, #FFF8DC 0%, #FFF9E5 100%)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header className="cookie-header">
        <div className="cookie-title" style={{ color: "#8B4513" }}>
          🍪 Cookie Clicker!
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          style={{
            background: "var(--secondary)",
            color: "var(--primary)",
            border: "none",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            marginLeft: "auto",
            position: "absolute",
            right: 30,
            top: 18,
            padding: "8px 16px"
          }}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          className="reset-btn"
          onClick={resetGame}
          style={{
            background: "#FFD700",
            border: "none",
            borderRadius: "8px",
            color: "#8B4513",
            fontWeight: "bold",
            marginLeft: "20px",
            position: "absolute",
            left: 30,
            top: 18,
            padding: "8px 16px",
            cursor: "pointer",
            boxShadow: "0 1px 3px #0001"
          }}
          title="Reset all game progress"
        >Reset</button>
      </header>
      <main className="cookie-main">
        {/* Sidebar */}
        {showSidebar &&
          <aside className="cookie-sidebar">
            <Sidebar
              state={state}
              buyBooster={buyBooster}
              canAffordBooster={canAffordBooster}
              buyUpgrade={buyUpgrade}
            />
          </aside>
        }
        <section className="cookie-center-panel">
          {/* COOKIE + COUNTER */}
          <div className="cookie-main-row">
            <CookieDisplay
              onClick={clickCookie}
              clickValue={state.clickValue}
              withPulse={true}
            />
            <div className="cookie-stats">
              <div className="cookie-counter">
                <span role="img" aria-label="cookie" className="counter-emoji">
                  🍪
                </span>
                <span className="cookie-number">
                  {Math.floor(state.cookies)}
                </span>
              </div>
              <div className="cookie-substats">
                <div>
                  <span role="img" aria-label="cps" title="Cookies per second">
                    ⏱️
                  </span>{" "}
                  <span>
                    {getCps(state).toFixed(1)}/sec
                  </span>
                </div>
                <div>
                  <span role="img" aria-label="total">
                    🏅
                  </span>{" "}
                  <span>
                    Total: {Math.floor(state.totalCookies)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Upgrades */}
          <UpgradesPanel state={state} buyUpgrade={buyUpgrade} />
          {/* Achievements panel or Achievements button on mobile */}
          {(showSidebar || panel === "achievements") && (
            <AchievementsPanel achievements={getAchievementsList()} />
          )}
          {!showSidebar && (
            <div style={{ margin: "24px 0 0 0" }}>
              <button
                className="mobile-panel-btn"
                onClick={() => setPanel(panel === "achievements" ? "" : "achievements")}
                style={{
                  background: "#DEB887",
                  color: "#8B4513",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 28px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  boxShadow: "0 2px 4px #0001",
                }}
              >
                {panel === "achievements" ? "Hide Achievements" : "Show Achievements"}
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="cookie-footer">
        &copy; {new Date().getFullYear()} Cookie Clicker Fun! | React Demo
      </footer>
    </div>
  );
}

// Cookie Display Component
function CookieDisplay({ onClick, clickValue, withPulse }) {
  const [animate, setAnimate] = useState(false);

  function handleClick() {
    setAnimate(true);
    onClick();
  }
  useEffect(() => {
    if (!animate) return;
    const timeout = setTimeout(() => setAnimate(false), 250);
    return () => clearTimeout(timeout);
  }, [animate]);
  return (
    <div className="cookie-container">
      <button
        className={`cookie-img-btn ${animate && withPulse ? "cookie-pulse" : ""}`}
        onClick={handleClick}
        aria-label="Click me!"
        tabIndex={0}
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(145deg,#FFD700,#DEB887 60%,#E5A14C)",
          borderRadius: "50%",
          border: "5px solid #8B4513",
          boxShadow: "0 3px 12px #DEB88780, 0 1px 2px #FFD70090",
          cursor: "pointer",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          outline: "none",
          fontSize: "3rem",
          transition: "box-shadow 0.1s",
          willChange: "transform",
          userSelect: "none",
        }}
      >
        <span className="cookie-graphic" style={{
          fontSize: "5rem",
          WebkitTextStroke: "1px #8B451366"
        }}>
          🍪
        </span>
        <span className="cookie-click-value" style={{
          position: "absolute",
          bottom: "-30px",
          fontSize: "1rem",
          color: "#8B4513",
          fontWeight: "bold",
          textShadow: "0 1px 1px #fff5"
        }}>+{clickValue}</span>
      </button>
    </div>
  );
}

// Sidebar for Boosters/Autoclickers
function Sidebar({ state, buyBooster, canAffordBooster, buyUpgrade }) {
  const boosters = BOOSTERS;
  return (
    <div className="sidebar-content">
      <div className="sidebar-title">
        <span role="img" aria-label="Upgrade">🛠️</span> Upgrades
      </div>
      <div className="sidebar-section">
        {boosters.map(booster => {
          const qty = state.boosters[booster.id] || 0;
          const price = Math.floor(booster.baseCost * Math.pow(1.15, qty));
          return (
            <div className="sidebar-item booster" key={booster.id} style={{
              background: "#FFFBE3",
              borderRadius: "12px",
              marginBottom: "10px",
              boxShadow: "0 1px 2px #DEB88744"
            }}>
              <div className="booster-info">
                <span className="booster-icon">{booster.icon}</span>
                <span className="booster-name">{booster.name}</span>
                <span className="booster-desc">{booster.description}</span>
              </div>
              <div className="booster-buy">
                <span className="booster-owned" style={{
                  color: "#8B4513",
                  background: "#FFD70044",
                  borderRadius: "5px",
                  padding: "2px 8px"
                }}>
                  {qty}
                </span>
                <button
                  className="buy-btn"
                  style={{
                    background: canAffordBooster(booster.id) ? "#FFD700" : "#eee",
                    color: "#8B4513",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    marginLeft: "10px",
                    padding: "4px 10px",
                    fontSize: "1em",
                    cursor: canAffordBooster(booster.id) ? "pointer" : "not-allowed",
                    boxShadow: canAffordBooster(booster.id) ? "0 2px 3px #FFD70040" : "none"
                  }}
                  disabled={!canAffordBooster(booster.id)}
                  onClick={() => buyBooster(booster.id)}
                >
                  Buy ({price} 🍪)
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sidebar-note">
        Earn cookies automatically! Better boosters = faster cookies.
      </div>
    </div>
  );
}

// Upgrades Panel (one-time bonuses)
function UpgradesPanel({ state, buyUpgrade }) {
  const list = UPGRADES.filter(up => !state.upgrades[up.id] && state.totalCookies >= up.unlockedBy);
  return (
    <div className="upgrades-section" style={{
      margin: "24px 0",
      textAlign: "center"
    }}>
      {!!list.length && (
        <>
          <div className="upgrades-title" style={{
            fontWeight: "bold",
            color: "#8B4513",
            marginBottom: "10px",
            fontSize: "1.22rem"
          }}>Unlock Upgrades</div>
          <div className="upgrades-list">
            {list.map(up =>
              <button
                key={up.id}
                className="upgrade-btn"
                onClick={() => buyUpgrade(up.id)}
                style={{
                  background: "#FFD700",
                  color: "#8B4513",
                  border: "none",
                  borderRadius: "14px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "8px",
                  padding: "14px 24px",
                  fontWeight: "bold",
                  fontSize: "1em",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px #FFD70038",
                  transition: "box-shadow .15s"
                }}
                disabled={state.cookies < up.cost}
                title={up.description}
              >
                <span style={{ fontSize: "1.35em", marginRight: "12px" }}>{up.icon}</span>
                <span style={{ flex: 1, minWidth: 70 }}>{up.name}</span>
                <span style={{
                  fontWeight: "normal",
                  color: "#7c4821",
                  marginLeft: "10px",
                  fontSize: "0.98em"
                }}>{up.cost} 🍪</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Achievements Panel
function AchievementsPanel({ achievements }) {
  return (
    <div className="achievements-panel"
      style={{
        marginTop: "16px",
        background: "#FFF9E5",
        borderRadius: "14px",
        padding: "18px 16px 12px 16px",
        boxShadow: "0 2px 12px #FFD70018",
        minHeight: 80
      }}>
      <div className="achievements-title"
        style={{
          color: "#8B4513",
          fontWeight: "bold",
          fontSize: "1.15rem",
          marginBottom: "8px"
        }}>Achievements</div>
      <div className="achievements-list" style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px"
      }}>
        {achievements.map(ach => (
          <div key={ach.id}
            className="achievement"
            style={{
              opacity: ach.unlocked ? 1 : 0.35,
              filter: ach.unlocked ? "none" : "grayscale(0.7)",
              background: "#FFD700",
              borderRadius: "7px",
              padding: "5px 10px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              minWidth: "80px",
              boxShadow: "0 1px 3px #FFD70021",
              fontSize: "1.01em"
            }}
            title={ach.description}
          >
            <span>{ach.icon}</span>
            <span style={{ fontWeight: "bold" }}>{ach.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
