package nl.puurkroatie.rds.paymentplan.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.PaymentType;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentStatusEntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Automatische betalingen: bij het bevestigen van de offerte maakt het systeem het betalingsschema aan (voorschot en
 * restant, of één definitieve betaling), koppelt het aan de boeking en stuurt de betaalmail. Verandert het totaal
 * daarna, dan rekent het restant mee zolang het nog niet bij Mollie bestaat.
 */
class PaymentPlanControllerTest extends AbstractBookingControllerTest {

    private static final UUID ACCOMMODATION = UUID.fromString("04000000-0000-0000-0000-000000000004");
    private static final UUID SUPPLIER = UUID.fromString("05000000-0000-0000-0000-000000000003");

    @Autowired
    private BookingMolliePaymentRepository bookingMolliePaymentRepository;
    @Autowired
    private MolliePaymentRepository molliePaymentRepository;
    @Autowired
    private MolliePaymentStatusEntryRepository statusEntryRepository;

    private String createBookingWithLine(String token, LocalDate departure, String price) throws Exception {
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"aanvraag\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String bookingId = objectMapper.readTree(body).get("bookingId").asText();
        addLine(token, bookingId, departure, price);
        return bookingId;
    }

    private String addLine(String token, String bookingId, LocalDate from, String price) throws Exception {
        Map<String, Object> line = Map.of("bookingId", bookingId, "accommodationId", ACCOMMODATION.toString(),
                "supplierId", SUPPLIER.toString(), "fromDate", from.toString(), "untilDate", from.plusDays(7).toString(),
                "price", new BigDecimal(price));
        String body = mockMvc.perform(post("/api/booking-lines").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(line)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookingLineId").asText();
    }

    private void confirm(String token, String bookingId) throws Exception {
        String booking = "{\"bookingStatus\":\"offerte\",\"bookerId\":\"" + BOOKER_TP_4 + "\"";
        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(booking + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(booking + ",\"quoteConfirmed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("boeking"));
    }

    private List<MolliePayment> payments(String bookingId) {
        return bookingMolliePaymentRepository.findByBookingBookingId(UUID.fromString(bookingId)).stream()
                .map(BookingMolliePayment::getMolliePayment)
                .sorted(Comparator.comparing(MolliePayment::getPaymentType))
                .toList();
    }

    private void choosePaymentMail(String token, String subject, String body) throws Exception {
        String created = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Betaalmail", "subject", subject, "bodyHtml", body))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Map<String, Object> settings = new HashMap<>();
        settings.put("depositPercentage", 30);
        settings.put("depositWeeksBeforeDeparture", 12);
        settings.put("balanceWeeksBeforeDeparture", 6);
        settings.put("paymentEmailTemplateId", objectMapper.readTree(created).get("emailTemplateId").asText());
        mockMvc.perform(put("/api/organization-settings/mine").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(settings)))
                .andExpect(status().isOk());
    }

    @Test
    void confirmingFarAhead_createsDepositAndBalance_withTheirTerms() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = createBookingWithLine(token, departure, "2000.00");

        confirm(token, bookingId);

        List<MolliePayment> payments = payments(bookingId);
        assertEquals(2, payments.size());
        MolliePayment deposit = payments.get(0);
        MolliePayment balance = payments.get(1);
        assertEquals(PaymentType.VOORSCHOT, deposit.getPaymentType());
        assertEquals(0, new BigDecimal("600.00").compareTo(deposit.getAmount()));
        assertEquals(departure.minusWeeks(12), deposit.getDueDate());
        assertEquals(PaymentType.RESTANT, balance.getPaymentType());
        assertEquals(0, new BigDecimal("1400.00").compareTo(balance.getAmount()));
        assertEquals(departure.minusWeeks(6), balance.getDueDate());
        assertTrue(deposit.getDescription().startsWith("Voorschot BK-"));
        // elke betaling begint met de status OPEN en staat nog niet bij Mollie
        for (MolliePayment p : payments) {
            assertEquals(1, statusEntryRepository.findByMolliePaymentMolliePaymentId(p.getMolliePaymentId()).size());
            assertTrue(!p.isAtMollie());
        }
    }

    @Test
    void confirmingWhenTheBalanceTermHasPassed_createsOneFinalPayment_dueToday() throws Exception {
        String token = managerToken();
        String bookingId = createBookingWithLine(token, LocalDate.now().plusWeeks(3), "950.00");

        confirm(token, bookingId);

        List<MolliePayment> payments = payments(bookingId);
        assertEquals(1, payments.size());
        assertEquals(PaymentType.DEFINITIEF, payments.get(0).getPaymentType());
        assertEquals(0, new BigDecimal("950.00").compareTo(payments.get(0).getAmount()));
        assertEquals(LocalDate.now(), payments.get(0).getDueDate());
    }

    @Test
    void anExistingManualPayment_staysOverig_andNextToThePlan() throws Exception {
        String token = managerToken();
        // BK-2026-004 heeft al een (handmatige) betaling uit de seed en een verblijf in juli 2026
        confirm(token, BOOKING_TP_4.toString());

        List<MolliePayment> payments = payments(BOOKING_TP_4.toString());
        assertEquals(List.of(PaymentType.DEFINITIEF, PaymentType.OVERIG), payments.stream().map(MolliePayment::getPaymentType).toList());
    }

    @Test
    void confirmingWithoutAStay_returns400_andCreatesNothing() throws Exception {
        String token = managerToken();
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"aanvraag\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String bookingId = objectMapper.readTree(body).get("bookingId").asText();
        String booking = "{\"bookingStatus\":\"offerte\",\"bookerId\":\"" + BOOKER_TP_4 + "\"";
        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(booking + "}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(booking + ",\"quoteConfirmed\":true}"))
                .andExpect(status().isBadRequest());

        assertTrue(payments(bookingId).isEmpty());
    }

    @Test
    void aHigherTotalAfterConfirmation_raisesTheBalance_notTheDeposit() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = createBookingWithLine(token, departure, "2000.00");
        confirm(token, bookingId);

        addLine(token, bookingId, departure.plusDays(7), "500.00");

        List<MolliePayment> payments = payments(bookingId);
        assertEquals(0, new BigDecimal("600.00").compareTo(payments.get(0).getAmount()));
        assertEquals(0, new BigDecimal("1900.00").compareTo(payments.get(1).getAmount()));
    }

    @Test
    void aBalanceThatExistsAtMollie_isNotRecalculated() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = createBookingWithLine(token, departure, "2000.00");
        confirm(token, bookingId);
        MolliePayment balance = payments(bookingId).get(1);
        molliePaymentRepository.saveAndFlush(balance.withMollieReference("tr_test123", "https://example.com/checkout"));

        addLine(token, bookingId, departure.plusDays(7), "500.00");

        assertEquals(0, new BigDecimal("1400.00").compareTo(payments(bookingId).get(1).getAmount()));
    }

    @Test
    void theMainBookerGetsThePaymentMail_withThePaymentsAsVariables() throws Exception {
        String token = managerToken();
        choosePaymentMail(token, "Betalingen ${booking.bookingNumber}",
                "<p>Totaal ${booking.totalSum?string(\"0.00\")}</p>"
                        + "<table data-repeat=\"booking.payments\" data-item=\"p\"><tbody>"
                        + "<tr><th>Soort</th><th>Bedrag</th><th>Uiterlijk</th></tr>"
                        + "<tr><td>${p.paymentType}</td><td>${p.amount?string(\"0.00\")}</td><td>${p.dueDate}</td></tr>"
                        + "</tbody></table>");
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = createBookingWithLine(token, departure, "2000.00");

        confirm(token, bookingId);

        String body = mockMvc.perform(get("/api/sent-emails/booking/" + bookingId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode mails = objectMapper.readTree(body);
        assertEquals(1, mails.size());
        String html = mails.get(0).get("bodyHtml").asText();
        assertTrue(html.contains("Totaal 2000,00"), html);
        assertTrue(html.contains("voorschot") && html.contains("600,00") && html.contains(departure.minusWeeks(12).toString()), html);
        assertTrue(html.contains("restant") && html.contains("1400,00") && html.contains(departure.minusWeeks(6).toString()), html);
    }

    @Test
    void withoutAPaymentMail_thePaymentsAreStillCreated_withoutAMail() throws Exception {
        String token = managerToken();
        String bookingId = createBookingWithLine(token, LocalDate.now().plusWeeks(30), "2000.00");

        confirm(token, bookingId);

        assertEquals(2, payments(bookingId).size());
        mockMvc.perform(get("/api/sent-emails/booking/" + bookingId).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void thePaymentShowsItsTypeAndDueDate_inTheApi() throws Exception {
        String token = managerToken();
        LocalDate departure = LocalDate.now().plusWeeks(30);
        String bookingId = createBookingWithLine(token, departure, "2000.00");
        confirm(token, bookingId);
        MolliePayment deposit = payments(bookingId).get(0);

        mockMvc.perform(get("/api/mollie/payments/" + deposit.getMolliePaymentId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentType").value("voorschot"))
                .andExpect(jsonPath("$.dueDate").value(departure.minusWeeks(12).toString()));
    }
}
