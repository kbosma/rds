package nl.puurkroatie.rds.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;
    private final long bookerExpirationMs;

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret,
                            @Value("${app.jwt.expiration-ms}") long expirationMs,
                            @Value("${app.jwt.booker-expiration-ms:3600000}") long bookerExpirationMs) {
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        this.expirationMs = expirationMs;
        this.bookerExpirationMs = bookerExpirationMs;
    }

    public String generateToken(UUID accountId, UUID organizationId, UUID personId,
                                String userName, String personName, String organizationName,
                                Collection<String> authorities, Collection<String> roles) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(accountId.toString())
                .claim("type", "EMPLOYEE")
                .claim("org", organizationId.toString())
                .claim("personId", personId.toString())
                .claim("userName", userName)
                .claim("personName", personName)
                .claim("organizationName", organizationName)
                .claim("authorities", authorities)
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String generateBookerToken(UUID bookerId, UUID bookingId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + bookerExpirationMs);

        return Jwts.builder()
                .subject(bookerId.toString())
                .claim("type", "BOOKER")
                .claim("bookingId", bookingId.toString())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getTokenType(String token) {
        String type = getClaims(token).get("type", String.class);
        return type != null ? type : "EMPLOYEE";
    }

    public UUID getAccountId(String token) {
        return UUID.fromString(getClaims(token).getSubject());
    }

    public UUID getOrganizationId(String token) {
        return UUID.fromString(getClaims(token).get("org", String.class));
    }

    public UUID getPersonId(String token) {
        String personId = getClaims(token).get("personId", String.class);
        return personId != null ? UUID.fromString(personId) : null;
    }

    public UUID getBookingId(String token) {
        return UUID.fromString(getClaims(token).get("bookingId", String.class));
    }

    @SuppressWarnings("unchecked")
    public List<String> getAuthorities(String token) {
        return getClaims(token).get("authorities", List.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        return getClaims(token).get("roles", List.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
