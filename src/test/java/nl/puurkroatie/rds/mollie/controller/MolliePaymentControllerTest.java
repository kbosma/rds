package nl.puurkroatie.rds.mollie.controller;

import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.dto.PaymentRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentResponseDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusRequestDto;
import nl.puurkroatie.rds.mollie.dto.PaymentStatusResponseDto;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentMethod;
import nl.puurkroatie.rds.mollie.service.MollieService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MolliePaymentControllerTest extends AbstractControllerTest {

    private static final UUID PAYMENT_ID = UUID.fromString("cc000000-0000-0000-0000-000000000001");
    private static final String MOLLIE_EXTERNAL_ID = "tr_test123";
    private static final String STATUS_OPEN = "open";
    private static final String STATUS_PAID = "paid";

    @MockitoBean
    private MollieService mollieService;

    private MolliePaymentDto samplePaymentDto() {
        return new MolliePaymentDto(
                PAYMENT_ID,
                MOLLIE_EXTERNAL_ID,
                STATUS_OPEN,
                MolliePaymentMethod.IDEAL,
                new BigDecimal("125.00"),
                "EUR",
                "Boeking BK-2026-001",
                "https://www.mollie.com/checkout/test",
                null, null, null, null,
                ORG_PUURKROATIE_ID
        );
    }

    // === CRUD: GET /api/mollie/payments ===

    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();
        when(mollieService.findAll()).thenReturn(List.of(samplePaymentDto()));

        mockMvc.perform(get("/api/mollie/payments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].molliePaymentId").value(PAYMENT_ID.toString()))
                .andExpect(jsonPath("$[0].molliePaymentExternalId").value(MOLLIE_EXTERNAL_ID));
    }

    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();
        when(mollieService.findAll()).thenReturn(List.of(samplePaymentDto()));

        mockMvc.perform(get("/api/mollie/payments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/mollie/payments"))
                .andExpect(status().isUnauthorized());
    }

    // === CRUD: GET /api/mollie/payments/{id} ===

    @Test
    void admin_findById_returns200() throws Exception {
        String token = adminToken();
        when(mollieService.findById(PAYMENT_ID)).thenReturn(Optional.of(samplePaymentDto()));

        mockMvc.perform(get("/api/mollie/payments/" + PAYMENT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.molliePaymentId").value(PAYMENT_ID.toString()))
                .andExpect(jsonPath("$.status").value(STATUS_OPEN))
                .andExpect(jsonPath("$.method").value("ideal"))
                .andExpect(jsonPath("$.amount").value(125.00))
                .andExpect(jsonPath("$.currency").value("EUR"));
    }

    @Test
    void admin_findById_notFound_returns404() throws Exception {
        String token = adminToken();
        UUID unknownId = UUID.randomUUID();
        when(mollieService.findById(unknownId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/mollie/payments/" + unknownId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // === CRUD: POST /api/mollie/payments ===

    @Test
    void admin_create_returns201() throws Exception {
        String token = adminToken();
        MolliePaymentDto created = samplePaymentDto();
        when(mollieService.create(any(MolliePaymentDto.class))).thenReturn(created);

        String json = objectMapper.writeValueAsString(new MolliePaymentDto(
                null, STATUS_OPEN, null,
                new BigDecimal("125.00"), "EUR", "Boeking BK-2026-001",
                null, null, null, null, null, null
        ));

        mockMvc.perform(post("/api/mollie/payments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.molliePaymentId").value(PAYMENT_ID.toString()))
                .andExpect(jsonPath("$.status").value(STATUS_OPEN));
    }

    // === CRUD: PUT /api/mollie/payments/{id} ===

    @Test
    void admin_update_returns200() throws Exception {
        String token = adminToken();
        MolliePaymentDto updated = new MolliePaymentDto(
                PAYMENT_ID, MOLLIE_EXTERNAL_ID, STATUS_PAID,
                MolliePaymentMethod.IDEAL, new BigDecimal("125.00"), "EUR",
                "Boeking BK-2026-001", "https://www.mollie.com/checkout/test",
                null, null, null, null, ORG_PUURKROATIE_ID
        );
        when(mollieService.update(eq(PAYMENT_ID), any(MolliePaymentDto.class))).thenReturn(updated);

        String json = objectMapper.writeValueAsString(updated);

        mockMvc.perform(put("/api/mollie/payments/" + PAYMENT_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(STATUS_PAID));
    }

    // === CRUD: DELETE /api/mollie/payments/{id} ===

    @Test
    void admin_delete_returns204() throws Exception {
        String token = adminToken();
        doNothing().when(mollieService).delete(PAYMENT_ID);

        mockMvc.perform(delete("/api/mollie/payments/" + PAYMENT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        verify(mollieService).delete(PAYMENT_ID);
    }

    // === POST /api/mollie/payments/create-at-mollie ===

    @Test
    void admin_createPaymentAtMollie_returns201() throws Exception {
        String token = adminToken();

        PaymentResponseDto mollieResponse = new PaymentResponseDto(
                "tr_newpayment",
                "open",
                new PaymentResponseDto.Amount("EUR", "250.00"),
                "Boeking BK-2026-002",
                new PaymentResponseDto.Links(new PaymentResponseDto.Checkout("https://www.mollie.com/checkout/select-method/tr_newpayment"))
        );
        when(mollieService.createPaymentAtMollie(any(PaymentRequestDto.class))).thenReturn(mollieResponse);

        String json = objectMapper.writeValueAsString(new PaymentRequestDto(
                new PaymentRequestDto.Amount("EUR", "250.00"),
                "Boeking BK-2026-002",
                "http://localhost:5003/payment",
                "http://localhost:8082/payment/mollie/",
                Map.of("bookingId", UUID.randomUUID().toString())
        ));

        mockMvc.perform(post("/api/mollie/payments/create-at-mollie")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("tr_newpayment"))
                .andExpect(jsonPath("$.status").value("open"))
                .andExpect(jsonPath("$.amount.currency").value("EUR"))
                .andExpect(jsonPath("$.amount.value").value("250.00"))
                .andExpect(jsonPath("$.description").value("Boeking BK-2026-002"))
                .andExpect(jsonPath("$._links.checkout.href").value("https://www.mollie.com/checkout/select-method/tr_newpayment"));
    }

    @Test
    void employee_createPaymentAtMollie_returns201() throws Exception {
        String token = employeeToken();

        PaymentResponseDto mollieResponse = new PaymentResponseDto(
                "tr_emp123",
                "open",
                new PaymentResponseDto.Amount("EUR", "100.00"),
                "Test betaling",
                new PaymentResponseDto.Links(new PaymentResponseDto.Checkout("https://www.mollie.com/checkout/tr_emp123"))
        );
        when(mollieService.createPaymentAtMollie(any(PaymentRequestDto.class))).thenReturn(mollieResponse);

        String json = objectMapper.writeValueAsString(new PaymentRequestDto(
                new PaymentRequestDto.Amount("EUR", "100.00"),
                "Test betaling",
                "http://localhost:5003/payment",
                "http://localhost:8082/payment/mollie/",
                null
        ));

        mockMvc.perform(post("/api/mollie/payments/create-at-mollie")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("tr_emp123"));
    }

    @Test
    void unauthenticated_createPaymentAtMollie_returns401() throws Exception {
        String json = "{\"amount\":{\"currency\":\"EUR\",\"value\":\"100.00\"},\"description\":\"test\"}";

        mockMvc.perform(post("/api/mollie/payments/create-at-mollie")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }

    // === POST /api/mollie/payments/webhook ===

    @Test
    void webhook_returns200() throws Exception {
        PaymentStatusResponseDto statusResponse = new PaymentStatusResponseDto(
                "tr_webhook123", "paid",
                new PaymentStatusResponseDto.Amount("EUR", "125.00"),
                "2026-03-25T10:00:00+01:00",
                Map.of("bookingId", UUID.randomUUID().toString())
        );
        when(mollieService.updatePaymentFromMollie(any(PaymentStatusRequestDto.class))).thenReturn(statusResponse);

        mockMvc.perform(post("/api/mollie/payments/webhook")
                        .param("id", "tr_webhook123"))
                .andExpect(status().isOk());

        verify(mollieService).updatePaymentFromMollie(any(PaymentStatusRequestDto.class));
    }

    @Test
    void webhook_withoutId_returns400() throws Exception {
        mockMvc.perform(post("/api/mollie/payments/webhook"))
                .andExpect(status().isBadRequest());
    }

    // === Autorisatie: ongeauthenticeerd DELETE ===

    @Test
    void unauthenticated_delete_returns401() throws Exception {
        mockMvc.perform(delete("/api/mollie/payments/" + PAYMENT_ID))
                .andExpect(status().isUnauthorized());
    }

    // === Autorisatie: ongeauthenticeerd POST ===

    @Test
    void unauthenticated_create_returns401() throws Exception {
        String json = "{\"status\":\"open\",\"amount\":100,\"currency\":\"EUR\"}";

        mockMvc.perform(post("/api/mollie/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized());
    }
}
