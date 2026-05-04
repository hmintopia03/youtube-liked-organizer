# YouTube Liked Video Organizer

A personal tool to organize and understand your YouTube liked videos over time.

## Overview

YouTube liked videos quickly become hard to navigate.  
This app turns your likes into a structured system:

- categorize videos
- search and filter
- view your interests over time (calendar + monthly history)

All data is stored locally in your browser.

---

## Features

- Import YouTube liked videos (JSON / CSV)
- Chrome extension for exporting liked activity
- Category management (add / rename / delete)
- Search, filter, and sort
- Calendar view by date
- Monthly interest history
- Remove videos from your list
- Persistent storage using IndexedDB
- Export / backup your data

---

## How to Use

### 1. Export your YouTube liked videos

1. Open your Google Activity page:
   https://myactivity.google.com/

2. Find your YouTube liked activity

3. Scroll down to load more items

4. Use the Chrome extension:
   → Click "Export visible liked videos"

---

### 2. Import into the app

- Paste JSON into the import area  
  or  
- Use the import button

---

### 3. Organize

- Assign categories
- Filter by category or keyword
- Explore your history via calendar or monthly view

---

## Data & Storage

- Data is stored locally using IndexedDB
- Your data persists across reloads
- No account or backend required

---

## Backup (Important)

Your data is stored locally in your browser.

To avoid losing data:
- Use the Export / Backup feature regularly

---

## Limitations

- Data depends on the YouTube / Google Activity page structure  
- If the page changes, the extractor may need updates  
- Auto-scroll is not used; manual scrolling is recommended for reliability  

---

## Tech Stack

- Vanilla JavaScript
- HTML / CSS
- IndexedDB (for persistence)
- Chrome Extension (for data extraction)

---

## Project Status

Initial version completed.

Future improvements may include:
- UI refinements
- smarter category suggestions
- improved data import UX

---

## Screenshots / GIFs

Current screenshots:

![screenshot](./screenshot1.png)
![screenshot](./screenshot2.png)
![screenshot](./screenshot3.png)

GIF walkthrough placeholder:

