package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingActivityDto;
import nl.puurkroatie.rds.booking.entity.Activity;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingActivity;
import nl.puurkroatie.rds.booking.mapper.BookingActivityMapper;
import nl.puurkroatie.rds.booking.repository.ActivityRepository;
import nl.puurkroatie.rds.booking.repository.BookingActivityRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookingActivityService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookingActivityServiceImpl implements BookingActivityService {

    private final BookingActivityRepository bookingActivityRepository;
    private final BookingRepository bookingRepository;
    private final ActivityRepository activityRepository;
    private final BookingActivityMapper bookingActivityMapper;

    public BookingActivityServiceImpl(BookingActivityRepository bookingActivityRepository,
                                      BookingRepository bookingRepository,
                                      ActivityRepository activityRepository,
                                      BookingActivityMapper bookingActivityMapper) {
        this.bookingActivityRepository = bookingActivityRepository;
        this.bookingRepository = bookingRepository;
        this.activityRepository = activityRepository;
        this.bookingActivityMapper = bookingActivityMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingActivityDto> findAll() {
        if (isAdmin()) {
            return bookingActivityRepository.findAll().stream()
                    .map(bookingActivityMapper::toDto)
                    .toList();
        }
        return bookingActivityRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookingActivityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingActivityDto> findByBookingId(UUID bookingId) {
        return bookingActivityRepository.findByBookingBookingId(bookingId).stream()
                .filter(ba -> isAdmin() || ba.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingActivityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookingActivityDto> findById(UUID bookingActivityId) {
        return bookingActivityRepository.findById(bookingActivityId)
                .filter(ba -> isAdmin() || ba.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingActivityMapper::toDto);
    }

    @Override
    public BookingActivityDto create(BookingActivityDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        Activity activity = activityRepository.findById(dto.getActivityId())
                .orElseThrow(() -> new RuntimeException("Activity not found with id: " + dto.getActivityId()));

        verifyOrganization(booking.getTenantOrganization());
        verifyOrganization(activity.getTenantOrganization());

        BookingActivity entity = new BookingActivity(
                booking, activity,
                dto.getFromDate(), dto.getUntilDate(), dto.getMeetingPoint(), dto.getTotalPrice()
        );
        BookingActivity saved = bookingActivityRepository.save(entity);
        return bookingActivityMapper.toDto(saved);
    }

    @Override
    public BookingActivityDto update(UUID bookingActivityId, BookingActivityDto dto) {
        BookingActivity existing = bookingActivityRepository.findById(bookingActivityId)
                .orElseThrow(() -> new RuntimeException("BookingActivity not found"));

        verifyOrganization(existing.getTenantOrganization());

        Booking booking = existing.getBooking();
        Activity activity = existing.getActivity();

        BookingActivity updated = new BookingActivity(
                bookingActivityId, booking, activity,
                dto.getFromDate(), dto.getUntilDate(), dto.getMeetingPoint(), dto.getTotalPrice()
        );
        BookingActivity saved = bookingActivityRepository.save(updated);
        return bookingActivityMapper.toDto(saved);
    }

    @Override
    public void delete(UUID bookingActivityId) {
        BookingActivity existing = bookingActivityRepository.findById(bookingActivityId)
                .orElseThrow(() -> new RuntimeException("BookingActivity not found"));

        verifyOrganization(existing.getTenantOrganization());

        bookingActivityRepository.deleteById(bookingActivityId);
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
