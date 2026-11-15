#!/bin/bash
# ============================================================================
#  Zet de NGINX-config voor rds.kbtg.nl op de server, inclusief het
#  Let's Encrypt-certificaat (de eerste keer interactief via certbot).
#  Het werk op de server doet deploy/nginx/install.sh.
#
#  Gebruik:  ./deploy-nginx.sh                   (server: zie remote.sh)
#            ./deploy-nginx.sh --with-catch-all  (ook catch-all default_server;
#                                               eerste keer, daarna automatisch)
#            REMOTE=root@<host> ./deploy-nginx.sh
# ============================================================================
set -euo pipefail

source "$(dirname "$0")/remote.sh"
DOMAIN=rds.kbtg.nl
EXPECTED_IP=178.104.163.88
REMOTE_DIR=/tmp/rds-nginx

cd "$(dirname "$0")/../nginx"

echo "*************************"
echo "* Check DNS $DOMAIN"
echo "*************************"
# Let's Encrypt kijkt naar de publieke DNS, niet naar je HOSTS-bestand.
if command -v dig >/dev/null; then
    resolved=$(dig +short "$DOMAIN" A @1.1.1.1 | tail -n1)
    if [ "$resolved" != "$EXPECTED_IP" ]; then
        echo "FOUT: $DOMAIN wijst publiek naar '${resolved:-niets}', verwacht $EXPECTED_IP." >&2
        exit 1
    fi
else
    echo "LET OP: dig niet gevonden, DNS-controle overgeslagen." >&2
fi

echo "*************************"
echo "* Copy nginx config to remote"
echo "*************************"
ssh "$REMOTE" "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR"
scp "$DOMAIN.conf" "$DOMAIN.bootstrap.conf" rds-zones.conf catch-all.conf install.sh "$REMOTE:$REMOTE_DIR/"

echo "*************************"
echo "* Install nginx config (+ certificaat)"
echo "*************************"
# -t: certbot kan de eerste keer vragen stellen (e-mail, voorwaarden).
ssh -t "$REMOTE" "bash $REMOTE_DIR/install.sh $*; status=\$?; rm -rf $REMOTE_DIR; exit \$status"

echo "READY!!!"
