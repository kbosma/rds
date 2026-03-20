package nl.puurkroatie.rds.security;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> ORGANIZATION_ID = new ThreadLocal<>();
    private static final ThreadLocal<UUID> ACCOUNT_ID = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> ROLES = new ThreadLocal<>();

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

    public static void setRoles(Set<String> roles) {
        ROLES.set(Collections.unmodifiableSet(roles));
    }

    public static Set<String> getRoles() {
        Set<String> roles = ROLES.get();
        return roles != null ? roles : Collections.emptySet();
    }

    public static boolean hasRole(String role) {
        return getRoles().contains(role);
    }

    public static void clear() {
        ORGANIZATION_ID.remove();
        ACCOUNT_ID.remove();
        ROLES.remove();
    }
}
