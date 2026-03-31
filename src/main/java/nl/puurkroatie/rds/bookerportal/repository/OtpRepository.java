package nl.puurkroatie.rds.bookerportal.repository;

import nl.puurkroatie.rds.bookerportal.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<Otp, UUID> {

    Optional<Otp> findByEmailaddressAndBookingNumberAndCodeAndVerifiedFalse(String emailaddress, String bookingNumber, String code);

    List<Otp> findByEmailaddressAndVerifiedFalse(String emailaddress);

    @Modifying
    @Query("UPDATE Otp o SET o.verified = true WHERE o.otpId = :otpId")
    void markAsVerified(UUID otpId);

    void deleteByExpiresAtBefore(LocalDateTime now);
}
