JSTorrent
=========

https://chrome.google.com/webstore/detail/jstorrent/anhdpjpojoipgpmfanmedjghaligalgb (JSTorrent Available for install Chrome Web Store)

https://chrome.google.com/webstore/detail/bnceafpojmnimbnhamaeedgomdcgnbjk (Helper extension, adds right click "Add to JSTorrent" menu)

---

JSTorrent is the original Chrome Packaged/Platform App for downloading
torrents. It stands for "JavaScript Torrent." It is perfect for cheap
ARM chromebooks when you need to torrent some stuff, but also very
convenient for high end Chromebooks as well.

My goal is to get it nearly as fast as the other clients. The main
bottleneck at this point seems to be SHA1 hashing as well as
suboptimal peer selection. And I can move sha1 hashing to pNaCl or
look into finding a speedier emscripten'ified SHA1.

This software was totally rewritten from scratch (Dec 2013). This is
about the third time I've written a torrent client, so it should be
the least buggy of them all :-)

I'm currently charging $2 for the install on the chrome web store. But you can also run it from source here. I want to do some kind of donate/freemium model, once I can figure out this: http://stackoverflow.com/questions/21147236/get-user-openid-url-without-user-interaction (I want to be able to detect users who already paid $2)

Installation:
====
Most people would usually install by the Chrome Web Store ([https://chrome.google.com/webstore/detail/jstorrent/anhdpjpojoipgpmfanmedjghaligalgb](link)) but you can install from 
source too.
* Click the "Download ZIP" button on the sidebar.
* Unzip it.
* Visit "chrome://extensions"
* Click "load unpacked extension"
* Browse to the unzipped file then press "Open"
* You're done! (Note that you will not get updates this way, you will need to manually update)

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
Option - global upload rate limiting etc
Option - whether to download while machine is idle (screen locked)
Option - show system notifications when torrents complete etc
... etc (this readme is not being kept up to date :-()

Todo
=======
- lots of things...
- figure out why getting so many disk write timeout events
- implement i8n
- pNaCL sha1 hashing
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
