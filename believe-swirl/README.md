# Believe Swirl

A minute of warm light, and one kind line for today. No account and no tracking. It works offline, and it can be added to an iPhone home screen from Safari: Share, then Add to Home Screen.

The swirl style someone picks is saved only on that device (`localStorage` key `believe-swirl-look`).

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
var CACHE = "bswirl-v2";
```

to:

```javascript
var CACHE = "bswirl-v3";
```

The app never contacts that address on its own. The link is only opened if someone taps it.
