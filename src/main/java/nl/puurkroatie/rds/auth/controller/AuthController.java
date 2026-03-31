package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.ChangePasswordDto;
import nl.puurkroatie.rds.auth.dto.LoginRequestDto;
import nl.puurkroatie.rds.auth.dto.LoginResponseDto;
import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.auth.security.JwtTokenProvider;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.auth.service.AccountService;
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

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AccountRepository accountRepository;
    private final AccountRoleRepository accountRoleRepository;
    private final RoleAuthorityRepository roleAuthorityRepository;
    private final AccountService accountService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider jwtTokenProvider,
                          AccountRepository accountRepository,
                          AccountRoleRepository accountRoleRepository,
                          RoleAuthorityRepository roleAuthorityRepository,
                          AccountService accountService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleAuthorityRepository = roleAuthorityRepository;
        this.accountService = accountService;
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<LoginResponseDto> login(@RequestBody @Valid LoginRequestDto request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUserName(), request.getPassword()));

        Account account = accountRepository.findByUserName(authentication.getName())
                .orElseThrow();

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

        String token = jwtTokenProvider.generateToken(
                account.getAccountId(),
                account.getPerson().getOrganization().getOrganizationId(),
                account.getUserName(),
                authorities,
                roles);

        return ResponseEntity.ok(new LoginResponseDto(token, account.getAccountId(),
                account.getPerson().getOrganization().getOrganizationId(),
                account.getMustChangePassword()));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody @Valid ChangePasswordDto request) {
        if (!isEmployee()) {
            throw new AccessDeniedException("Access denied: only employees can use this endpoint");
        }
        accountService.changePassword(TenantContext.getAccountId(), request);
        return ResponseEntity.ok().build();
    }

    private boolean isEmployee() {
        return TenantContext.hasRole("EMPLOYEE") && !TenantContext.hasRole("MANAGER") && !TenantContext.hasRole("ADMIN");
    }
}
