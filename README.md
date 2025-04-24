# TCGPlayer Tracker

A simple and efficient Firefox extension to track cards you want to sell on TCGPlayer. Quickly manage quantities and see the total price of your tracked inventory in one click.

## Features

-   ✅ Right-click on a card to instantly add it to your tracked list.
-   🧮 Calculates total market value based on quantities.
-   🗑️ Easily remove cards or adjust quantities.
-   💾 Data stored locally — your list is saved even after restarting the browser.
-   🎯 Designed specifically for TCGPlayer.

## How to Install (Firefox)

1. Clone or download this repository.
2. Open Firefox and go to `about:debugging`.
3. Click **This Firefox** > **Load Temporary Add-on**.
4. Select the `manifest.json` file in this project directory.

## Folder Structure

```
TCGPlayer-Tracker/
    ├── background/ → background script for context menu logic
    ├── bootstrap/ → Bootstrap CSS and supporting files
    ├── content/ → content script that interacts with TCGPlayer pages
    ├── icons/ → extension toolbar and tab icons
    ├── popup/ → HTML/JS for popup interface
    ├── manifest.json → Extension manifest
    ├── LICENSE → License info
    └── README.md → You're reading this!
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
