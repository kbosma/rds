package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupplierAddressControllerTest extends AbstractBookingControllerTest {

    private static final UUID SUPPLIER_ADDRESS_PK_14 = UUID.fromString("06000000-0000-0000-0000-000000000014");
    private static final UUID SUPPLIER_ADDRESS_TP_16 = UUID.fromString("06000000-0000-0000-0000-000000000016");

    // ADMIN: GET /api/supplier-addresses — geen SUPPLIER_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/supplier-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/supplier-addresses/{supplierId}/{addressId} — geen SUPPLIER_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/supplier-addresses/" + SUPPLIER_PK_1 + "/" + SUPPLIER_ADDRESS_PK_14)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/supplier-addresses — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/supplier-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // MANAGER: GET /api/supplier-addresses/{supId}/{addrId} eigen org — 200
    @Test
    void manager_findById_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/supplier-addresses/" + SUPPLIER_TP_3 + "/" + SUPPLIER_ADDRESS_TP_16)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplierId").value(SUPPLIER_TP_3.toString()));
    }

    // MANAGER: GET /api/supplier-addresses/{supId}/{addrId} andere org — 404 (service filtert op tenant)
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/supplier-addresses/" + SUPPLIER_PK_1 + "/" + SUPPLIER_ADDRESS_PK_14)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/supplier-addresses — 201 (heeft BOOKING_WRITE, binnen eigen org)
    @Test
    void manager_createSupplierAddress_returns201() throws Exception {
        String token = managerToken();

        // Koppel TechPartner supplier 3 aan TechPartner address 11
        String json = "{\"supplierId\":\"" + SUPPLIER_TP_3 + "\",\"addressId\":\"" + ADDRESS_TP_11 + "\"}";

        mockMvc.perform(post("/api/supplier-addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    // MANAGER: DELETE /api/supplier-addresses/{supId}/{addrId} eigen org — 204
    @Test
    void manager_deleteSupplierAddress_ownOrganization_returns204() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/supplier-addresses/" + SUPPLIER_TP_3 + "/" + SUPPLIER_ADDRESS_TP_16)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // EMPLOYEE: GET /api/supplier-addresses — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/supplier-addresses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // EMPLOYEE: GET /api/supplier-addresses/{supId}/{addrId} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/supplier-addresses/" + SUPPLIER_PK_1 + "/" + SUPPLIER_ADDRESS_PK_14)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplierId").value(SUPPLIER_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/supplier-addresses/{supId}/{addrId} andere org — 404 (service filtert op tenant)
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/supplier-addresses/" + SUPPLIER_TP_3 + "/" + SUPPLIER_ADDRESS_TP_16)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/supplier-addresses — geen SUPPLIER_CREATE authority → 403
    @Test
    void employee_createSupplierAddress_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"supplierId\":\"" + SUPPLIER_PK_1 + "\",\"addressId\":\"" + ADDRESS_PK_8 + "\"}";

        mockMvc.perform(post("/api/supplier-addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/supplier-addresses/{supId}/{addrId} — geen SUPPLIER_DELETE authority → 403
    @Test
    void employee_deleteSupplierAddress_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/supplier-addresses/" + SUPPLIER_PK_1 + "/" + SUPPLIER_ADDRESS_PK_14)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/supplier-addresses — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/supplier-addresses"))
                .andExpect(status().isUnauthorized());
    }
}
