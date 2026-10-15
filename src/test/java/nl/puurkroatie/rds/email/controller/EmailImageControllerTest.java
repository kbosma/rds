package nl.puurkroatie.rds.email.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import nl.puurkroatie.rds.email.entity.EmailImage;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Upload (achter login, TEMPLATE_CREATE/UPDATE) en publieke uitlevering (zonder login)
 * van e-mailafbeeldingen. MANAGER heeft TEMPLATE_*, EMPLOYEE alleen TEMPLATE_READ en
 * ADMIN geen van beide.
 */
class EmailImageControllerTest extends AbstractBookingControllerTest {

    /** Een geldige 1x1 PNG. */
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private static MockMultipartFile file(String name, String contentType, byte[] bytes) {
        return new MockMultipartFile("file", name, contentType, bytes);
    }

    @Autowired
    private EmailImageRepository imageRepository;

    @Autowired
    private EmailTemplateRepository templateRepository;

    /** Uploadt de PNG als MANAGER en geeft het antwoord (id, url, ...) terug. */
    private JsonNode uploadAsManager() throws Exception {
        String body = mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    @Test
    void unauthenticated_upload_returns401() throws Exception {
        mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void employee_upload_returns403() throws Exception {
        mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_upload_returns403() throws Exception {
        mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_upload_returns201WithRelativePublicUrl() throws Exception {
        mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andExpect(jsonPath("$.sizeBytes").value(PNG.length))
                .andExpect(jsonPath("$.originalFilename").value("logo.png"))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/api/public/email-images/")));
    }

    @Test
    void manager_uploadNonImage_returns400() throws Exception {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);

        // De client zegt "image/png", maar de bytes zijn HTML: de bytes beslissen.
        mockMvc.perform(multipart("/api/email-images").file(file("evil.png", "image/png", html))
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Unsupported image type")));
    }

    @Test
    void manager_uploadWithoutFilePart_returns400() throws Exception {
        mockMvc.perform(post("/api/email-images")
                        .contentType("multipart/form-data; boundary=x")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isBadRequest());
    }

    // De kern: een ontvanger heeft geen JWT, dus dit pad moet zonder Authorization werken.
    @Test
    void publicGet_withoutAuthentication_returnsTheImageWithCachingAndHardeningHeaders() throws Exception {
        String uploadResponse = mockMvc.perform(multipart("/api/email-images").file(file("logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = objectMapper.readTree(uploadResponse);
        String url = created.get("url").asText();

        byte[] served = mockMvc.perform(get(url)) // bewust géén Authorization-header
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")))
                .andReturn().getResponse().getContentAsByteArray();

        assertArrayEquals(PNG, served);
    }

    @Test
    void publicGet_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/public/email-images/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicGet_notAUuid_returns400() throws Exception {
        mockMvc.perform(get("/api/public/email-images/not-a-uuid"))
                .andExpect(status().isBadRequest());
    }

    // Het publieke pad is alleen voor GET: uploaden zonder login blijft onmogelijk.
    @Test
    void publicPath_doesNotAllowUnauthenticatedWrites() throws Exception {
        int status = mockMvc.perform(post("/api/public/email-images/" + UUID.randomUUID()))
                .andReturn().getResponse().getStatus();

        assertTrue(status == 401 || status == 403 || status == 405,
                "een POST op het publieke pad mag nooit slagen, was: " + status);
    }

    // ----- bibliotheek: lijst -----

    @Test
    void unauthenticated_list_returns401() throws Exception {
        mockMvc.perform(get("/api/email-images")).andExpect(status().isUnauthorized());
    }

    @Test
    void employee_list_returns403() throws Exception {
        mockMvc.perform(get("/api/email-images").header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_list_showsOwnImagesWithoutBytes() throws Exception {
        String id = uploadAsManager().get("emailImageId").asText();

        mockMvc.perform(get("/api/email-images").header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.emailImageId=='" + id + "')].url")
                        .value(org.hamcrest.Matchers.hasItem("/api/public/email-images/" + id)))
                .andExpect(jsonPath("$[?(@.emailImageId=='" + id + "')].inUse")
                        .value(org.hamcrest.Matchers.hasItem(false)))
                // de bytes horen niet in de lijst
                .andExpect(jsonPath("$[0].data").doesNotExist());
    }

    @Test
    void manager_list_doesNotShowAnotherOrganisationsImages() throws Exception {
        UUID foreign = saveImageForOtherOrganisation();

        mockMvc.perform(get("/api/email-images").header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.emailImageId=='" + foreign + "')]").isEmpty());
    }

    // ----- bibliotheek: verwijderen -----

    @Test
    void employee_delete_returns403() throws Exception {
        String id = uploadAsManager().get("emailImageId").asText();

        mockMvc.perform(delete("/api/email-images/" + id).header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_deleteUnusedImage_returns204_andThePublicUrlThenGives404() throws Exception {
        JsonNode created = uploadAsManager();
        String id = created.get("emailImageId").asText();

        mockMvc.perform(delete("/api/email-images/" + id).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(created.get("url").asText())).andExpect(status().isNotFound());
    }

    @Test
    void manager_deleteImageUsedInATemplate_returns409_andTheImageStays() throws Exception {
        String token = managerToken();
        JsonNode created = uploadAsManager();
        String id = created.get("emailImageId").asText();
        String url = created.get("url").asText();

        String template = "{\"name\":\"Met plaatje\",\"subject\":\"S\",\"bodyHtml\":\"<p>x</p><img src=\\\"" + url + "\\\">\"}";
        mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(template))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/email-images/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        // de afbeelding is er nog, en de lijst meldt dat hij in gebruik is
        mockMvc.perform(get(url)).andExpect(status().isOk());
        mockMvc.perform(get("/api/email-images").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[?(@.emailImageId=='" + id + "')].inUse")
                        .value(org.hamcrest.Matchers.hasItem(true)));
    }

    @Test
    void manager_deleteImageOfAnotherOrganisation_returns403_andTheImageStays() throws Exception {
        UUID foreign = saveImageForOtherOrganisation();

        mockMvc.perform(delete("/api/email-images/" + foreign).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/public/email-images/" + foreign)).andExpect(status().isOk());
    }

    @Test
    void manager_deleteUnknownImage_returns404() throws Exception {
        mockMvc.perform(delete("/api/email-images/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void admin_deleteImage_returns403() throws Exception {
        String id = uploadAsManager().get("emailImageId").asText();

        mockMvc.perform(delete("/api/email-images/" + id).header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }


    // ----- afbeeldingen worden niet tussen organisaties gedeeld -----

    private String templateJson(String url) {
        return "{\"name\":\"Met plaatje\",\"subject\":\"S\",\"bodyHtml\":\"<img src=\\\"" + url + "\\\">\"}";
    }

    @Test
    void manager_createTemplateWithAnotherOrganisationsImage_returns400() throws Exception {
        UUID foreign = saveImageForOtherOrganisation();

        mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(templateJson("/api/public/email-images/" + foreign)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not available to your organization")));
    }

    @Test
    void manager_createTemplateWithAnUnknownImage_givesTheSameAnswerAsAForeignOne() throws Exception {
        String token = managerToken();
        UUID foreign = saveImageForOtherOrganisation();

        String foreignMessage = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(templateJson("/api/public/email-images/" + foreign)))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        String unknownMessage = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(templateJson("/api/public/email-images/" + UUID.randomUUID())))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

        // Alleen het (eigen) id in de melding verschilt: er lekt niet of de afbeelding elders bestaat.
        String normalize = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
        assertEquals(objectMapper.readTree(foreignMessage).get("message").asText().replaceAll(normalize, "ID"),
                objectMapper.readTree(unknownMessage).get("message").asText().replaceAll(normalize, "ID"));
    }

    @Test
    void manager_updateTemplateToAnotherOrganisationsImage_returns400() throws Exception {
        String token = managerToken();
        UUID foreign = saveImageForOtherOrganisation();
        String created = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Plain\",\"subject\":\"S\",\"bodyHtml\":\"<p>x</p>\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("emailTemplateId").asText();

        mockMvc.perform(put("/api/email-templates/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(templateJson("/api/public/email-images/" + foreign)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void manager_canDeleteAnImageThatOnlyAnotherOrganisationsTemplateMentions() throws Exception {
        String id = uploadAsManager().get("emailImageId").asText();

        // Een template van Puurkroatie die de afbeelding van TechPartner noemt: via de API kan dat niet
        // meer, maar bestaande of verkeerde data zou het wel kunnen opleveren.
        TenantContext.setOrganizationId(ORG_PUURKROATIE_ID);
        try {
            templateRepository.saveAndFlush(new EmailTemplate("Vreemd", null, "S",
                    "<img src=\"/api/public/email-images/" + id + "\">"));
        } finally {
            TenantContext.clear();
        }

        // De eigenaar (TechPartner) wordt niet door andermans template geblokkeerd.
        mockMvc.perform(delete("/api/email-images/" + id).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isNoContent());
    }

    /** Een afbeelding van Puurkroatie (de MANAGER in deze tests zit bij TechPartner). */
    private UUID saveImageForOtherOrganisation() {
        TenantContext.setOrganizationId(ORG_PUURKROATIE_ID);
        try {
            return imageRepository.saveAndFlush(new EmailImage("andere.png", "image/png", PNG)).getEmailImageId();
        } finally {
            TenantContext.clear();
        }
    }
}
