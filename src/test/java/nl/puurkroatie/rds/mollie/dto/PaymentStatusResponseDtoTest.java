package nl.puurkroatie.rds.mollie.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Mollie meldt een terugboeking met amountChargedBack; de status zelf blijft dan "paid". */
class PaymentStatusResponseDtoTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void aChargedBackAmount_isAChargeback() throws Exception {
        PaymentStatusResponseDto dto = mapper.readValue("""
                {"id":"tr_1","status":"paid","amount":{"currency":"EUR","value":"100.00"},
                 "amountChargedBack":{"currency":"EUR","value":"100.00"}}""", PaymentStatusResponseDto.class);

        assertTrue(dto.isChargedBack());
    }

    @Test
    void withoutOrWithAZeroChargedBackAmount_isNoChargeback() throws Exception {
        assertFalse(mapper.readValue("{\"id\":\"tr_1\",\"status\":\"paid\"}", PaymentStatusResponseDto.class).isChargedBack());
        assertFalse(mapper.readValue("{\"id\":\"tr_1\",\"status\":\"paid\",\"amountChargedBack\":{\"currency\":\"EUR\",\"value\":\"0.00\"}}",
                PaymentStatusResponseDto.class).isChargedBack());
    }
}
