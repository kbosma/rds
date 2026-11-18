# Release notes

Per release de nieuwe rechten (authorities): naam, betekenis en of de systeemrollen ze automatisch krijgen. Eigen
rollen krijgen nieuwe rechten nooit vanzelf; het rollenscherm meldt ze als *Nieuw* tot een manager op *Gezien* klikt.
Zie [voorstel-eigen-rollen.md](voorstel-eigen-rollen.md), §7.2.

## 18-11-2026

| Recht | Betekenis | MANAGER | EMPLOYEE |
|---|---|:--:|:--:|
| `PAYMENT_OVERVIEW` | Het overzicht van alle betalingen van de organisatie: menu *Betalingen* en de betaalcijfers op het manager-dashboard. Vereist `PAYMENT_READ`. | ✓ automatisch | – |

**Gevolg voor bestaande rollen.** Menu *Betalingen* vraagt voortaan `PAYMENT_OVERVIEW` in plaats van `PAYMENT_READ`.
EMPLOYEE ziet het menu dus niet meer, maar ziet de betalingen bij een boeking nog wel. Een eigen rol die het overzicht
moet tonen, krijgt het recht pas als een manager het aanvinkt.

## 17-11-2026

| Recht | Betekenis | MANAGER | EMPLOYEE |
|---|---|:--:|:--:|
| `USER_SCOPE_ORGANIZATION` | Personen en accounts van de hele organisatie; zonder dit recht alleen het eigen persoon en account. | ✓ automatisch | – |
| `PLATFORM_ADMIN` | Over organisaties heen werken (alleen de beheerders van RDS Platform; niet uit te delen door klanten). | – | – |
