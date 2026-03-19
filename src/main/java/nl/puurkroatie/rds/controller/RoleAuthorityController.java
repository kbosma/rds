package nl.puurkroatie.rds.controller;

import nl.puurkroatie.rds.entity.RoleAuthority;
import nl.puurkroatie.rds.service.RoleAuthorityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/role-authorities")
public class RoleAuthorityController {

    private final RoleAuthorityService roleAuthorityService;

    public RoleAuthorityController(RoleAuthorityService roleAuthorityService) {
        this.roleAuthorityService = roleAuthorityService;
    }

    @GetMapping
    public List<RoleAuthority> findAll() {
        return roleAuthorityService.findAll();
    }

    @GetMapping("/{roleId}/{authorityId}")
    public ResponseEntity<RoleAuthority> findById(@PathVariable UUID roleId, @PathVariable UUID authorityId) {
        return roleAuthorityService.findById(roleId, authorityId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RoleAuthority> create(@RequestBody RoleAuthority roleAuthority) {
        RoleAuthority saved = roleAuthorityService.save(roleAuthority);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{roleId}/{authorityId}")
    public ResponseEntity<Void> delete(@PathVariable UUID roleId, @PathVariable UUID authorityId) {
        roleAuthorityService.deleteById(roleId, authorityId);
        return ResponseEntity.noContent().build();
    }
}
