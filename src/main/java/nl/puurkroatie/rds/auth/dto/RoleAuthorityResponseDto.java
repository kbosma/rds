package nl.puurkroatie.rds.auth.dto;

/**
 * Response voor een koppeling rol-authority. De geneste vorm (role, authority) is wat de frontend gebruikt.
 */
public class RoleAuthorityResponseDto {

    private final RoleDto role;
    private final AuthorityDto authority;

    public RoleAuthorityResponseDto(RoleDto role, AuthorityDto authority) {
        this.role = role;
        this.authority = authority;
    }

    public RoleDto getRole() {
        return role;
    }

    public AuthorityDto getAuthority() {
        return authority;
    }
}
