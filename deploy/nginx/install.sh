#!/bin/bash
# ============================================================================
#  Draait OP DE SERVER — aangeroepen door deploy/scripts/deploy-nginx.sh.
#  Plaatst de rate-limit-zones en de site-config voor rds.kbtg.nl en haalt de
#  eerste keer een Let's Encrypt-certificaat op. Idempotent: daarna alleen
#  config bijwerken + reload. Faalt nginx -t, dan wordt de vorige versie
#  teruggezet en blijft nginx draaien op de oude config.
#
#  Optie --with-catch-all: plaatst ook de catch-all default_server (eerste
#  keer). Staat die er al, dan wordt hij altijd bijgewerkt, ook zonder optie.
# ============================================================================
set -euo pipefail

DOMAIN=rds.kbtg.nl
SRC="$(cd "$(dirname "$0")" && pwd)"
SITE_AVAILABLE=/etc/nginx/sites-available/$DOMAIN
SITE_ENABLED=/etc/nginx/sites-enabled/$DOMAIN
CATCH_ALL_AVAILABLE=/etc/nginx/sites-available/00-catch-all
CATCH_ALL_ENABLED=/etc/nginx/sites-enabled/00-catch-all
ZONES=/etc/nginx/conf.d/rds-zones.conf
CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
WEBROOT=/var/www/certbot

WITH_CATCH_ALL=no
for arg in "$@"; do
    case "$arg" in
        --with-catch-all) WITH_CATCH_ALL=yes ;;
        *) echo "FOUT: onbekende optie: $arg" >&2; exit 1 ;;
    esac
done

fail() { echo "FOUT: $*" >&2; exit 1; }

# Kopieer $1 naar $2 (optioneel symlink $3 -> $2), test de nginx-config en
# zet bij een fout de vorige versie terug (of verwijder bestand + symlink als
# er geen vorige was).
install_conf() {
    local src=$1 dst=$2 link=${3:-} backup=""
    if [ -f "$dst" ]; then
        backup=$(mktemp)
        cp "$dst" "$backup"
    fi

    cp "$src" "$dst"
    if [ -n "$link" ]; then
        ln -sfn "$dst" "$link"
    fi

    if ! nginx -t; then
        if [ -n "$backup" ]; then
            cp "$backup" "$dst"
        else
            rm -f "$dst"
            if [ -n "$link" ]; then
                rm -f "$link"
            fi
        fi
        fail "nginx -t faalt met $(basename "$src"); vorige versie van $dst teruggezet."
    fi
    if [ -n "$backup" ]; then
        rm -f "$backup"
    fi
    return 0
}

# Fail fast vóór de catch-all: nginx-versie en geen andere default_server.
check_catch_all_preconditions() {
    local version others
    version=$(nginx -v 2>&1 | sed -E 's#.*nginx/([0-9.]+).*#\1#')
    if [ "$(printf '%s\n%s\n' 1.19.4 "$version" | sort -V | head -n1)" != "1.19.4" ]; then
        fail "catch-all vereist nginx >= 1.19.4 (ssl_reject_handshake); server heeft $version."
    fi

    others=$(grep -lE '^\s*listen\s[^;]*default_server' \
                 /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null \
             | grep -vxF "$CATCH_ALL_ENABLED" || true)
    if [ -n "$others" ]; then
        fail "er staat al een default_server in: $others
       Haal daar 'default_server' weg (of schakel die site uit) en draai opnieuw."
    fi
}

# --- Fail fast -----------------------------------------------------------
command -v nginx   >/dev/null || fail "nginx niet gevonden."
command -v certbot >/dev/null || fail "certbot niet gevonden. Installeer met: apt install certbot"
grep -qE '^\s*include\s+/etc/nginx/conf\.d/\*\.conf;' /etc/nginx/nginx.conf \
    || fail "/etc/nginx/nginx.conf neemt conf.d/*.conf niet op in http{}; rds-zones.conf zou niet geladen worden."

# --- 1. Rate-limit-zones -------------------------------------------------
echo "* Rate-limit-zones -> $ZONES"
install_conf "$SRC/rds-zones.conf" "$ZONES"

# --- 2. Eerste certificaat (alleen als het er nog niet is) ---------------
if [ ! -f "$CERT" ]; then
    echo "* Geen certificaat voor $DOMAIN: bootstrap-config + certbot"
    mkdir -p "$WEBROOT"
    install_conf "$SRC/$DOMAIN.bootstrap.conf" "$SITE_AVAILABLE" "$SITE_ENABLED"
    systemctl reload nginx

    # Interactief bij de eerste keer: certbot vraagt om je e-mailadres en om
    # akkoord met de Let's Encrypt Subscriber Agreement.
    # --deploy-hook wordt bewaard in /etc/letsencrypt/renewal/$DOMAIN.conf en
    # herlaadt nginx na elke automatische vernieuwing.
    certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
        --deploy-hook "systemctl reload nginx"
fi

# --- 3. Echte site-config ------------------------------------------------
echo "* Site-config -> $SITE_AVAILABLE"
install_conf "$SRC/$DOMAIN.conf" "$SITE_AVAILABLE" "$SITE_ENABLED"
systemctl reload nginx

# --- 4. Catch-all (onbekende hostnamen afwijzen) -------------------------
if [ -f "$CATCH_ALL_AVAILABLE" ] || [ "$WITH_CATCH_ALL" = yes ]; then
    echo "* Catch-all -> $CATCH_ALL_AVAILABLE"
    check_catch_all_preconditions
    install_conf "$SRC/catch-all.conf" "$CATCH_ALL_AVAILABLE" "$CATCH_ALL_ENABLED"
    systemctl reload nginx
else
    echo "* Catch-all niet geplaatst (gebruik --with-catch-all)."
fi

# --- 5. Automatisch vernieuwen controleren -------------------------------
if ! systemctl is-enabled --quiet certbot.timer 2>/dev/null; then
    echo "LET OP: certbot.timer staat niet aan; certificaat wordt niet automatisch vernieuwd." >&2
    echo "        Zet aan met: systemctl enable --now certbot.timer" >&2
fi

echo "* Klaar: https://$DOMAIN"
