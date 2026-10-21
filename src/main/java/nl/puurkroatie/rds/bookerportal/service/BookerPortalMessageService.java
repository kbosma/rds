package nl.puurkroatie.rds.bookerportal.service;

import jakarta.persistence.EntityNotFoundException;
import nl.puurkroatie.rds.bookerportal.dto.PortalMessageContentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalMessageDto;
import nl.puurkroatie.rds.bookerportal.mapper.PortalMapper;
import nl.puurkroatie.rds.email.repository.SentEmailRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** De e-mails die de organisatie via RDS aan de hoofdboeker van de eigen boeking heeft verstuurd. */
@Service
@Transactional(readOnly = true)
public class BookerPortalMessageService {

    private final SentEmailRepository sentEmailRepository;
    private final PortalMapper portalMapper;

    public BookerPortalMessageService(SentEmailRepository sentEmailRepository, PortalMapper portalMapper) {
        this.sentEmailRepository = sentEmailRepository;
        this.portalMapper = portalMapper;
    }

    /** Nieuwste eerst, zonder de HTML. */
    public List<PortalMessageDto> findMessages(UUID bookingId) {
        return sentEmailRepository.findSummariesByBookingBookingIdOrderByCreatedAtDesc(bookingId).stream()
                .map(portalMapper::toMessageDto)
                .toList();
    }

    /** Een mail van een andere boeking is voor de klant hetzelfde als een mail die niet bestaat (404). */
    public PortalMessageContentDto findMessage(UUID bookingId, UUID messageId) {
        return sentEmailRepository.findById(messageId)
                .filter(email -> email.getBooking().getBookingId().equals(bookingId))
                .map(portalMapper::toMessageContentDto)
                .orElseThrow(() -> new EntityNotFoundException("Message not found"));
    }
}
