package nl.puurkroatie.rds.auth.security;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> ORGANIZATION_ID = new ThreadLocal<>();
    private static final ThreadLocal<UUID> ACCOUNT_ID = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> AUTHORITIES = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setOrganizationId(UUID organizationId) {
        ORGANIZATION_ID.set(organizationId);
    }

    public static UUID getOrganizationId() {
        return ORGANIZATION_ID.get();
    }

    public static void setAccountId(UUID accountId) {
        ACCOUNT_ID.set(accountId);
    }

    public static UUID getAccountId() {
        return ACCOUNT_ID.get();
    }

    public static void setAuthorities(Set<String> authorities) {
        AUTHORITIES.set(Collections.unmodifiableSet(authorities));
    }

    public static Set<String> getAuthorities() {
        Set<String> authorities = AUTHORITIES.get();
        return authorities != null ? authorities : Collections.emptySet();
    }

    /**
     * Voor de data-scope in services (bijv. {@link Authorities#PLATFORM_ADMIN}). Rolnamen worden bewust niet
     * aangeboden: wat iemand mag, volgt uit zijn authorities, niet uit de naam van zijn rol.
     */
    public static boolean hasAuthority(String authority) {
        return getAuthorities().contains(authority);
    }

    public static void clear() {
        ORGANIZATION_ID.remove();
        ACCOUNT_ID.remove();
        AUTHORITIES.remove();
    }
}
