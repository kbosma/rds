package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.email.dto.SentEmailDto;

import java.util.List;
import java.util.UUID;

public interface SentEmailService {

    /** De verzonden e-mails van een boeking, nieuwste eerst. */
    List<SentEmailDto> findByBooking(UUID bookingId);

    SentEmailDto findById(UUID sentEmailId);

    /** Verstuurt dezelfde inhoud opnieuw naar hetzelfde adres en bewaart dat als nieuwe regel. */
    SentEmailDto resend(UUID sentEmailId);
}
