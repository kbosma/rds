package nl.puurkroatie.rds.settings.controller;

import jakarta.validation.Valid;
import nl.puurkroatie.rds.settings.dto.OrganizationSettingsDto;
import nl.puurkroatie.rds.settings.service.OrganizationSettingsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** De instellingen van de eigen organisatie (één resource per organisatie, net als {@code /my-theme}). */
@RestController
@RequestMapping("/api/organization-settings")
public class OrganizationSettingsController {

    private final OrganizationSettingsService settingsService;

    public OrganizationSettingsController(OrganizationSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAuthority('ORGANIZATION_SETTINGS_READ')")
    public OrganizationSettingsDto findMine() {
        return settingsService.findMine();
    }

    @PutMapping("/mine")
    @PreAuthorize("hasAuthority('ORGANIZATION_SETTINGS_UPDATE')")
    public OrganizationSettingsDto updateMine(@RequestBody @Valid OrganizationSettingsDto dto) {
        return settingsService.updateMine(dto);
    }
}
