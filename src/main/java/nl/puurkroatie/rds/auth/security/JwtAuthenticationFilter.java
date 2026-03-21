package nl.puurkroatie.rds.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String token = extractToken(request);

            if (token != null && jwtTokenProvider.validateToken(token)) {
                String tokenType = jwtTokenProvider.getTokenType(token);

                if ("BOOKER".equals(tokenType)) {
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("BOOKER_PORTAL_READ"));

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    jwtTokenProvider.getAccountId(token),
                                    null,
                                    authorities);

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    BookerContext.setBookerId(jwtTokenProvider.getAccountId(token));
                    BookerContext.setBookingId(jwtTokenProvider.getBookingId(token));
                } else {
                    List<SimpleGrantedAuthority> authorities = jwtTokenProvider.getAuthorities(token).stream()
                            .map(SimpleGrantedAuthority::new)
                            .toList();

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    jwtTokenProvider.getAccountId(token),
                                    null,
                                    authorities);

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    TenantContext.setOrganizationId(jwtTokenProvider.getOrganizationId(token));
                    TenantContext.setAccountId(jwtTokenProvider.getAccountId(token));
                    TenantContext.setRoles(new HashSet<>(jwtTokenProvider.getRoles(token)));
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            BookerContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
