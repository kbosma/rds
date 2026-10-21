package nl.puurkroatie.rds.bookerportal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerPortalDocumentControllerTest extends AbstractBookerPortalControllerTest {

    // BK-2026-001 heeft 1 zichtbaar document (07000000-...-001, zonder inhoud); 07000000-...-002 hoort bij een andere boeking
    private static final UUID DOCUMENT_ID = UUID.fromString("07000000-0000-0000-0000-000000000001");
    private static final UUID DOCUMENT_OTHER = UUID.fromString("07000000-0000-0000-0000-000000000002");
    // "%PDF-1.4" in base64
    private static final String PDF_BASE64 = "JVBERi0xLjQ=";

    private String createDocument(String employee, String displayname, boolean withBytes) throws Exception {
        String json = "{\"bookingId\":\"" + BOOKING_ID + "\",\"displayname\":\"" + displayname + "\","
                + "\"mimeType\":\"application/pdf\",\"document\":" + (withBytes ? "\"" + PDF_BASE64 + "\"" : "null") + "}";
        String created = mockMvc.perform(post("/api/documents").header("Authorization", "Bearer " + employee)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).get("documentId").asText();
    }

    private void makeVisible(String employee, String documentId) throws Exception {
        mockMvc.perform(put("/api/documents/" + documentId).header("Authorization", "Bearer " + employee)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"visibleInPortal\":true}"))
                .andExpect(status().isOk());
    }

    // Booker ziet de documenten van de eigen boeking, zonder de bytes en zonder interne velden → 200
    @Test
    void booker_findAll_returnsSlimDocumentsForBooking() throws Exception {
        mockMvc.perform(get("/api/booker-portal/documents").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].documentId").value(DOCUMENT_ID.toString()))
                .andExpect(jsonPath("$[0].displayname").value("Bevestigingsbrief BK-2026-001"))
                .andExpect(jsonPath("$[0].size").value(0))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].document").doesNotExist())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].tenantOrganization").doesNotExist())
                .andExpect(jsonPath("$[0].visibleInPortal").doesNotExist());
    }

    // De lijst toont de grootte van het bestand, het bestand zelf gaat via /content
    @Test
    void booker_findAll_showsTheSizeOfTheFile() throws Exception {
        String portalToken = bookerToken();
        String employee = employeeToken();
        String id = createDocument(employee, "Reisgids.pdf", true);
        makeVisible(employee, id);

        mockMvc.perform(get("/api/booker-portal/documents").header("Authorization", "Bearer " + portalToken))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.documentId == '" + id + "')].size").value(8));
    }

    // Het bestand van een zichtbaar document van de eigen boeking → 200 met de bytes als download
    @Test
    void booker_getContent_returnsTheFileAsADownload() throws Exception {
        String portalToken = bookerToken();
        String employee = employeeToken();
        String id = createDocument(employee, "Reisgids.pdf", true);
        makeVisible(employee, id);

        mockMvc.perform(get("/api/booker-portal/documents/" + id + "/content")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andExpect(header().string("Content-Disposition", containsString("Reisgids.pdf")))
                .andExpect(content().bytes("%PDF-1.4".getBytes()));
    }

    // Een document van een andere boeking is voor de boeker hetzelfde als een document dat niet bestaat → 404
    @Test
    void booker_getContent_otherBookingDocument_returns404() throws Exception {
        mockMvc.perform(get("/api/booker-portal/documents/" + DOCUMENT_OTHER + "/content")
                        .header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isNotFound());
    }

    // Een document dat niet op "zichtbaar in portaal" staat, ziet de boeker niet (lijst en inhoud)
    @Test
    void booker_doesNotSeeADocumentThatIsNotVisibleInThePortal() throws Exception {
        String portalToken = bookerToken();
        String employee = employeeToken();
        String newId = createDocument(employee, "Intern.pdf", true);

        mockMvc.perform(get("/api/booker-portal/documents").header("Authorization", "Bearer " + portalToken))
                .andExpect(jsonPath("$", hasSize(1)));
        mockMvc.perform(get("/api/booker-portal/documents/" + newId + "/content")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isNotFound());

        makeVisible(employee, newId);

        mockMvc.perform(get("/api/booker-portal/documents").header("Authorization", "Bearer " + portalToken))
                .andExpect(jsonPath("$", hasSize(2)));
        mockMvc.perform(get("/api/booker-portal/documents/" + newId + "/content")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isOk());
    }

    // Medewerker-JWT op booker-portal → 403
    @Test
    void employee_accessBookerPortal_returns403() throws Exception {
        mockMvc.perform(get("/api/booker-portal/documents").header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/booker-portal/documents/" + DOCUMENT_ID + "/content")
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    // Geen JWT → 401
    @Test
    void unauthenticated_accessBookerPortal_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-portal/documents")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/booker-portal/documents/" + DOCUMENT_ID + "/content"))
                .andExpect(status().isUnauthorized());
    }
}
