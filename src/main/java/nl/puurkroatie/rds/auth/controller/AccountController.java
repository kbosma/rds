package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.AccountDto;
import nl.puurkroatie.rds.auth.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNT_READ')")
    public List<AccountDto> findAll() {
        return accountService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_READ')")
    public ResponseEntity<AccountDto> findById(@PathVariable UUID id) {
        return accountService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCOUNT_WRITE')")
    public ResponseEntity<AccountDto> create(@RequestBody AccountDto dto) {
        AccountDto created = accountService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_WRITE')")
    public ResponseEntity<AccountDto> update(@PathVariable UUID id, @RequestBody AccountDto dto) {
        AccountDto updated = accountService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        accountService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
