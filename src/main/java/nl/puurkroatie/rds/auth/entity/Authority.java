package nl.puurkroatie.rds.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "authority")
public class Authority {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "authority_id")
    private UUID authorityId;

    @Column(name = "description", nullable = false)
    private String description;

    protected Authority() {
    }

    public Authority(UUID authorityId, String description) {
        this.authorityId = authorityId;
        this.description = description;
    }

    public Authority(String description) {
        this.description = description;
    }

    public UUID getAuthorityId() {
        return authorityId;
    }

    public String getDescription() {
        return description;
    }
}
