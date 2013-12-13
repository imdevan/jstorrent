JSTorrent
=========

https://chrome.google.com/webstore/detail/jstorrent/anhdpjpojoipgpmfanmedjghaligalgb (Chrome Web Store)

---

This is the rewrite branch! Totally rewritten from scratch. This is
about the third time I've written a torrent client, so it should be
the least buggy of them all :-)


Websites:
----

https://google.com/+jstorrent (Official Google+ Page)

https://twitter.com/jstorrent (Twitter Page)

http://jstorrent.com

Documentation

Special New Features
=======

- Support downloading directly to directory of choice
  - download to external media (usb drives)
  - Per-torrent download directories
  - multiple download directories

Options page
=======

Option - global upload rate limiting etc
Option - whether to download while machine is idle (screen locked)
Option - show system notifications when torrents complete etc
... more options ...

Todo
=======
- see if able to add contextmenu to chromeos
- implement i8n
- use chrome.identity and GCM for remote control (pushMessaging)
- use chrome.socket.getInfo to get host info when connected by host name
- use chrome.system.storage to detect external media, support downloading to external media
- DHT
- uPNP
- bind/listen TCP

Ideas
=======
- disk cache for serving torrent data (seeding)
- use chrome.notifications better, inc. progress events, complete notifications
- run everything in background process, so it can run in background
- dont use any timers, only edge triggered events