rm package.zip

zip package.zip -r * js/web-server-chrome/*.js -x js/web-server-chrome/*.png -x package.sh -x *.git* -x "*.*~" -x js/*override* -x extension/* -x extension/cws/* -x cws/* -x JS-LOGO* -x scratch.js -x manifest.json.scratch -x js/web-server-chrome/*.json

