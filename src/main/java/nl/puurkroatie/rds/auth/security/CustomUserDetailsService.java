package nl.puurkroatie.rds.auth.security;

import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.AccountRole;
import nl.puurkroatie.rds.auth.entity.RoleAuthority;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.auth.repository.AccountRoleRepository;
import nl.puurkroatie.rds.auth.repository.RoleAuthorityRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;
    private final AccountRoleRepository accountRoleRepository;
    private final RoleAuthorityRepository roleAuthorityRepository;

    public CustomUserDetailsService(AccountRepository accountRepository,
                                    AccountRoleRepository accountRoleRepository,
                                    RoleAuthorityRepository roleAuthorityRepository) {
        this.accountRepository = accountRepository;
        this.accountRoleRepository = accountRoleRepository;
        this.roleAuthorityRepository = roleAuthorityRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Account account = accountRepository.findByUserName(username)
                .orElseThrow(() -> new UsernameNotFoundException("Account not found: " + username));

        List<AccountRole> accountRoles = accountRoleRepository.findByAccount(account);

        List<SimpleGrantedAuthority> authorities = accountRoles.stream()
                .flatMap(ar -> roleAuthorityRepository.findByRole(ar.getRole()).stream())
                .map(RoleAuthority::getAuthority)
                .map(authority -> new SimpleGrantedAuthority(authority.getDescription()))
                .distinct()
                .toList();

        return User.builder()
                .username(account.getUserName())
                .password(account.getPasswordHash())
                .authorities(authorities)
                .accountLocked(account.getLocked())
                .build();
    }
}
