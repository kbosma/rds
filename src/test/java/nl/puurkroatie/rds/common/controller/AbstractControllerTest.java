package nl.puurkroatie.rds.common.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public abstract class AbstractControllerTest {

    // Organization UUIDs uit data.sql
    protected static final UUID ORG_PUURKROATIE_ID = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    protected static final UUID ORG_TECHPARTNER_ID = UUID.fromString("a1000000-0000-0000-0000-000000000002");

    protected static final String DEFAULT_PASSWORD = "password123";

    @Autowired
    protected MockMvc mockMvc;

    protected final ObjectMapper objectMapper = new ObjectMapper();

    protected String loginAndGetToken(String userName, String password) throws Exception {
        String loginJson = objectMapper.writeValueAsString(
                new java.util.LinkedHashMap<>() {{
                    put("userName", userName);
                    put("password", password);
                }});

        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }

    protected String adminToken() throws Exception {
        return loginAndGetToken("jan.vanbergen", DEFAULT_PASSWORD);
    }

    protected String employeeToken() throws Exception {
        return loginAndGetToken("maria.jansen", DEFAULT_PASSWORD);
    }

    protected String managerToken() throws Exception {
        return loginAndGetToken("pieter.degroot", DEFAULT_PASSWORD);
    }
}
