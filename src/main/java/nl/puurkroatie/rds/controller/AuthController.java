package nl.puurkroatie.rds.controller;

import nl.puurkroatie.rds.dto.LoginRequest;
import nl.puurkroatie.rds.dto.LoginResponse;
import nl.puurkroatie.rds.entity.Account;
import nl.puurkroatie.rds.entity.AccountRole;
import nl.puurkroatie.rds.entity.RoleAuthority;
import nl.puurkroatie.rds.repository.AccountRepository;
import nl.puurkroatie.rds.repository.AccountRoleRepository;
import nl.puurkroatie.rds.repository.RoleAuthorityRepository;
import nl.puurkroatie.rds.security.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
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

    public AuthController(AuthenticationManager authenticationManager,
                          JwtTokenProvider jwtTokenProvider,
                          AccountRepository accountRepository,
                          AccountRoleRepository accountRoleRepository,
                          RoleAuthorityRepository roleAuthorityRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleAuthorityRepository = roleAuthorityRepository;
    }

    @PostMapping("/login")
    @Transactional(readOnly = true)
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
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

        String token = jwtTokenProvider.generateToken(
                account.getAccountId(),
                account.getOrganization().getOrganizationId(),
                account.getUserName(),
                authorities);

        return ResponseEntity.ok(new LoginResponse(token, account.getAccountId(),
                account.getOrganization().getOrganizationId()));
    }
}
