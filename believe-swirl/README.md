# Believe Swirl

A minute of warm light, and one kind line for today. No account and no tracking. It works offline, and it can be added to an iPhone home screen from Safari: Share, then Add to Home Screen.

The swirl style someone picks is saved only on that device (`localStorage` key `believe-swirl-look`). On an iPhone, Safari shows a short Home Screen hint once; closing it is remembered on that device (`believe-swirl-install-hint`).

Her own lines live only on that phone (`believe-swirl-words`). The opening-sound choice is `believe-swirl-chime`. Her birthday, month and day only, is `believe-swirl-birthday`. None of these are in this repo, and the page never sends them anywhere.

## My words

The pencil button opens a page where she can add, edit, reorder, and remove lines. One of those lines shows each day, in order, and then they start over. If the list is empty, a built-in line shows instead.

**Copy my words** puts the lines on the clipboard, one per line. The same text sits in the box underneath, so she can select it if copying does not work. To bring them back, paste into **Paste words here** and tap **Replace with pasted words**.

## Opening sound

A soft chime plays on the tap that starts a minute. It is a local audio file, so an iPhone’s silent switch can quiet it. The ♪ button is a separate soft hum. In My words, **Opening sound is on** turns the chime off, and that choice stays on the phone.

The file is `sounds/open.m4a` in this folder. To use a personal recording later (a voice, a bell, or a few notes of a song):

1. Replace `sounds/open.m4a` with the new clip. Keep that exact file name. About two seconds is a good length.
2. Open `sw.js` and bump the cache name so phones that already installed the app pick up the new sound. See the steps under the support link below.

The page does not download audio from anywhere else. If the file is missing, the minute still starts, just without the chime.

## Birthday swirl

Do not put Jennifer's birthday in this repo. She chooses the month and day under **Your birthday** in My words. That day, the swirl turns golden and rose, with a few soft sparkles, and the line is "Happy Birthday, Jennifer." A February 29 birthday shows on February 28 in a year that is not a leap year.

To preview it without setting a date, open the page with `?preview=birthday` on the end of the address, for example `https://tigerwillca.github.io/believe-swirl/?preview=birthday`. That does not save a birthday.

## Paste Jennifer's support link

Jennifer does not have a tip account yet, so the page does not show a support link.

When she has one (Venmo, Ko-fi, PayPal, or similar):

1. Open `app.js` in this folder.
2. Near the top, find this exact line:

```javascript
var TIP_URL = "";
```

3. Paste her full link between the quotes, including `https://`.

```javascript
var TIP_URL = "https://example.com/her-link";
```

Replace `https://example.com/her-link` with her real page. Leave the quotes empty (`""`) and the “♡ Support Jennifer” link is not added to the page at all.

4. Open `sw.js` and bump the cache name so phones that already installed the app pick up the change. For example, change:

```javascript
var CACHE = "bswirl-v4";
```

to:

```javascript
var CACHE = "bswirl-v5";
```

The app never contacts that address on its own. The link is only opened if someone taps it.
