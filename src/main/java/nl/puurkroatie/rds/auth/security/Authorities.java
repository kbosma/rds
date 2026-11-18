package nl.puurkroatie.rds.auth.security;

/**
 * Authorities die de services zelf controleren voor de data-scope (welke gegevens iemand ziet), naast de
 * {@code @PreAuthorize}-controles op de endpoints. De services kijken nooit naar rolnamen; zie
 * docs/voorstel-eigen-rollen.md, §5.
 */
public final class Authorities {

    /** Over organisaties heen werken (beheerders van het platform). */
    public static final String PLATFORM_ADMIN = "PLATFORM_ADMIN";

    /** Personen en accounts van de hele organisatie; zonder deze authority alleen het eigen persoon en account. */
    public static final String USER_SCOPE_ORGANIZATION = "USER_SCOPE_ORGANIZATION";

    /** Een rol hernoemen. Ook als endpoint-recht; de service controleert het apart als een wijziging meer doet. */
    public static final String ROLE_UPDATE = "ROLE_UPDATE";

    /** Rechten aan een rol geven, en afnemen (zie {@code RoleAuthorityService#replaceAuthorities}). */
    public static final String ROLEAUTHORITY_CREATE = "ROLEAUTHORITY_CREATE";
    public static final String ROLEAUTHORITY_DELETE = "ROLEAUTHORITY_DELETE";

    private Authorities() {
    }
}
