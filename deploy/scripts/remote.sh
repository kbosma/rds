# ============================================================================
#  Gedeeld serveradres voor alle deploy-scripts (wordt ge-source't, niet los
#  uitgevoerd). Publieke DNS-naam: geen HOSTS-regel nodig; vertrouwen loopt
#  via je SSH-sleutel en de host key in ~/.ssh/known_hosts.
#
#  Eenmalig overschrijven:  REMOTE=root@<host> ./build-deploy-all.sh
# ============================================================================
REMOTE="${REMOTE:-root@kbtg.nl}"
