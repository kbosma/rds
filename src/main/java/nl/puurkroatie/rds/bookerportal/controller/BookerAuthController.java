package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.bookerportal.dto.BookerLoginResponseDto;
import nl.puurkroatie.rds.bookerportal.dto.OtpRequestDto;
import nl.puurkroatie.rds.bookerportal.dto.OtpVerifyDto;
import nl.puurkroatie.rds.bookerportal.service.BookerAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/booker-auth")
public class BookerAuthController {

    private final BookerAuthService bookerAuthService;

    public BookerAuthController(BookerAuthService bookerAuthService) {
        this.bookerAuthService = bookerAuthService;
    }

    @PostMapping("/request-otp")
    public ResponseEntity<Void> requestOtp(@RequestBody @Valid OtpRequestDto request) {
        bookerAuthService.requestOtp(request.getEmailaddress(), request.getBookingNumber());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<BookerLoginResponseDto> verifyOtp(@RequestBody @Valid OtpVerifyDto request) {
        Optional<BookerLoginResponseDto> result = bookerAuthService.verifyOtp(
                request.getEmailaddress(), request.getBookingNumber(), request.getCode());

        return result.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}
