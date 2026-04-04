package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.Document;
import nl.puurkroatie.rds.booking.mapper.DocumentMapper;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import nl.puurkroatie.rds.booking.service.DocumentService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final BookingRepository bookingRepository;
    private final DocumentMapper documentMapper;

    public DocumentServiceImpl(DocumentRepository documentRepository, BookingRepository bookingRepository, DocumentMapper documentMapper) {
        this.documentRepository = documentRepository;
        this.bookingRepository = bookingRepository;
        this.documentMapper = documentMapper;
    }

    @Override
    public DocumentDto create(DocumentDto dto) {
        Document entity = toEntity(dto);
        Document saved = documentRepository.save(entity);
        return documentMapper.toDto(saved);
    }

    @Override
    public DocumentDto update(UUID id, DocumentDto dto) {
        Document existing = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        Document entity = toEntity(id, dto);
        Document saved = documentRepository.save(entity);
        return documentMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        Document existing = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + id));
        verifyOrganization(existing.getTenantOrganization());
        documentRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentDto> findAll() {
        if (isAdmin()) {
            return documentRepository.findAll().stream()
                    .map(documentMapper::toDto)
                    .toList();
        }
        return documentRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(documentMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentDto> findByBookingId(UUID bookingId) {
        return documentRepository.findByBookingBookingId(bookingId).stream()
                .filter(doc -> isAdmin() || doc.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(documentMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DocumentDto> findById(UUID id) {
        return documentRepository.findById(id)
                .filter(entity -> isAdmin() || entity.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(documentMapper::toDto);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private Document toEntity(DocumentDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Document(
                booking,
                dto.getDisplayname(),
                dto.getMimeType(),
                dto.getDocument()
        );
    }

    private Document toEntity(UUID id, DocumentDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        return new Document(
                id,
                booking,
                dto.getDisplayname(),
                dto.getMimeType(),
                dto.getDocument()
        );
    }
}
