# Pro Download Manager

A robust, cross-platform desktop application designed for professional video and playlist downloading. Built with modern web technologies and powered by yt-dlp, it offers a seamless experience for archiving content with high precision and control.

## Overview

Pro Download Manager solves the complexity of command-line download tools by providing a clean, intuitive graphical interface completely integrated with your operating system. It handles single video downloads, complete playlists, and restricted content requiring authentication, all while maintaining high performance and ease of use.

## Key Features

- **Intelligent Analysis**
  Automatically detects video metadata, formats, and playlist structures from a single URL.

- **Playlist Support**
  Download entire playlists or select specific videos. Batch processing allows for efficient bulk downloading with a dedicated management interface.

- **Quality Control**
  Selectable resolutions from 360p up to 4K (2160p), ensuring you get exactly the quality you need.

- **Format Flexibility**
  Option to extract audio-only (MP3) or download full video files (MP4/WebM) with automatic conversion.

- **Cookie Management**
  Built-in cookie extraction for authenticated downloads, enabling access to age-restricted or premium content that requires login.

- **Modern Interface**
  A dark-themed, responsive UI designed for focus and utility using the latest web standards.

## Technology Stack

- **Electron**: Cross-platform desktop runtime
- **React & TypeScript**: Robust, type-safe frontend architecture
- **Vite**: High-performance build tooling
- **Tailwind CSS**: Utility-first styling for a polished design
- **yt-dlp**: Industry-standard media download engine

## ✨ Getting Started

Follow these steps to set up the application on your computer.

### 📋 Prerequisites

You need the following tools installed before running the app:

| Tool | Purpose | Download Link |
| :--- | :--- | :--- |
| **Node.js** | App execution engine | [Download here (v18+)](https://nodejs.org/en/download) |
| **Python** | Download engine requirement | [Download here](https://www.python.org/downloads/) |
| **FFmpeg** | Video/Audio conversion | [Download here](https://ffmpeg.org/download.html) |
| **yt-dlp** | The main downloader | [GitHub Site](https://github.com/yt-dlp/yt-dlp) |

> [!TIP]
> **Mac Users:** If you have [Homebrew](https://brew.sh/) installed, you can just run:
> `brew install python ffmpeg yt-dlp`

---

### 🚀 Installation & Setup

If you are a beginner, follow these exact steps:

1. **Download the project**: Click the green "Code" button and select "Download ZIP", then extract it.
2. **Open Terminal**: 
   - **Mac**: Press `Cmd + Space` and type "Terminal".
   - **Windows**: Search for "PowerShell" or "Command Prompt".
3. **Navigate to the folder**: Drag the extracted folder into the terminal window or use `cd path/to/folder`.
4. **Install parts**: Type this and press Enter (wait for it to finish):
   ```bash
   npm install
   ```
5. **Run the App**: Type this and press Enter:
   ```bash
   npm run dev
   ```

---

### 🛠️ Troubleshooting (FFmpeg)
If the app downloads but fails to convert to MP3, ensure **FFmpeg** is in your system PATH.
- **Windows**: [Follow this guide](https://www.wikihow.com/Install-FFmpeg-on-Windows)
- **Mac**: Use `brew install ffmpeg`

### Building for Production

To create a distributable desktop application:

```bash
npm run build
```

## Usage

1. **Paste URL**: Copy a video or playlist link from YouTube or other supported platforms and paste it into the search bar.
2. **Analyze**: The application will retrieve media information automatically or upon request.
3. **Configure**:
   - **For Single Videos**: Review the metadata and select your preferred format and resolution.
   - **For Playlists**: Use the selection modal to pick specific videos, set a destination folder, and apply batch settings.
4. **Download**: Start the process and monitor progress in real-time with detailed speed and eta indicators.

## Disclaimer

This software is intended for personal archiving and educational purposes. Users are responsible for complying with copyright laws and the terms of service of any content platforms accessed through this application.

### Created by Jeff Monteiro