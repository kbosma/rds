package nl.puurkroatie.rds.controller;

import nl.puurkroatie.rds.dto.AuthorityDto;
import nl.puurkroatie.rds.service.AuthorityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/authorities")
public class AuthorityController {

    private final AuthorityService authorityService;

    public AuthorityController(AuthorityService authorityService) {
        this.authorityService = authorityService;
    }

    @GetMapping
    public List<AuthorityDto> findAll() {
        return authorityService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AuthorityDto> findById(@PathVariable UUID id) {
        return authorityService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<AuthorityDto> create(@RequestBody AuthorityDto dto) {
        AuthorityDto created = authorityService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AuthorityDto> update(@PathVariable UUID id, @RequestBody AuthorityDto dto) {
        AuthorityDto updated = authorityService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        authorityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
