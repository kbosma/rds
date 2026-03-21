package nl.puurkroatie.rds.auth.controller;

import nl.puurkroatie.rds.auth.dto.PersonDto;
import nl.puurkroatie.rds.auth.service.PersonService;
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
@RequestMapping("/api/persons")
public class PersonController {

    private final PersonService personService;

    public PersonController(PersonService personService) {
        this.personService = personService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERSON_READ')")
    public List<PersonDto> findAll() {
        return personService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERSON_READ')")
    public ResponseEntity<PersonDto> findById(@PathVariable UUID id) {
        return personService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERSON_WRITE')")
    public ResponseEntity<PersonDto> create(@RequestBody PersonDto dto) {
        PersonDto created = personService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERSON_WRITE')")
    public ResponseEntity<PersonDto> update(@PathVariable UUID id, @RequestBody PersonDto dto) {
        PersonDto updated = personService.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERSON_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        personService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
