package nl.puurkroatie.rds.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.bookerportal.security.BookerContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Een token met een verouderde rechtenversie mag alleen nog een nieuw token ophalen. */
    static final String REFRESH_PATH = "/api/auth/token/refresh";
    static final String AUTHZ_CHANGED = "AUTHZ_CHANGED";

    private final JwtTokenProvider jwtTokenProvider;
    private final AccountRepository accountRepository;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider, AccountRepository accountRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.accountRepository = accountRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String token = extractToken(request);

            if (token != null && jwtTokenProvider.validateToken(token)) {
                String tokenType = jwtTokenProvider.getTokenType(token);

                if ("TOTP_PENDING".equals(tokenType)) {
                    String path = request.getRequestURI();
                    if (path.equals("/api/auth/login/totp") || path.equals("/api/auth/login/recovery") || path.equals("/api/auth/totp/setup")) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        jwtTokenProvider.getAccountId(token),
                                        null,
                                        List.of(new SimpleGrantedAuthority("TOTP_PENDING")));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                    filterChain.doFilter(request, response);
                    return;
                }

                if ("BOOKER".equals(tokenType)) {
                    List<SimpleGrantedAuthority> authorities = List.of(
                            new SimpleGrantedAuthority("BOOKER_PORTAL_READ"),
                            new SimpleGrantedAuthority("BOOKER_PORTAL_UPDATE"));

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    jwtTokenProvider.getAccountId(token),
                                    null,
                                    authorities);

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    BookerContext.setBookerId(jwtTokenProvider.getAccountId(token));
                    BookerContext.setBookingId(jwtTokenProvider.getBookingId(token));
                } else {
                    // De rechten van het account zijn sinds dit token gewijzigd: eerst een nieuw token ophalen.
                    if (!REFRESH_PATH.equals(pathWithinApplication(request)) && !hasCurrentAuthzVersion(token)) {
                        rejectAsChanged(response);
                        return;
                    }
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
                    TenantContext.setAuthorities(new HashSet<>(jwtTokenProvider.getAuthorities(token)));
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            BookerContext.clear();
        }
    }

    /** Het pad zonder context-path (bijv. /rds), zodat de vergelijking op elke server klopt. */
    private static String pathWithinApplication(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }

    private boolean hasCurrentAuthzVersion(String token) {
        Integer tokenVersion = jwtTokenProvider.getAuthzVersion(token);
        return tokenVersion != null && accountRepository.findAuthzVersion(jwtTokenProvider.getAccountId(token))
                .map(tokenVersion::equals)
                .orElse(false);
    }

    private static void rejectAsChanged(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"message\":\"Je rechten zijn gewijzigd\",\"status\":401,\"timestamp\":\""
                + LocalDateTime.now() + "\",\"code\":\"" + AUTHZ_CHANGED + "\"}");
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
