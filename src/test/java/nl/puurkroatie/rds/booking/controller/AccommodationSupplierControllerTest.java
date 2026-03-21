package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccommodationSupplierControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/accommodation-suppliers — alle koppelingen (>= 6)
    @Test
    void admin_findAll_returnsAllAccommodationSuppliers() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accommodation-suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
    }

    // ADMIN: GET /api/accommodation-suppliers/{accommodationId}/{supplierId} — specifieke koppeling
    @Test
    void admin_findById_returnsAccommodationSupplier() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accommodation-suppliers/" + ACCOMMODATION_PK_1 + "/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accommodationId").value(ACCOMMODATION_PK_1.toString()))
                .andExpect(jsonPath("$.supplierId").value(SUPPLIER_PK_1.toString()));
    }

    // MANAGER: GET /api/accommodation-suppliers — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/accommodation-suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // MANAGER: GET /api/accommodation-suppliers/{accId}/{supId} eigen org — 200
    @Test
    void manager_findById_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/accommodation-suppliers/" + ACCOMMODATION_TP_4 + "/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accommodationId").value(ACCOMMODATION_TP_4.toString()));
    }

    // MANAGER: GET /api/accommodation-suppliers/{accId}/{supId} andere org — 404 (service filtert op tenant)
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/accommodation-suppliers/" + ACCOMMODATION_PK_1 + "/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/accommodation-suppliers — 201 (heeft BOOKING_WRITE, binnen eigen org)
    @Test
    void manager_createAccommodationSupplier_returns201() throws Exception {
        String token = managerToken();

        // Koppel TechPartner accommodation 5 aan TechPartner supplier 3
        String json = "{\"accommodationId\":\"04000000-0000-0000-0000-000000000005\"," +
                "\"supplierId\":\"" + SUPPLIER_TP_3 + "\"}";

        mockMvc.perform(post("/api/accommodation-suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    // MANAGER: DELETE /api/accommodation-suppliers/{accId}/{supId} eigen org — 204
    @Test
    void manager_deleteAccommodationSupplier_ownOrganization_returns204() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/accommodation-suppliers/" + ACCOMMODATION_TP_4 + "/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // EMPLOYEE: GET /api/accommodation-suppliers — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accommodation-suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // EMPLOYEE: GET /api/accommodation-suppliers/{accId}/{supId} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accommodation-suppliers/" + ACCOMMODATION_PK_1 + "/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accommodationId").value(ACCOMMODATION_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/accommodation-suppliers/{accId}/{supId} andere org — 404 (service filtert op tenant)
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accommodation-suppliers/" + ACCOMMODATION_TP_4 + "/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/accommodation-suppliers — 201 (heeft BOOKING_WRITE, binnen eigen org)
    @Test
    void employee_createAccommodationSupplier_returns201() throws Exception {
        String token = employeeToken();

        // Koppel Puurkroatie accommodation 2 aan Puurkroatie supplier 2
        String json = "{\"accommodationId\":\"04000000-0000-0000-0000-000000000002\"," +
                "\"supplierId\":\"05000000-0000-0000-0000-000000000002\"}";

        mockMvc.perform(post("/api/accommodation-suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    // EMPLOYEE: DELETE /api/accommodation-suppliers/{accId}/{supId} eigen org — 204
    @Test
    void employee_deleteAccommodationSupplier_ownOrganization_returns204() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/accommodation-suppliers/" + ACCOMMODATION_PK_1 + "/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // Ongeauthenticeerd: GET /api/accommodation-suppliers — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/accommodation-suppliers"))
                .andExpect(status().isUnauthorized());
    }
}
