package nl.puurkroatie.rds.auth.controller;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends AbstractAuthControllerTest {

    @Autowired
    private EntityManager entityManager;

    // Test 1: Login succesvol — response bevat token, accountId, organizationId, mustChangePassword=false
    @Test
    void login_success_returnsTokenAndAccountInfo() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"jan.vanbergen\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.accountId").value(ADMIN_ACCOUNT_ID.toString()))
                .andExpect(jsonPath("$.organizationId").value(ORG_PUURKROATIE_ID.toString()))
                .andExpect(jsonPath("$.mustChangePassword").value(false));
    }

    // Test 2: Login met onbekende gebruiker — 401
    @Test
    void login_unknownUser_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"onbekend\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
    }

    // Test 3: Login met fout wachtwoord — 401
    @Test
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"jan.vanbergen\",\"password\":\"foutwachtwoord\"}"))
                .andExpect(status().isUnauthorized());
    }

    // Test 4: Change password door EMPLOYEE — correct huidig wachtwoord → 200
    @Test
    void changePassword_employee_success() throws Exception {
        String token = employeeToken();

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isOk());
    }

    // Test 5: Change password: inloggen met nieuw wachtwoord lukt — na wijziging → 200
    @Test
    void changePassword_loginWithNewPassword_succeeds() throws Exception {
        String token = employeeToken();

        // Clear de persistence context om stale entities te voorkomen na de login
        entityManager.clear();

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isOk());

        // Clear opnieuw zodat de login het nieuwe wachtwoord ziet
        entityManager.flush();
        entityManager.clear();

        // Inloggen met nieuw wachtwoord moet lukken
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"maria.jansen\",\"password\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    // Test 6: Change password: fout huidig wachtwoord — 403
    @Test
    void changePassword_wrongCurrentPassword_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"foutwachtwoord\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isForbidden());
    }

    // Test 7: Change password door ADMIN — 403 (alleen EMPLOYEE)
    @Test
    void changePassword_admin_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isForbidden());
    }

    // Test 8: Change password door MANAGER — 403 (alleen EMPLOYEE)
    @Test
    void changePassword_manager_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isForbidden());
    }

    // Test 9: Change password zonder authenticatie — 401
    @Test
    void changePassword_unauthenticated_returns401() throws Exception {
        mockMvc.perform(put("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"nieuwwachtwoord456\"}"))
                .andExpect(status().isUnauthorized());
    }
}
