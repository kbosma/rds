package nl.puurkroatie.rds.bookingstatus.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.bookingstatus.service.BookingStatusEngine;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Statusengine en notificaties: na een betaalstatus (hier als correctie, net als via de webhook) zet het systeem de
 * boeking op voorschot, betaald, op reis of weer thuis, en terug na een terugboeking; bij betaald, op reis, weer
 * thuis en een terugboeking komt er een notificatie. Daarnaast: terugzetten met reden, afronden en de geschiedenis.
 */
class BookingStatusEngineControllerTest extends AbstractBookingControllerTest {

    private static final UUID ACCOMMODATION = UUID.fromString("04000000-0000-0000-0000-000000000004");
    private static final UUID SUPPLIER = UUID.fromString("05000000-0000-0000-0000-000000000003");

    @Autowired
    private BookingMolliePaymentRepository bookingMolliePaymentRepository;
    @Autowired
    private MolliePaymentStatusEntryRepository statusEntryRepository;
    @Autowired
    private BookingStatusEngine engine;

    // ---------- hulpmethodes ----------

    private String confirmedBooking(String token, LocalDate from, LocalDate until) throws Exception {
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"aanvraag\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String bookingId = objectMapper.readTree(body).get("bookingId").asText();
        Map<String, Object> line = Map.of("bookingId", bookingId, "accommodationId", ACCOMMODATION.toString(),
                "supplierId", SUPPLIER.toString(), "fromDate", from.toString(), "untilDate", until.toString(),
                "price", new BigDecimal("2000.00"));
        mockMvc.perform(post("/api/booking-lines").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(line)))
                .andExpect(status().isCreated());
        forceStatus(UUID.fromString(bookingId), "offerte");
        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"offerte\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":true}"))
                .andExpect(status().isOk());
        return bookingId;
    }

    /** De betalingen van het schema, voorschot eerst. */
    private List<MolliePayment> planned(String bookingId) {
        return bookingMolliePaymentRepository.findByBookingBookingId(UUID.fromString(bookingId)).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .filter(p -> p.getPaymentType().name().matches("VOORSCHOT|RESTANT|DEFINITIEF"))
                .sorted(Comparator.comparing(MolliePayment::getPaymentType))
                .toList();
    }

    private void correct(String token, MolliePayment payment, String status) throws Exception {
        mockMvc.perform(post("/api/mollie/payment-status-entries/by-payment/" + payment.getMolliePaymentId())
                        .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"" + status + "\",\"reason\":\"Betaald per bank (test)\"}"))
                .andExpect(status().is2xxSuccessful());
    }

    private String bookingStatus(String token, String bookingId) throws Exception {
        String body = mockMvc.perform(get("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookingStatus").asText();
    }

    private List<String> notificationKinds(String token, String bookingId) throws Exception {
        String body = mockMvc.perform(get("/api/notifications/booking/" + bookingId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> kinds = new ArrayList<>();
        objectMapper.readTree(body).forEach(n -> kinds.add(n.get("kind").asText()));
        return kinds;
    }

    private JsonNode history(String token, String bookingId) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/bookings/" + bookingId + "/status-changes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private void revert(String token, Object bookingId, String target, String reason, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/bookings/" + bookingId + "/status-revert").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetStatus\":\"" + target + "\",\"reason\":\"" + reason + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    // ---------- statusengine ----------

    @Test
    void depositPaid_thenEverythingPaid_movesToVoorschotThenBetaald_withANotification() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = confirmedBooking(token, departure, departure.plusDays(7));
        List<MolliePayment> plan = planned(bookingId);

        correct(token, plan.get(0), "paid");
        assertEquals("voorschot", bookingStatus(token, bookingId));
        assertTrue(notificationKinds(token, bookingId).isEmpty());

        correct(token, plan.get(1), "paid");
        assertEquals("betaald", bookingStatus(token, bookingId));
        assertEquals(List.of("alles_betaald"), notificationKinds(token, bookingId));

        JsonNode latest = history(token, bookingId).get(0);
        assertEquals("voorschot", latest.get("fromStatus").asText());
        assertEquals("betaald", latest.get("toStatus").asText());
        assertTrue(latest.get("automatic").asBoolean());
    }

    @Test
    void aChargeback_movesTheStatusBack_withANotification() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = confirmedBooking(token, departure, departure.plusDays(7));
        List<MolliePayment> plan = planned(bookingId);
        correct(token, plan.get(0), "paid");
        correct(token, plan.get(1), "paid");

        correct(token, plan.get(1), "charged_back");

        assertEquals("voorschot", bookingStatus(token, bookingId));
        assertTrue(notificationKinds(token, bookingId).contains("terugboeking"));
    }

    @Test
    void paidDuringTheTrip_isOpReis_withNotifications() throws Exception {
        String token = managerToken();
        String bookingId = confirmedBooking(token, LocalDate.now().minusDays(1), LocalDate.now().plusDays(6));
        List<MolliePayment> plan = planned(bookingId);
        assertEquals(1, plan.size()); // restanttermijn voorbij: één definitieve betaling

        correct(token, plan.get(0), "paid");

        assertEquals("opreis", bookingStatus(token, bookingId));
        assertTrue(notificationKinds(token, bookingId).containsAll(List.of("alles_betaald", "op_reis")));
    }

    @Test
    void paidAfterTheTrip_isWeerThuis() throws Exception {
        String token = managerToken();
        String bookingId = confirmedBooking(token, LocalDate.now().minusDays(20), LocalDate.now().minusDays(13));

        correct(token, planned(bookingId).get(0), "paid");

        assertEquals("weerthuis", bookingStatus(token, bookingId));
        assertTrue(notificationKinds(token, bookingId).contains("weer_thuis"));
    }

    @Test
    void theEngineCatchesUpWithDates_forTheOrganization() throws Exception {
        String token = managerToken();
        String bookingId = confirmedBooking(token, LocalDate.now().minusDays(20), LocalDate.now().minusDays(13));
        MolliePayment payment = planned(bookingId).get(0);
        // betaald zonder event (zoals een betaling van vóór de engine): pas de engine ziet het
        statusEntryRepository.saveAndFlush(new MolliePaymentStatusEntry(payment, MolliePaymentStatus.PAID, null));
        assertEquals("boeking", bookingStatus(token, bookingId));

        engine.evaluateOrganization(UUID.fromString("a1000000-0000-0000-0000-000000000002"));

        assertEquals("weerthuis", bookingStatus(token, bookingId));
    }

    @Test
    void aSecondEvaluation_doesNotDuplicateNotifications() throws Exception {
        String token = managerToken();
        String bookingId = confirmedBooking(token, LocalDate.now().minusDays(1), LocalDate.now().plusDays(6));
        correct(token, planned(bookingId).get(0), "paid");

        engine.evaluate(UUID.fromString(bookingId));
        engine.evaluateAll();

        List<String> kinds = notificationKinds(token, bookingId);
        assertEquals(kinds.size(), kinds.stream().distinct().count());
    }

    // ---------- notificaties ----------

    @Test
    void anOpenNotification_canBeHandled_andLeavesTheOpenList() throws Exception {
        String token = managerToken();
        String bookingId = confirmedBooking(token, LocalDate.now().plusWeeks(30), LocalDate.now().plusWeeks(31));
        planned(bookingId).forEach(p -> {
            try {
                correct(token, p, "paid");
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        });
        JsonNode open = objectMapper.readTree(mockMvc.perform(get("/api/notifications/open").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String id = null;
        for (JsonNode n : open) {
            if (n.get("bookingId").asText().equals(bookingId)) {
                id = n.get("notificationId").asText();
                assertTrue(n.get("bookingNumber").asText().startsWith("BK-"));
            }
        }
        assertTrue(id != null);

        mockMvc.perform(post("/api/notifications/" + id + "/handle").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handled").value(true))
                .andExpect(jsonPath("$.handledAt").isNotEmpty())
                .andExpect(jsonPath("$.handledByName").isNotEmpty());
        String after = mockMvc.perform(get("/api/notifications/open").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertFalse(after.contains(id));
    }

    @Test
    void notificationsOfAnotherOrganization_areNotVisible() throws Exception {
        mockMvc.perform(get("/api/notifications/booking/" + BOOKING_TP_4).header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_hasNoNotifications() throws Exception {
        mockMvc.perform(get("/api/notifications/open").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    // ---------- terugzetten, afronden, geschiedenis ----------

    @Test
    void employee_canRevertWithReason_whileNothingIsPaid_andTheConfirmationIsUndone() throws Exception {
        String token = employeeToken();
        // BK-2026-002 (Puurkroatie) staat op offerte en zijn betaling is nog open
        revert(token, BOOKING_PK_2, "aanvraag", "Klant wil een andere periode", 200);

        mockMvc.perform(get("/api/bookings/" + BOOKING_PK_2).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.bookingStatus").value("aanvraag"))
                .andExpect(jsonPath("$.quoteConfirmed").value(false));
        JsonNode latest = history(token, BOOKING_PK_2.toString()).get(0);
        assertEquals("Klant wil een andere periode", latest.get("reason").asText());
        assertFalse(latest.get("automatic").asBoolean());
        assertTrue(latest.get("createdByName").asText().length() > 0);
    }

    @Test
    void employee_cannotRevert_onceSomethingIsPaid() throws Exception {
        // BK-2026-001 (Puurkroatie) heeft een betaalde betaling
        forceStatus(BOOKING_PK_1, "boeking");

        revert(employeeToken(), BOOKING_PK_1, "offerte", "Toch nog aanpassen", 403);
    }

    @Test
    void manager_canRevert_evenWhenSomethingIsPaid() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = confirmedBooking(token, departure, departure.plusDays(7));
        correct(token, planned(bookingId).get(0), "paid");

        revert(token, bookingId, "offerte", "Reis wordt opnieuw geoffreerd", 200);

        assertEquals("offerte", bookingStatus(token, bookingId));
    }

    @Test
    void revert_onlyToAnEarlierStatus_andWithAReason() throws Exception {
        String token = managerToken();
        forceStatus(BOOKING_TP_4, "boeking");

        revert(token, BOOKING_TP_4, "boeking", "Dezelfde status", 400);
        revert(token, BOOKING_TP_4, "betaald", "Een latere status", 400);
        revert(token, BOOKING_TP_4, "aanvraag", "kort", 400);
    }

    @Test
    void manager_completesABooking_employeeMayNot() throws Exception {
        mockMvc.perform(post("/api/bookings/" + BOOKING_PK_2 + "/complete").header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());

        String token = managerToken();
        mockMvc.perform(post("/api/bookings/" + BOOKING_TP_4 + "/complete").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Reis geannuleerd door de klant\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("afgerond"));
        assertEquals("Reis geannuleerd door de klant", history(token, BOOKING_TP_4.toString()).get(0).get("reason").asText());

        mockMvc.perform(post("/api/bookings/" + BOOKING_TP_4 + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmingAndSendingTheQuote_appearInTheHistory() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = confirmedBooking(token, departure, departure.plusDays(7));

        JsonNode latest = history(token, bookingId).get(0);
        assertEquals("offerte", latest.get("fromStatus").asText());
        assertEquals("boeking", latest.get("toStatus").asText());
        assertEquals("Offerte bevestigd door de hoofdboeker", latest.get("reason").asText());
    }
}
