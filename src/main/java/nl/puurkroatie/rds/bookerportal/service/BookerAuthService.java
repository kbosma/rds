package nl.puurkroatie.rds.bookerportal.service;

import nl.puurkroatie.rds.auth.security.JwtTokenProvider;
import nl.puurkroatie.rds.bookerportal.dto.BookerLoginResponseDto;
import nl.puurkroatie.rds.bookerportal.entity.Otp;
import nl.puurkroatie.rds.bookerportal.repository.OtpRepository;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class BookerAuthService {

    private final BookingRepository bookingRepository;
    private final OtpRepository otpRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpEmailService otpEmailService;
    private final int otpExpiryMinutes;
    private final int maxActivePerEmail;
    private final SecureRandom secureRandom = new SecureRandom();

    public BookerAuthService(BookingRepository bookingRepository,
                             OtpRepository otpRepository,
                             JwtTokenProvider jwtTokenProvider,
                             OtpEmailService otpEmailService,
                             @Value("${app.otp.expiry-minutes:10}") int otpExpiryMinutes,
                             @Value("${app.otp.max-active-per-email:3}") int maxActivePerEmail) {
        this.bookingRepository = bookingRepository;
        this.otpRepository = otpRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.otpEmailService = otpEmailService;
        this.otpExpiryMinutes = otpExpiryMinutes;
        this.maxActivePerEmail = maxActivePerEmail;
    }

    @Transactional
    public void requestOtp(String emailaddress, String bookingNumber) {
        Optional<Booking> bookingOpt = bookingRepository.findByBookingNumberAndBookerEmailaddress(bookingNumber, emailaddress);

        if (bookingOpt.isEmpty()) {
            return;
        }

        // Check max active OTPs per email
        var activeOtps = otpRepository.findByEmailaddressAndVerifiedFalse(emailaddress);
        if (activeOtps.size() >= maxActivePerEmail) {
            return;
        }

        String code = generateOtpCode();
        LocalDateTime now = LocalDateTime.now();

        Otp otp = new Otp(emailaddress, bookingNumber, code, now, now.plusMinutes(otpExpiryMinutes), false);
        otpRepository.save(otp);

        otpEmailService.sendOtp(emailaddress, code);
    }

    @Transactional
    public Optional<BookerLoginResponseDto> verifyOtp(String emailaddress, String bookingNumber, String code) {
        Optional<Otp> otpOpt = otpRepository.findByEmailaddressAndBookingNumberAndCodeAndVerifiedFalse(emailaddress, bookingNumber, code);

        if (otpOpt.isEmpty()) {
            return Optional.empty();
        }

        Otp otp = otpOpt.get();

        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            return Optional.empty();
        }

        otpRepository.markAsVerified(otp.getOtpId());

        Optional<Booking> bookingOpt = bookingRepository.findByBookingNumberAndBookerEmailaddress(bookingNumber, emailaddress);
        if (bookingOpt.isEmpty()) {
            return Optional.empty();
        }

        Booking booking = bookingOpt.get();
        String token = jwtTokenProvider.generateBookerToken(booking.getBooker().getBookerId(), booking.getBookingId());

        return Optional.of(new BookerLoginResponseDto(token, booking.getBooker().getBookerId(), booking.getBookingId()));
    }

    private String generateOtpCode() {
        int code = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(code);
    }
}
