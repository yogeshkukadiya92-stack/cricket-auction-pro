# 🏏 Cricket Auction Pro 2026

An ultra-luxury, real-time Cricket Auction Dashboard with 3D interactive player cards, Web Audio sound synthesizer, franchise bidding paddles, live stream OBS overlay, and WhatsApp/Instagram social media poster generator.

Designed for Box Cricket, Corporate Leagues, and Premier Tournaments (IPL style).

---

## 🌟 Key Features

1. **📺 4K Stage / Projector View:**
   - 3D perspective holographic player cards with dynamic lighting reflection.
   - Real-time highest bid counter with pulsing glow.
   - 15-second countdown timer with audio ticker.
   - Sold celebration with confetti fireworks and fanfare chords.

2. **🎙️ Auctioneer Command Desk:**
   - One-click bid increments (+2k, +5k, +10k, +25k) and custom bids.
   - Wooden gavel hammer strike sound effect.
   - Instant Undo / Rollback engine for accidental bids.
   - Unsold lot routing to Accelerated Round.
   - Random lottery draw.

3. **📱 Franchise Owner Bidding Paddle:**
   - Mobile-responsive console for team owners.
   - Real-time remaining purse, spent purse, and squad slot tracker.
   - Smart Max Safe Bid calculation (prevents overspending beyond required slots).
   - Instant touch paddle button.

4. **📂 CSV / Excel Bulk Importer & Exporter:**
   - Upload 100 to 1,000+ players from an Excel/CSV spreadsheet in 1 second.
   - Download sample CSV template.
   - Export full player auction status to CSV.

5. **📸 WhatsApp & Instagram "SOLD" HD Poster Generator:**
   - 1080x1080 square poster canvas rendering.
   - Direct PNG download and one-click WhatsApp share with preformatted text.

6. **🎥 OBS Studio Live Stream Transparent Overlay:**
   - 100% transparent background lower-third broadcast ticker.
   - Ready for OBS Studio, Streamlabs, and vMix (`?mode=obs`).

7. **⚡ Zero-Latency Multi-Window Sync:**
   - Native `BroadcastChannel` synchronization across multiple tabs and monitors in 1ms.

8. **🛡️ Franchise & Rules Manager:**
   - Create custom teams, assign logos/emojis, custom hex colors, owners, and purse budgets.
   - Configure bid slabs, timer duration, and currency (₹ INR, Points, Lakhs/Crores, USD).

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/cricket-auction-pro.git

# Navigate to project directory
cd cricket-auction-pro

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5174/` in your browser.

---

## 🛠️ Built With
- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS** (Luxury Obsidian Theme)
- **Lucide React** (Icons)
- **Canvas-Confetti** (Celebrations)
- **Web Audio API** (Zero-dependency sound synthesis)

## Administrator account on Coolify

Open the application's **Terminal** in Coolify and run:

```bash
npm run admin:create -- you@example.com "Your Name"
```

Enter and confirm a password of 12–128 characters when prompted. The input is hidden. This command creates an administrator or resets the password of an account with that email, promotes it to administrator, and signs out its existing sessions. Sign in at the normal application URL with that email and password to open the Admin Panel. Run the same command again to change the password. Do not pass the password on the command line or store it in the repository.

---

## 📄 License
MIT License. Created with ❤️ for cricket communities worldwide.
