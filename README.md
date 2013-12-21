JSTorrent
=========

https://chrome.google.com/webstore/detail/jstorrent/anhdpjpojoipgpmfanmedjghaligalgb (JSTorrent Available for install Chrome Web Store)

https://chrome.google.com/webstore/detail/bnceafpojmnimbnhamaeedgomdcgnbjk (Helper extension, adds right click "Add to JSTorrent" menu)

---

JSTorrent is the original Chrome Packaged/Platform App for downloading
torrents. It stands for "JavaScript Torrent." It is perfect for cheap
ARM chromebooks when you need to torrent some stuff, but also very
convenient for high end Chromebooks as well.

This software was totally rewritten from scratch (Dec 2013). This is
about the third time I've written a torrent client, so it should be
the least buggy of them all :-)

Websites:
----

https://google.com/+jstorrent (Official Google+ Community Page)

https://twitter.com/jstorrent (Twitter Page)

http://jstorrent.com

Documentation
(to come)

Special New Features
=======

- Support downloading directly to directory of choice
  - download to external media (usb drives)
  - Per-torrent download directories
  - multiple download directories
- Unlimited size downloads (multi gigabyte torrents)


Options page
=======
TODO - implement options :-)
Option - global upload rate limiting etc
Option - whether to download while machine is idle (screen locked)
Option - show system notifications when torrents complete etc
... more options ...

Todo
=======
- lots of things...
- figure out why getting so many disk write timeout events
- implement i8n
- use chrome.identity and GCM for remote control (pushMessaging)
- use chrome.socket.getInfo to get host info when connected by host name
- use chrome.system.power to add option to prevent standby mode
- use chrome.system.storage to detect external media detach/attach events
- DHT
- uPNP
- bind/listen TCP

Ideas
=======
- disk cache for serving torrent data (seeding)
- run everything in background process, so it can run in background
- dont use any timers, only edge triggered events

Credits
=======
- JSTorrent Logo - Michael Cook (https://plus.google.com/+michaelcook)
- Users and supporters that produce good bug reports :-)