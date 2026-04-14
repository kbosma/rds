package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.ChangePasswordDto;
import nl.puurkroatie.rds.auth.dto.LoginRequestDto;
import nl.puurkroatie.rds.auth.dto.LoginResponseDto;
import nl.puurkroatie.rds.auth.dto.RecoveryLoginRequestDto;
import nl.puurkroatie.rds.auth.dto.TotpLoginRequestDto;
import nl.puurkroatie.rds.auth.dto.TotpSetupResponseDto;
import nl.puurkroatie.rds.auth.dto.TotpVerifyRequestDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.Person;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.security.JwtTokenProvider;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AccountService;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AccountRepository accountRepository;
    private final AccountRoleRepository accountRoleRepository;
    private final RoleAuthorityRepository roleAuthorityRepository;
    private final AccountService accountService;
    private final TotpService totpService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider jwtTokenProvider,
                          AccountRepository accountRepository,
                          AccountRoleRepository accountRoleRepository,
                          RoleAuthorityRepository roleAuthorityRepository,
                          AccountService accountService,
                          TotpService totpService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleAuthorityRepository = roleAuthorityRepository;
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

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody @Valid ChangePasswordDto request) {
        if (!isEmployee()) {
            throw new AccessDeniedException("Access denied: only employees can use this endpoint");
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
        List<AccountRole> accountRoles = accountRoleRepository.findByAccount(account);

        List<String> authorities = accountRoles.stream()
                .flatMap(ar -> roleAuthorityRepository.findByRole(ar.getRole()).stream())
                .map(RoleAuthority::getAuthority)
                .map(authority -> authority.getDescription())
                .distinct()
                .toList();

        List<String> roles = accountRoles.stream()
                .map(ar -> ar.getRole().getDescription())
                .distinct()
                .toList();

        String personName = buildPersonName(account.getPerson());
        String organizationName = account.getPerson().getOrganization().getName();

        String token = jwtTokenProvider.generateToken(
                account.getAccountId(),
                account.getPerson().getOrganization().getOrganizationId(),
                account.getPerson().getPersoonId(),
                account.getUserName(),
                personName,
                organizationName,
                authorities,
                roles);

        return new LoginResponseDto(token, account.getAccountId(),
                account.getPerson().getOrganization().getOrganizationId(),
                account.getMustChangePassword());
    }

    private boolean isEmployee() {
        return TenantContext.hasRole("EMPLOYEE") && !TenantContext.hasRole("MANAGER") && !TenantContext.hasRole("ADMIN");
    }

    private String buildPersonName(Person person) {
        StringBuilder sb = new StringBuilder();
        if (person.getFirstname() != null) {
            sb.append(person.getFirstname());
        }
        if (person.getPrefix() != null && !person.getPrefix().isEmpty()) {
            sb.append(" ").append(person.getPrefix());
        }
        if (person.getLastname() != null) {
            sb.append(" ").append(person.getLastname());
        }
        return sb.toString().trim();
    }
}
