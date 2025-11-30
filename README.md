# WhatsApp Supplier Bot - Flood Relief Resource Connector

A WhatsApp bot that connects flood relief suppliers with those in need, featuring a comprehensive database of government relief officers across Sri Lanka.

## 🌟 Features

### For Suppliers

- Register available supplies (food, water, medicine, clothing, sanitary items)
- Share location automatically via WhatsApp
- Get matched with nearby requesters

### For Requesters

- Find suppliers and relief officers by location
- Smart location-based search (City → District → Province fallback)
- Manual location selection if GPS unavailable
- Access to 299+ government relief officers nationwide

### Government Officers Database

- Pre-loaded database of Divisional Secretaries across Sri Lanka
- Complete contact information (mobile, office phone, fax)
- Organized by province, district, and division
- All Excel data preserved (name, class, contact details)

## 📊 Database Structure

### Dual Database System

- **suppliers.json** - User-registered suppliers
- **officers.json** - Government relief officers from official data

Both databases are:

- ✅ Atomic write protection (crash-proof)
- ✅ 7-day automatic backup rotation
- ✅ Corruption recovery
- ✅ Data validation

## 🚀 Quick Start

### Prerequisites

- Node.js 14+
- WhatsApp account
- Internet connection

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/whatsapp-supplier-bot.git
cd whatsapp-supplier-bot

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start the bot
npm start
```

### First Run

1. Scan QR code with WhatsApp
2. Bot is ready to accept messages!

## 📱 How to Use

### As a Supplier

1. Send any message to the bot
2. Choose option `1` (සැපයුම්කරු)
3. Share your location
4. Select available supplies
5. Done! Your info is now in the database

### As a Requester

1. Send any message to the bot
2. Choose option `2` (ඉල්ලුම්කරු)
3. **Option A:** Share your current location
4. **Option B:** Press `0` to manually select Province → District → City
5. View suppliers and relief officers in your area

## 🗂️ Project Structure

```
whatsapp-supplier-bot/
├── src/
│   ├── messageHandler.js    # Main message routing
│   ├── supplierManager.js   # Supplier CRUD + search
│   ├── officerManager.js    # Officer search
│   ├── responses.js         # Sinhala messages
│   ├── geocoder.js          # Location services
│   └── sessionManager.js    # User state management
├── data/
│   ├── suppliers.json       # User-registered suppliers
│   ├── officers.json        # Government relief officers (299+)
│   └── backups/            # Automatic daily backups
├── cache/                   # Geocoding cache
├── logs/                    # Activity logs
└── scripts/
    └── importExcel.js      # Import officers from Excel
```

## 🔧 Configuration

Edit `.env` file:

```env
CACHE_EXPIRY_HOURS=24
```

## 💾 Data Management

### Backup System

- Automatic daily backups
- 7-day rotation
- Manual backup before Excel imports
- Located in `data/backups/`

### Import Relief Officers

```bash
# Place Excel file in parent directory
# File: District Relief Officers GNs List.xlsx
node scripts/importExcel.js
```

## 🛡️ Safety Features

1. **Atomic Writes** - No data corruption on crashes
2. **Automatic Backups** - Daily backups with 7-day retention
3. **Data Validation** - Strict validation before saving
4. **Corruption Recovery** - Auto-restore from backups
5. **Write Queue** - Prevents concurrent write conflicts

## 📍 Location Features

### Hierarchical Search

1. **City Match** - Exact city match first
2. **District Fallback** - If no city match, show district results
3. **Province Fallback** - If no district match, show province results
4. **All Results** - Last resort, show nationwide

### Manual Selection

Users without GPS can:

1. Select Province (from all available)
2. Select District (filtered by province)
3. Select City/Cities (filtered by district)
4. View combined suppliers + officers

## 🌐 Language

All user-facing messages are in **Sinhala (සිංහල)** for better accessibility to local communities.

## 📈 Statistics

- **299 Government Officers** pre-loaded
- **25+ Districts** covered
- **9 Provinces** nationwide
- **5 Supply Categories** tracked

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 👤 Author

**BuildStart.io**

- WhatsApp Bot for Flood Relief
- Built with ❤️ for Sri Lanka

## 🙏 Acknowledgments

- Government of Sri Lanka for relief officer data
- WhatsApp Web.js library
- OpenStreetMap Nominatim for geocoding

---

**Emergency Contact:** If you need immediate assistance, contact your local Divisional Secretariat or call 117 (Sri Lanka Emergency Services)
