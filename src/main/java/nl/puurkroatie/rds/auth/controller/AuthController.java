package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.ChangePasswordDto;
import nl.puurkroatie.rds.auth.dto.LoginRequestDto;
import nl.puurkroatie.rds.auth.dto.LoginResponseDto;
import nl.puurkroatie.rds.auth.dto.RecoveryLoginRequestDto;
import nl.puurkroatie.rds.auth.dto.TotpLoginRequestDto;
import nl.puurkroatie.rds.auth.dto.TotpSetupResponseDto;
import nl.puurkroatie.rds.auth.dto.TotpVerifyRequestDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.security.JwtTokenProvider;
import nl.puurkroatie.rds.auth.security.Authorities;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AccountService;
import nl.puurkroatie.rds.auth.service.EmployeeTokenService;
import nl.puurkroatie.rds.auth.service.TotpService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.context.ApplicationEventPublisher;
import nl.puurkroatie.rds.auth.event.EmployeeLoggedInEvent;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AccountRepository accountRepository;
    private final AccountService accountService;
    private final TotpService totpService;
    private final EmployeeTokenService employeeTokenService;

    private final ApplicationEventPublisher eventPublisher;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider jwtTokenProvider,
                          AccountRepository accountRepository,
                          EmployeeTokenService employeeTokenService,
                          AccountService accountService,
                          TotpService totpService,
                          ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
        this.employeeTokenService = employeeTokenService;
        this.accountService = accountService;
        this.totpService = totpService;
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<LoginResponseDto> login(@RequestBody @Valid LoginRequestDto request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserName(), request.getPassword()));

        Account account = accountRepository.findByUserName(authentication.getName())
                .orElseThrow();

        if (Boolean.TRUE.equals(account.getTotpEnabled())) {
            String tempToken = jwtTokenProvider.generateTotpPendingToken(account.getAccountId());
            boolean needsSetup = !Boolean.TRUE.equals(account.getTotpVerified());
            return ResponseEntity.ok(new LoginResponseDto(true, needsSetup, tempToken));
        }

        return ResponseEntity.ok(buildFullLoginResponse(account));
    }

    @PostMapping("/login/totp")
    @Transactional(readOnly = true)
    public ResponseEntity<LoginResponseDto> loginWithTotp(@RequestBody @Valid TotpLoginRequestDto request) {
        UUID accountId = validateTempToken(request.getTempToken());

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!totpService.verifyCode(account.getTotpSecret(), request.getTotpCode())) {
            throw new AccessDeniedException("Invalid TOTP code");
        }

        return ResponseEntity.ok(buildFullLoginResponse(account));
    }

    @PostMapping("/login/recovery")
    @Transactional
    public ResponseEntity<LoginResponseDto> loginWithRecovery(@RequestBody @Valid RecoveryLoginRequestDto request) {
        UUID accountId = validateTempToken(request.getTempToken());

        if (!totpService.verifyRecoveryCode(accountId, request.getRecoveryCode())) {
            throw new AccessDeniedException("Invalid recovery code");
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        return ResponseEntity.ok(buildFullLoginResponse(account));
    }

    @PostMapping("/totp/setup")
    @Transactional
    public ResponseEntity<TotpSetupResponseDto> setupTotp() {
        UUID accountId = TenantContext.getAccountId();
        if (accountId == null) {
            throw new AccessDeniedException("Authentication required");
        }
        TotpSetupResponseDto response = totpService.generateSecret(accountId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/totp/verify")
    @Transactional
    public ResponseEntity<Void> verifyTotp(@RequestBody @Valid TotpVerifyRequestDto request) {
        UUID accountId = TenantContext.getAccountId();
        if (accountId == null) {
            throw new AccessDeniedException("Authentication required");
        }
        totpService.verifyAndEnable(accountId, request.getTotpCode());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/totp/disable")
    @Transactional
    public ResponseEntity<Void> disableTotp(@RequestBody @Valid TotpVerifyRequestDto request) {
        UUID accountId = TenantContext.getAccountId();
        if (accountId == null) {
            throw new AccessDeniedException("Authentication required");
        }
        totpService.disable(accountId, request.getTotpCode());
        return ResponseEntity.ok().build();
    }

    /**
     * Een nieuw token met de huidige rechten, voor een ingelogde medewerker. De frontend roept dit aan als de backend
     * een token weigert omdat de rechten zijn gewijzigd (401 AUTHZ_CHANGED); zonder opnieuw in te loggen of 2FA.
     */
    @PostMapping("/token/refresh")
    public ResponseEntity<LoginResponseDto> refreshToken() {
        UUID accountId = TenantContext.getAccountId();
        if (accountId == null) {
            throw new AccessDeniedException("Alleen voor medewerkers");
        }
        String token = employeeTokenService.refresh(accountId);
        return ResponseEntity.ok(new LoginResponseDto(token, accountId, TenantContext.getOrganizationId(), false));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody @Valid ChangePasswordDto request) {
        if (isAdmin()) {
            throw new AccessDeniedException("Access denied: admins cannot use this endpoint");
        }
        accountService.changePassword(TenantContext.getAccountId(), request);
        return ResponseEntity.ok().build();
    }

    private UUID validateTempToken(String tempToken) {
        if (!jwtTokenProvider.validateToken(tempToken)) {
            throw new AccessDeniedException("Invalid or expired temp token");
        }
        String tokenType = jwtTokenProvider.getTokenType(tempToken);
        if (!"TOTP_PENDING".equals(tokenType)) {
            throw new AccessDeniedException("Invalid token type");
        }
        return jwtTokenProvider.getAccountId(tempToken);
    }

    private LoginResponseDto buildFullLoginResponse(Account account) {
        eventPublisher.publishEvent(new EmployeeLoggedInEvent(account.getAccountId(),
                account.getTenantOrganization()));
        return new LoginResponseDto(employeeTokenService.issue(account), account.getAccountId(),
                account.getTenantOrganization(),
                account.getMustChangePassword());
    }

    private boolean isAdmin() {
        return TenantContext.hasAuthority(Authorities.PLATFORM_ADMIN);
    }
}
