package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SupplierControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/suppliers — geen SUPPLIER_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/suppliers/{id} — geen SUPPLIER_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/suppliers — alleen suppliers van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationSuppliers() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode suppliers = objectMapper.readTree(response);
        for (JsonNode supplier : suppliers) {
            assert supplier.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see suppliers from own organization";
        }
    }

    // MANAGER: GET /api/suppliers/{id} andere org — 404
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/suppliers — 201
    @Test
    void manager_createSupplier_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"SUP-TEST-001\",\"name\":\"Test Leverancier\"}";

        mockMvc.perform(post("/api/suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Leverancier"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: PUT /api/suppliers/{id} eigen org — 200
    @Test
    void manager_updateSupplier_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"SUP-BH-001\",\"name\":\"Boutique Hotel Zagreb Updated\"}";

        mockMvc.perform(put("/api/suppliers/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Boutique Hotel Zagreb Updated"));
    }

    // MANAGER: PUT /api/suppliers/{id} andere org — 403
    @Test
    void manager_updateSupplier_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"key\":\"SUP-HACK\",\"name\":\"Hacked\"}";

        mockMvc.perform(put("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: DELETE /api/suppliers/{id} andere org — 403
    @Test
    void manager_deleteSupplier_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/suppliers — alleen suppliers van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationSuppliers() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/suppliers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode suppliers = objectMapper.readTree(response);
        for (JsonNode supplier : suppliers) {
            assert supplier.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see suppliers from own organization";
        }
    }

    // EMPLOYEE: GET /api/suppliers/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplierId").value(SUPPLIER_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/suppliers/{id} andere org — 404
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/suppliers/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/suppliers — geen SUPPLIER_CREATE authority → 403
    @Test
    void employee_createSupplier_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"SUP-EMP-001\",\"name\":\"Employee Leverancier\"}";

        mockMvc.perform(post("/api/suppliers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: PUT /api/suppliers/{id} — geen SUPPLIER_UPDATE authority → 403
    @Test
    void employee_updateSupplier_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"SUP-HR-001\",\"name\":\"Hotel Resort Adriatic Updated\"}";

        mockMvc.perform(put("/api/suppliers/" + SUPPLIER_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: PUT /api/suppliers/{id} andere org — 403
    @Test
    void employee_updateSupplier_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"key\":\"SUP-HACK\",\"name\":\"Hacked\"}";

        mockMvc.perform(put("/api/suppliers/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/suppliers/{id} andere org — 403
    @Test
    void employee_deleteSupplier_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/suppliers/" + SUPPLIER_TP_3)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/suppliers — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/suppliers"))
                .andExpect(status().isUnauthorized());
    }
}
