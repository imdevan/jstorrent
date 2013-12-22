rm package.zip

zip package.zip -r * -x package.sh -x *.git* -x "*.*~" -x js/*override* -x extension/* -x cws/* -x JS-LOGO*

