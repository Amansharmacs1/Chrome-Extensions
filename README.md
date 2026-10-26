# 🚀 Chrome Extensions

**A collection of practical, creative, and developer-friendly Chrome extensions.**

Chrome Extensions is a growing collection of browser tools designed to make everyday browsing more productive, convenient, secure, and enjoyable.

From focused study sessions and personalized new-tab experiences to website design utilities, WebRTC camera magic, and link safety checks, each extension aims to solve a specific real-world problem.

## ✨ Extensions

| Extension | Description | Status |
|---|---|---|
| [**MeetMorph**](./MeetMorph) | Vanish and reappear on Google Meet by switching your outgoing WebRTC webcam feed to an empty room image. | Completed & Tested |
| **FocusFlow** | Improve productivity with focus sessions and distraction management. | Planned |
| **WebNotes** | Take and organize notes directly on websites. | Planned |
| **NewTab Pro** | Turn every new tab into a personalized productivity dashboard. | Planned |
| **ReadEase** | Enjoy a cleaner, distraction-free reading experience. | Planned |
| **ColorPeek** | Pick website colors and copy HEX, RGB, and HSL values. | Planned |
| **FontLens** | Inspect website typography and copy CSS font properties. | Planned |
| **LinkShield** | Check URLs for known threats and suspicious patterns before opening them. | Planned |

*Extension statuses will be updated as each project is implemented and tested.*

## 🎯 Goals

- Build useful browser tools that solve real problems.
- Keep extensions lightweight and easy to use.
- Follow Chrome Extension Manifest V3 where applicable.
- Apply sensible security and privacy practices.
- Document installation, permissions, and usage clearly.
- Welcome ideas, feedback, and community contributions.

## 🛠️ Technology

Depending on the extension, the collection may use:

- JavaScript, HTML, and CSS
- Chrome Extensions API
- Manifest V3
- WebRTC & Canvas APIs
- React and other frontend tools where appropriate
- Browser storage APIs
- Optional third-party APIs for features that need them

Each extension includes its own self-contained directory, documentation, and automated tests.

## 📂 Repository Structure

```text
Chrome-Extensions/
├── README.md
├── .gitignore
├── MeetMorph/
│   ├── manifest.json
│   ├── popup.html / popup.js / popup.css
│   ├── background.js
│   ├── content.js
│   ├── page-bridge.js
│   ├── video-engine.js
│   ├── snap-detector.js
│   ├── permissions.js
│   ├── test-room.html / test-room.js
│   ├── tests/
│   ├── screenshots/
│   └── README.md (Full documentation suite)
└── ...
```

The structure will evolve as the collection grows. Each extension includes its own README, source files, automated tests, and relevant documentation.

## 🚀 Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Amansharmacs1/Chrome-Extensions.git
   ```
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (button in top-left).
5. Select the directory of the extension you want to run (e.g., the `MeetMorph` folder).
6. Follow any extension-specific setup steps outlined in its local README.

## 🔒 Security and Privacy

Security and privacy are core priorities of this collection:

- Request only the minimal permissions required for each extension's functionality.
- Explain data handling, local processing, and camera access transparently.
- Avoid exposing API keys, credentials, or personal information.
- Zero telemetry and zero remote transmission — everything runs locally in-browser.
- Document known limitations and security considerations.

Review each extension's directory for its dedicated `PERMISSIONS.md` and `PRIVACY.md` documentation.

## 🤝 Contributing

Contributions, bug reports, feature ideas, and improvements are welcome:

1. Fork the repository.
2. Create a branch for your changes (`git checkout -b feature/amazing-extension`).
3. Make your changes and test them thoroughly.
4. Submit a pull request with a clear explanation of your additions.

## 🗺️ Roadmap

- [x] Complete, test, and document MeetMorph.
- [ ] Build FocusFlow.
- [ ] Develop WebNotes and NewTab Pro.
- [ ] Add ReadEase, ColorPeek, and FontLens.
- [ ] Develop LinkShield with appropriate threat-intelligence checks.
- [ ] Add screenshots, usage guides, and testing documentation.
- [ ] Improve accessibility, performance, and reliability.

## 📜 License

A license will be added once selected. Until then, standard repository terms apply.

## 👨‍💻 Author

**Aman Sharma**

- GitHub: [@Amansharmacs1](https://github.com/Amansharmacs1)
- Portfolio: [amansharma.space](https://amansharma.space)

---

If you find these projects useful, consider starring the repository ⭐ and sharing feedback or ideas for future extensions!
