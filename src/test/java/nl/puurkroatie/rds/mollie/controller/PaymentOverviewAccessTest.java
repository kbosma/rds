package nl.puurkroatie.rds.mollie.controller;

import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PAYMENT_OVERVIEW (V28): het overzicht van alle betalingen staat los van de betalingen van één boeking.
 * Maria is EMPLOYEE en Pieter MANAGER (seed); de echte services, geen mocks.
 */
class PaymentOverviewAccessTest extends AbstractControllerTest {

    private static final List<String> OVERVIEW_URLS = List.of(
            "/api/mollie/payments", "/api/booking-mollie-payments", "/api/mollie/payment-status-entries");

    @Autowired
    private JdbcTemplate jdbc;

    private boolean systemRoleHas(String systemKey, String authority) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM system_role_template t "
                + "JOIN authority a ON a.authority_id = t.authority_id WHERE t.system_key = ? AND a.description = ?)",
                Boolean.class, systemKey, authority));
    }

    @Test
    void anEmployee_doesNotSeeTheOverview() throws Exception {
        String token = employeeToken();
        for (String url : OVERVIEW_URLS) {
            mockMvc.perform(get(url).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        }
    }

    @Test
    void anEmployee_stillSeesThePaymentsOfABooking() throws Exception {
        UUID booking = jdbc.queryForObject("SELECT booking_id FROM booking b JOIN account a ON a.tenant_organization = "
                + "b.tenant_organization WHERE a.user_name = 'maria.jansen' LIMIT 1", UUID.class);

        mockMvc.perform(get("/api/booking-mollie-payments/" + booking).header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isOk());
    }

    @Test
    void aManager_seesTheOverview() throws Exception {
        String token = managerToken();
        for (String url : OVERVIEW_URLS) {
            mockMvc.perform(get(url).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        }
    }

    @Test
    void theOverview_isForManagersOnly_andNeedsPaymentRead() {
        assertTrue(systemRoleHas("MANAGER", "PAYMENT_OVERVIEW"));
        assertFalse(systemRoleHas("EMPLOYEE", "PAYMENT_OVERVIEW"));
        assertFalse(systemRoleHas("ADMIN", "PAYMENT_OVERVIEW"));
        assertEquals(List.of("PAYMENT_READ"), jdbc.queryForList("SELECT r.description FROM authority_requires q "
                + "JOIN authority a ON a.authority_id = q.authority_id JOIN authority r ON r.authority_id = q.required_authority_id "
                + "WHERE a.description = 'PAYMENT_OVERVIEW'", String.class));
    }
}
