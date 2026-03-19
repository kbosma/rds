package nl.puurkroatie.rds.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "role_id")
    private UUID roleId;

    @Column(name = "description", nullable = false)
    private String description;

    protected Role() {
    }

    public Role(UUID roleId, String description) {
        this.roleId = roleId;
        this.description = description;
    }

    public Role(String description) {
        this.description = description;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public String getDescription() {
        return description;
    }
}
