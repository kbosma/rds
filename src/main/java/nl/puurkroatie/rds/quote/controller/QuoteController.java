package nl.puurkroatie.rds.quote.controller;

import nl.puurkroatie.rds.quote.dto.QuoteSendResultDto;
import nl.puurkroatie.rds.quote.service.QuoteService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    /** Verstuurt de offerte (PDF als bijlage) naar de hoofdboeker en zet de boeking op OFFERTE. */
    @PostMapping("/{id}/send-quote")
    @PreAuthorize("hasAuthority('QUOTE_SEND')")
    public QuoteSendResultDto sendQuote(@PathVariable UUID id) {
        return quoteService.send(id);
    }
}
