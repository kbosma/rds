package nl.puurkroatie.rds.bookerportal.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OtpEmailService {

    private static final Logger log = LoggerFactory.getLogger(OtpEmailService.class);

    public void sendOtp(String emailaddress, String code) {
        log.info("OTP code voor {}: {}", emailaddress, code);
    }
}
