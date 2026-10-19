package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.email.entity.EmailImage;
import nl.puurkroatie.rds.email.repository.EmailImageRepository;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * DOCX-templates uit de editor: HTML in, echt .docx uit (dat daarna gewoon gegenereerd en gedownload kan worden).
 */
class DocumentTemplateEditorControllerTest extends AbstractBookingControllerTest {

    /** Een geldige 1x1 PNG. */
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    @Autowired
    private EmailImageRepository imageRepository;

    private String json(Map<String, Object> fields) throws Exception {
        return objectMapper.writeValueAsString(fields);
    }

    private JsonNode createFromEditor(String name, String html) throws Exception {
        String body = mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "sourceHtml", html))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private byte[] download(String id) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/document-templates/" + id + "/content")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getContentAsByteArray();
    }

    @Test
    void manager_createFromEditor_buildsARealDocx_andKeepsTheHtml() throws Exception {
        JsonNode created = createFromEditor("Offerte", "<p>Boeking ${booking.bookingNumber}</p>");

        assertEquals("<p>Boeking ${booking.bookingNumber}</p>", created.get("sourceHtml").asText());
        assertTrue(created.get("templateData").asText().length() > 100, "het .docx is gebouwd");

        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(download(created.get("documentTemplateId").asText())))) {
            assertEquals("Boeking ${booking.bookingNumber}", docx.getParagraphs().get(0).getText());
        }
    }

    @Test
    void manager_generateWithVisibleInPortal_marksTheDocumentVisible() throws Exception {
        JsonNode created = createFromEditor("Bevestiging", "<h1>Boeking ${booking.bookingNumber}</h1>");

        mockMvc.perform(post("/api/documents/generate")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("templateId", created.get("documentTemplateId").asText(),
                                "bookingId", BOOKING_TP_4.toString(), "outputFormat", "pdf", "visibleInPortal", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.visibleInPortal").value(true));
    }

    @Test
    void manager_aTemplateFromTheEditor_canBeUsedToGenerateADocument() throws Exception {
        JsonNode created = createFromEditor("Bevestiging", "<h1>Boeking ${booking.bookingNumber}</h1>"
                + "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><th>Voornaam</th></tr><tr><td>${t.firstname}</td></tr></tbody></table>");

        String body = mockMvc.perform(post("/api/documents/generate")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("templateId", created.get("documentTemplateId").asText(),
                                "bookingId", BOOKING_TP_4.toString(), "outputFormat", "docx"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        assertEquals(false, objectMapper.readTree(body).get("visibleInPortal").asBoolean()); // standaard niet in het portaal
        String documentId = objectMapper.readTree(body).get("documentId").asText();
        byte[] generated = mockMvc.perform(get("/api/documents/" + documentId + "/content")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(generated))) {
            String text = new org.apache.poi.xwpf.extractor.XWPFWordExtractor(docx).getText();
            assertFalse(text.contains("${"), text);
            assertTrue(text.contains("Boeking "), text);
        }
    }

    @Test
    void manager_aTemplateFromTheEditor_canAlsoBeGeneratedAsPdf() throws Exception {
        JsonNode created = createFromEditor("Als PDF", "<p>Boeking ${booking.bookingNumber}</p>");

        mockMvc.perform(post("/api/documents/generate")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("templateId", created.get("documentTemplateId").asText(),
                                "bookingId", BOOKING_TP_4.toString(), "outputFormat", "pdf"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mimeType").value("application/pdf"));
    }

    @Test
    void manager_updateFromEditor_rebuildsTheDocx() throws Exception {
        String id = createFromEditor("Brief", "<p>eerste</p>").get("documentTemplateId").asText();

        mockMvc.perform(put("/api/document-templates/" + id)
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Brief", "sourceHtml", "<p>tweede</p>"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceHtml").value("<p>tweede</p>"));

        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(download(id)))) {
            assertEquals("tweede", docx.getParagraphs().get(0).getText());
        }
    }

    @Test
    void manager_renameOnly_keepsTheEditorTemplateIntact() throws Exception {
        String id = createFromEditor("Brief", "<p>inhoud</p>").get("documentTemplateId").asText();

        mockMvc.perform(put("/api/document-templates/" + id)
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Nieuwe naam"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nieuwe naam"))
                .andExpect(jsonPath("$.sourceHtml").value("<p>inhoud</p>"));

        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(download(id)))) {
            assertEquals("inhoud", docx.getParagraphs().get(0).getText());
        }
    }

    @Test
    void manager_uploadingOverAnEditorTemplate_dropsTheSourceHtml() throws Exception {
        String id = createFromEditor("Brief", "<p>inhoud</p>").get("documentTemplateId").asText();
        byte[] replacement = download(createFromEditor("Ander", "<p>geuploade versie</p>").get("documentTemplateId").asText());

        mockMvc.perform(put("/api/document-templates/" + id)
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Brief", "templateData", replacement))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceHtml").doesNotExist());
    }

    @Test
    void manager_uploadedTemplate_hasNoSourceHtml() throws Exception {
        byte[] bytes = download(createFromEditor("Bron", "<p>x</p>").get("documentTemplateId").asText());

        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Upload", "templateData", bytes))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceHtml").doesNotExist());
    }

    // ----- afbeeldingen uit de gedeelde bibliotheek -----

    private String uploadImageAsManager() throws Exception {
        String body = mockMvc.perform(multipart("/api/email-images")
                        .file(new MockMultipartFile("file", "logo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("url").asText();
    }

    @Test
    void manager_anImageFromTheLibrary_isEmbeddedInTheDocx() throws Exception {
        String url = uploadImageAsManager();

        String id = createFromEditor("Met logo", "<p><img src=\"" + url + "\" alt=\"logo\"></p>")
                .get("documentTemplateId").asText();

        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(download(id)))) {
            assertEquals(1, docx.getAllPictures().size());
        }
    }

    @Test
    void manager_anImageUsedInAWordTemplate_cannotBeDeleted_andIsFlaggedInUse() throws Exception {
        String url = uploadImageAsManager();
        String imageId = url.substring(url.lastIndexOf('/') + 1);
        createFromEditor("Met logo", "<p><img src=\"" + url + "\"></p>");

        mockMvc.perform(get("/api/email-images").header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.emailImageId=='" + imageId + "')].inUse").value(true));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/email-images/" + imageId)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isConflict());
    }

    @Test
    void manager_anImageOfAnotherOrganisation_isRefused() throws Exception {
        UUID foreign;
        TenantContext.setOrganizationId(ORG_PUURKROATIE_ID);
        try {
            foreign = imageRepository.saveAndFlush(new EmailImage("andere.png", "image/png", PNG)).getEmailImageId();
        } finally {
            TenantContext.clear();
        }

        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Dief", "sourceHtml",
                                "<p><img src=\"/api/public/email-images/" + foreign + "\"></p>"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not available to your organization")));
    }

    @Test
    void manager_anExternalImage_isRefusedAndNeverFetched() throws Exception {
        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Extern", "sourceHtml",
                                "<p><img src=\"http://169.254.169.254/latest/meta-data/\"></p>"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("not from the image library")));
    }

    @Test
    void manager_anInvalidRepeatedTable_isRefused() throws Exception {
        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Kwaad", "sourceHtml",
                                "<table data-repeat=\"a as x><#assign y=1><#list a\"><tbody><tr><td>x</td></tr></tbody></table>"))))
                .andExpect(status().isBadRequest());
    }

    // ----- rechten -----

    @Test
    void employee_createFromEditor_returns403() throws Exception {
        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + employeeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Nee", "sourceHtml", "<p>x</p>"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_createFromEditor_returns403() throws Exception {
        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Nee", "sourceHtml", "<p>x</p>"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_aHugeSourceHtml_isRefusedAtTheBoundary() throws Exception {
        String html = "<p>" + "x".repeat(500_001) + "</p>";

        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "Groot", "sourceHtml", html))))
                .andExpect(status().isBadRequest());
    }
}
