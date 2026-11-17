package nl.puurkroatie.rds.auth.service;

import nl.puurkroatie.rds.auth.entity.Role;
import nl.puurkroatie.rds.auth.repository.RoleRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * De vergrendelde systeemrollen. Hun inhoud staat in {@code system_role_template}; elke organisatie heeft een kopie,
 * die de databasefunctie {@code sync_system_roles()} gelijk houdt met het sjabloon (V24).
 */
@Component
public class SystemRoles {

    public static final String ADMIN = "ADMIN";
    public static final String MANAGER = "MANAGER";
    public static final String EMPLOYEE = "EMPLOYEE";

    /** De namen die een eigen rol niet mag krijgen. */
    public static final List<String> NAMES = List.of(ADMIN, MANAGER, EMPLOYEE);

    private final RoleRepository roleRepository;
    private final JdbcTemplate jdbcTemplate;

    public SystemRoles(RoleRepository roleRepository, JdbcTemplate jdbcTemplate) {
        this.roleRepository = roleRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Een nieuwe klantorganisatie krijgt haar kopieën van MANAGER en EMPLOYEE, met de inhoud van het sjabloon. */
    public void createForCustomer(UUID organizationId) {
        for (String key : List.of(MANAGER, EMPLOYEE)) {
            roleRepository.save(new Role(null, key, organizationId, key));
        }
        roleRepository.flush();
        jdbcTemplate.execute("select sync_system_roles()");
    }
}
